import { Response, Router } from 'express';
import { AuthenticatedRequest } from './gateway';
import { dbEngine } from './db';
import { escapeSqlString } from './utils';

export const restRouter = Router({ mergeParams: true });

const queryHistoryStore: Map<number, any[]> = new Map();
const savedQueriesStore: Map<number, any[]> = new Map();

function sanitizeIdentifier(id: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(id)) {
    throw new Error(`Invalid identifier name: ${id}`);
  }
  return id;
}

restRouter.get('/schema/schemas', (req: AuthenticatedRequest, res: Response) => {
  res.json({ schemas: ['public', 'auth', 'iam', 'core', 'storage', 'functions', 'webhooks', 'audit', 'analytics', 'app'] });
});

restRouter.get('/schema/tables', (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawTables = dbEngine.db.public.many(
      `SELECT table_name, table_schema FROM information_schema.tables WHERE table_schema IN ('public', 'app')`
    );

    const tables = rawTables.map((t: any) => {
      const columns = dbEngine.db.public.many(
        `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '${t.table_name}'`
      );
      let count = 0;
      try {
        const rows = dbEngine.db.public.many(`SELECT COUNT(*) as count FROM public.${t.table_name}`);
        count = parseInt(rows[0]?.count || '0', 10);
      } catch {}

      return {
        table_name: t.table_name,
        schema: t.table_schema,
        row_count: count,
        column_count: columns.length,
        columns: columns.map((c: any) => ({ name: c.column_name, type: c.data_type, nullable: c.is_nullable === 'YES' })),
      };
    });

    res.json({ tables: tables.map(t => t.table_name), tableDetails: tables });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SCHEMA_ERROR', message: err.message } });
  }
});

restRouter.get('/schema/views', (req: AuthenticatedRequest, res: Response) => {
  try {
    const views = dbEngine.db.public.many(
      `SELECT table_name as view_name FROM information_schema.tables WHERE table_type = 'VIEW'`
    );
    res.json({ views });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'VIEWS_ERROR', message: err.message } });
  }
});

restRouter.get('/schema/functions', (req: AuthenticatedRequest, res: Response) => {
  res.json({
    functions: [
      { name: 'core.set_updated_at', returns: 'TRIGGER', language: 'plpgsql' },
      { name: 'gen_random_uuid', returns: 'UUID', language: 'c' },
      { name: 'char_length', returns: 'INTEGER', language: 'c' },
    ],
  });
});

restRouter.get('/schema/triggers', (req: AuthenticatedRequest, res: Response) => {
  res.json({
    triggers: [
      { trigger_name: 'trg_organizations_updated_at', table_name: 'core.organizations', event: 'UPDATE', timing: 'BEFORE' },
      { trigger_name: 'trg_projects_updated_at', table_name: 'core.projects', event: 'UPDATE', timing: 'BEFORE' },
      { trigger_name: 'trg_users_updated_at', table_name: 'auth.users', event: 'UPDATE', timing: 'BEFORE' },
      { trigger_name: 'trg_buckets_updated_at', table_name: 'storage.buckets', event: 'UPDATE', timing: 'BEFORE' },
    ],
  });
});

restRouter.get('/schema/indexes', (req: AuthenticatedRequest, res: Response) => {
  res.json({
    indexes: [
      { index_name: 'organizations_slug_active_uk', table: 'core.organizations', unique: true },
      { index_name: 'projects_ref_active_uk', table: 'core.projects', unique: true },
      { index_name: 'users_project_email_active_uk', table: 'auth.users', unique: true },
      { index_name: 'api_keys_hash_idx', table: 'core.api_keys', unique: false },
    ],
  });
});

restRouter.get('/schema/policies', (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.project.internal_id;
    const policies = dbEngine.db.public.many(
      `SELECT public_id as id, table_name, name, action, roles, definition, enabled FROM iam.rls_policies WHERE project_id = ${projectId}`
    );
    res.json({ policies });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'POLICIES_ERROR', message: err.message } });
  }
});

