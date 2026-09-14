import { Router, Response } from 'express';
import vm from 'vm';
import { AuthenticatedRequest } from './gateway';
import { dbEngine } from './db';

export const functionsRouter = Router({ mergeParams: true });

export class FunctionsRuntime {
  public static async execute(code: string, env: Record<string, string>, reqData: any): Promise<{ statusCode: number; body: any; logs: string[] }> {
    const logs: string[] = [];

    const sandbox: any = {
      req: reqData,
      res: {
        statusCode: 200,
        body: null,
        status(code: number) { this.statusCode = code; return this; },
        json(data: any) { this.body = data; return this; },
        send(data: any) { this.body = data; return this; },
      },
      console: {
        log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
        error: (...args: any[]) => logs.push('[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
      },
      env,
      process: { env },
    };

    const context = vm.createContext(sandbox);

    const wrappedCode = `
      (async () => {
        ${code}
      })();
    `;

    const script = new vm.Script(wrappedCode);
    await script.runInContext(context, { timeout: 5000 });

    return {
      statusCode: sandbox.res.statusCode,
      body: sandbox.res.body,
      logs,
    };
  }
}

// Function CRUD & Invocation API
functionsRouter.get('/functions', (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.project.internal_id;
    const funcs = dbEngine.db.public.many(
      `SELECT public_id as id, slug, name, status, runtime, timeout_ms, env_vars, created_at FROM functions.functions WHERE project_id = ${projectId} AND deleted_at IS NULL`
    );
    res.json({ functions: funcs });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'FUNCTIONS_FETCH_FAILED', message: err.message } });
  }
});

functionsRouter.post('/functions', (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.project.internal_id;
    const { name, slug, code, env_vars } = req.body;
    const publicId = crypto.randomUUID();
    const envJson = typeof env_vars === 'string' ? env_vars : JSON.stringify(env_vars || {});

    dbEngine.db.public.none(`
      INSERT INTO functions.functions (public_id, project_id, slug, name, env_vars)
      VALUES ('${publicId}', ${projectId}, '${slug || name.toLowerCase().replace(/\s+/g, '-')}', '${name}', '${envJson}')
    `);

    const fn = dbEngine.db.public.one(
      `SELECT id FROM functions.functions WHERE project_id = ${projectId} AND slug = '${slug || name.toLowerCase().replace(/\s+/g, '-')}'`
    ) as any;

    if (code) {
      dbEngine.db.public.none(`
        INSERT INTO functions.deployments (public_id, function_id, version, code_source)
        VALUES ('${crypto.randomUUID()}', ${fn.id}, 1, '${code.replace(/'/g, "''")}')
      `);
    }

    res.status(201).json({ success: true, id: publicId, slug: slug || name.toLowerCase().replace(/\s+/g, '-') });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'CREATE_FUNCTION_FAILED', message: err.message } });
  }
});

functionsRouter.post('/functions/:slug/invoke', async (req: AuthenticatedRequest, res: Response) => {
  const startTime = Date.now();
  try {
    const projectId = req.project.internal_id;
    const { slug } = req.params;

    const funcs = dbEngine.db.public.many(
      `SELECT id, env_vars FROM functions.functions WHERE project_id = ${projectId} AND slug = '${slug}' AND deleted_at IS NULL`
    );

    if (funcs.length === 0) {
      return res.status(404).json({ error: { code: 'FUNCTION_NOT_FOUND', message: 'Function not found' } });
    }

    const fn = funcs[0] as any;
    const deployments = dbEngine.db.public.many(
      `SELECT code_source FROM functions.deployments WHERE function_id = ${fn.id} ORDER BY version DESC LIMIT 1`
    );

    if (deployments.length === 0) {
      return res.status(400).json({ error: { code: 'NO_DEPLOYMENT', message: 'Function has no code deployed' } });
    }

    const code = deployments[0].code_source;
    let env = {};
    try {
      env = typeof fn.env_vars === 'string' ? JSON.parse(fn.env_vars) : fn.env_vars || {};
    } catch {}

    const result = await FunctionsRuntime.execute(code, env, { body: req.body, query: req.query, headers: req.headers });
    const duration = Date.now() - startTime;

    dbEngine.db.public.none(`
      INSERT INTO functions.invocation_logs (public_id, function_id, status_code, execution_time_ms, log_output)
      VALUES ('${crypto.randomUUID()}', ${fn.id}, ${result.statusCode}, ${duration}, '${result.logs.join('\n').replace(/'/g, "''")}')
    `);

    res.status(result.statusCode).json({ result: result.body, logs: result.logs, duration_ms: duration });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'INVOCATION_FAILED', message: err.message } });
  }
});
