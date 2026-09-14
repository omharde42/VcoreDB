import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createGatewayApp } from '../server/gateway';
import { Logger } from '../server/observability';

describe('Observability, Webhooks & Backups', () => {
  const app = createGatewayApp();
  const apiKey = 'vcore_anon_default_key';

  it('should return health check endpoints', async () => {
    const healthRes = await request(app).get('/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBe('ok');

    const readyRes = await request(app).get('/ready');
    expect(readyRes.status).toBe(200);
    expect(readyRes.body.status).toBe('ready');
  });

  it('should create webhook endpoint and fetch webhook endpoints list', async () => {
    const res = await request(app)
      .post('/api/v1/projects/proj_default/webhooks/endpoints')
      .set('x-vcore-api-key', apiKey)
      .send({ url: 'https://example.com/webhook', events: ['database.insert'] });

    expect(res.status).toBe(201);
    expect(res.body.url).toBe('https://example.com/webhook');

    const listRes = await request(app)
      .get('/api/v1/projects/proj_default/webhooks/endpoints')
      .set('x-vcore-api-key', apiKey);

    expect(listRes.status).toBe(200);
    expect(listRes.body.endpoints.length).toBeGreaterThan(0);
  });

  it('should fetch project metrics and trigger database backups', async () => {
    Logger.log(1, 'api', 'info', 'Test log entry');

    const logsRes = await request(app)
      .get('/api/v1/projects/proj_default/logs')
      .set('x-vcore-api-key', apiKey);

    expect(logsRes.status).toBe(200);
    expect(logsRes.body.logs.length).toBeGreaterThan(0);

    const metricsRes = await request(app)
      .get('/api/v1/projects/proj_default/metrics')
      .set('x-vcore-api-key', apiKey);

    expect(metricsRes.status).toBe(200);
    expect(metricsRes.body.metrics.api_requests).toBeDefined();

    const backupRes = await request(app)
      .post('/api/v1/projects/proj_default/backups')
      .set('x-vcore-api-key', apiKey);

    expect(backupRes.status).toBe(201);
    expect(backupRes.body.filename).toBeDefined();
  });
});