restRouter.get('/schema/relationships', (req: AuthenticatedRequest, res: Response) => {
  res.json({
    relationships: [
      { table: 'core.projects', column: 'organization_id', foreign_table: 'core.organizations', foreign_column: 'id' },
      { table: 'core.api_keys', column: 'project_id', foreign_table: 'core.projects', foreign_column: 'id' },
      { table: 'auth.users', column: 'project_id', foreign_table: 'core.projects', foreign_column: 'id' },
      { table: 'auth.sessions', column: 'user_id', foreign_table: 'auth.users', foreign_column: 'id' },
      { table: 'storage.objects', column: 'bucket_id', foreign_table: 'storage.buckets', foreign_column: 'id' },
    ],
  });
});

restRouter.get('/sql/history', (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.project.internal_id;
  res.json({ history: queryHistoryStore.get(projectId) || [] });
});

restRouter.get('/sql/saved', (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.project.internal_id;
  res.json({ saved: savedQueriesStore.get(projectId) || [] });
});

restRouter.post('/sql/saved', (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.project.internal_id;
  const { name, sql } = req.body;

  if (!savedQueriesStore.has(projectId)) {
    savedQueriesStore.set(projectId, []);
  }

  const savedItem = { id: crypto.randomUUID(), name, sql, created_at: new Date().toISOString() };
  savedQueriesStore.get(projectId)!.push(savedItem);

  res.status(201).json({ success: true, saved: savedItem });
});

// Execute raw SQL query from Database SQL Editor
restRouter.post('/query', (req: AuthenticatedRequest, res: Response) => {
  const startTime = Date.now();
  const projectId = req.project.internal_id;

  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: { code: 'INVALID_QUERY', message: 'Query string required' } });
    }

    let rows: any[] = [];
    const isExplain = query.trim().toUpperCase().startsWith('EXPLAIN');

    if (isExplain) {
      const targetQuery = query.replace(/^EXPLAIN\s+(ANALYZE\s+)?/i, '');
      rows = dbEngine.db.public.many(targetQuery);
      rows = [{ "QUERY PLAN": `Sequential Scan executed in ${Date.now() - startTime}ms. Returned ${rows.length} rows.` }];
    } else {
      rows = dbEngine.db.public.many(query);
    }

    const durationMs = Date.now() - startTime;

    if (!queryHistoryStore.has(projectId)) {
      queryHistoryStore.set(projectId, []);
    }
    queryHistoryStore.get(projectId)!.unshift({
      id: crypto.randomUUID(),
      query,
      duration_ms: durationMs,
      rows_count: Array.isArray(rows) ? rows.length : 0,
      timestamp: new Date().toISOString(),
      success: true,
    });

    res.json({ data: rows, execution_time_ms: durationMs, rows_affected: Array.isArray(rows) ? rows.length : 0 });
  } catch (err: any) {
    const durationMs = Date.now() - startTime;

    if (!queryHistoryStore.has(projectId)) {
      queryHistoryStore.set(projectId, []);
    }
    queryHistoryStore.get(projectId)!.unshift({
      id: crypto.randomUUID(),
      query: req.body.query,
      duration_ms: durationMs,
      error: err.message,
      timestamp: new Date().toISOString(),
      success: false,
    });

    res.status(400).json({ error: { code: 'SQL_EXECUTION_ERROR', message: err.message, duration_ms: durationMs } });
  }
});

restRouter.post('/schema/tables', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, columns } = req.body;
    const tableName = sanitizeIdentifier(name);

    let columnDefs = ['id BIGSERIAL PRIMARY KEY', 'created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()'];
    if (Array.isArray(columns)) {
      for (const col of columns) {
        const colName = sanitizeIdentifier(col.name);
        const colType = sanitizeIdentifier(col.type || 'TEXT');
        const nullable = col.nullable ? 'NULL' : 'NOT NULL';
        const defaultVal = col.default ? `DEFAULT '${escapeSqlString(col.default)}'` : '';
        columnDefs.push(`${colName} ${colType} ${nullable} ${defaultVal}`.trim());
      }
    }

    const createSql = `CREATE TABLE IF NOT EXISTS public.${tableName} (${columnDefs.join(', ')});`;
    dbEngine.db.public.none(createSql);

    res.status(201).json({ success: true, table: tableName });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'CREATE_TABLE_FAILED', message: err.message } });
  }
});

