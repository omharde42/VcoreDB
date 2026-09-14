import { Router, Response } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest } from './gateway';
import { dbEngine } from './db';

export const webhooksRouter = Router({ mergeParams: true });

export class WebhookService {
  public static async dispatchEvent(projectId: number, eventType: string, payload: any) {
    const endpoints = dbEngine.db.public.many(
      `SELECT id, url, secret FROM webhooks.endpoints WHERE project_id = ${projectId} AND enabled = true`
    );

    for (const ep of endpoints as any[]) {
      const signature = crypto.createHmac('sha256', ep.secret).update(JSON.stringify(payload)).digest('hex');
      const startTime = Date.now();
      let success = false;
      let responseStatus = 0;
      let responseBody = '';

      try {
        const res = await fetch(ep.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-vcore-signature': signature,
            'x-vcore-event': eventType,
          },
          body: JSON.stringify(payload),
        });
        responseStatus = res.status;
        responseBody = await res.text();
        success = res.ok;
      } catch (err: any) {
        responseBody = err.message;
      }

      const duration = Date.now() - startTime;

      dbEngine.db.public.none(`
        INSERT INTO webhooks.deliveries (public_id, endpoint_id, event_type, payload, response_status, response_body, duration_ms, success)
        VALUES ('${crypto.randomUUID()}', ${ep.id}, '${eventType}', '${JSON.stringify(payload).replace(/'/g, "''")}', ${responseStatus}, '${responseBody.replace(/'/g, "''")}', ${duration}, ${success})
      `);
    }
  }
}

webhooksRouter.get('/webhooks/endpoints', (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.project.internal_id;
    const endpoints = dbEngine.db.public.many(
      `SELECT public_id as id, url, events, enabled, created_at FROM webhooks.endpoints WHERE project_id = ${projectId}`
    );
    res.json({ endpoints });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'FETCH_FAILED', message: err.message } });
  }
});

webhooksRouter.post('/webhooks/endpoints', (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.project.internal_id;
    const { url, events } = req.body;
    const secret = crypto.randomBytes(24).toString('hex');
    const publicId = crypto.randomUUID();

    dbEngine.db.public.none(`
      INSERT INTO webhooks.endpoints (public_id, project_id, url, secret, events)
      VALUES ('${publicId}', ${projectId}, '${url}', '${secret}', ARRAY['${(events || ['*']).join("','")}'])
    `);

    res.status(201).json({ success: true, id: publicId, url, secret });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'CREATE_ENDPOINT_FAILED', message: err.message } });
  }
});

webhooksRouter.get('/webhooks/deliveries', (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.project.internal_id;
    const deliveries = dbEngine.db.public.many(
      `SELECT d.public_id as id, d.event_type, d.response_status, d.duration_ms, d.success, d.created_at
       FROM webhooks.deliveries d
       JOIN webhooks.endpoints e ON d.endpoint_id = e.id
       WHERE e.project_id = ${projectId}
       ORDER BY d.created_at DESC LIMIT 50`
    );
    res.json({ deliveries });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'FETCH_FAILED', message: err.message } });
  }
});