restRouter.get('/tables/:tableName', (req: AuthenticatedRequest, res: Response) => {
  try {
    const tableName = sanitizeIdentifier(req.params.tableName);
    const query = req.query;

    let sql = `SELECT * FROM public.${tableName}`;
    const whereClauses: string[] = [];

    Object.keys(query).forEach(key => {
      if (['select', 'order', 'limit', 'offset'].includes(key)) return;
      const valStr = String(query[key]);
      const [op, ...valParts] = valStr.split('.');
      const val = escapeSqlString(valParts.join('.'));
      const colName = sanitizeIdentifier(key);

      switch (op) {
        case 'eq':
          whereClauses.push(`${colName} = '${val}'`);
          break;
        case 'neq':
          whereClauses.push(`${colName} != '${val}'`);
          break;
        case 'gt':
          whereClauses.push(`${colName} > '${val}'`);
          break;
        case 'gte':
          whereClauses.push(`${colName} >= '${val}'`);
          break;
        case 'lt':
          whereClauses.push(`${colName} < '${val}'`);
          break;
        case 'lte':
          whereClauses.push(`${colName} <= '${val}'`);
          break;
        case 'like':
          whereClauses.push(`${colName} LIKE '%${val}%'`);
          break;
        default:
          whereClauses.push(`${colName} = '${escapeSqlString(valStr)}'`);
      }
    });

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    if (query.order) {
      const [orderCol, dir] = String(query.order).split('.');
      sql += ` ORDER BY ${sanitizeIdentifier(orderCol)} ${dir?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;
    }

    const limit = query.limit ? parseInt(String(query.limit), 10) : 100;
    const offset = query.offset ? parseInt(String(query.offset), 10) : 0;
    sql += ` LIMIT ${limit} OFFSET ${offset}`;

    const rows = dbEngine.db.public.many(sql);
    res.json({ data: rows });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'QUERY_FAILED', message: err.message } });
  }
});

restRouter.post('/tables/:tableName', (req: AuthenticatedRequest, res: Response) => {
  try {
    const tableName = sanitizeIdentifier(req.params.tableName);
    const body = req.body;

    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: { code: 'INVALID_BODY', message: 'Body must be an object' } });
    }

    const keys = Object.keys(body).map(sanitizeIdentifier);
    const values = Object.values(body).map(v => typeof v === 'string' ? `'${escapeSqlString(v)}'` : v);

    const insertSql = `INSERT INTO public.${tableName} (${keys.join(', ')}) VALUES (${values.join(', ')})`;
    dbEngine.db.public.none(insertSql);

    res.status(201).json({ success: true, data: body });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'INSERT_FAILED', message: err.message } });
  }
});

restRouter.patch('/tables/:tableName', (req: AuthenticatedRequest, res: Response) => {
  try {
    const tableName = sanitizeIdentifier(req.params.tableName);
    const body = req.body;
    const query = req.query;

    const setClauses = Object.keys(body).map(k => `${sanitizeIdentifier(k)} = '${escapeSqlString(String(body[k]))}'`);
    let sql = `UPDATE public.${tableName} SET ${setClauses.join(', ')}`;

    if (query.id) {
      sql += ` WHERE id = ${parseInt(String(query.id), 10)}`;
    }

    dbEngine.db.public.none(sql);
    res.json({ success: true, updated: body });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'UPDATE_FAILED', message: err.message } });
  }
});

restRouter.delete('/tables/:tableName', (req: AuthenticatedRequest, res: Response) => {
  try {
    const tableName = sanitizeIdentifier(req.params.tableName);
    const query = req.query;

    let sql = `DELETE FROM public.${tableName}`;
    if (query.id) {
      sql += ` WHERE id = ${parseInt(String(query.id), 10)}`;
    }

    dbEngine.db.public.none(sql);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'DELETE_FAILED', message: err.message } });
  }
});
