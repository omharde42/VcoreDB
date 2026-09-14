import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createGatewayApp } from '../server/gateway';

describe('Quota & Usage Metering API', () => {
  const app = createGatewayApp();
  const apiKey = 'vcore_anon_default_key';

  it('should return 25 GB Free Tier quotas and current usage metrics', async () => {
    const res = await request(app)
      .get('/api/v1/projects/proj_default/quota')
      .set('x-vcore-api-key', apiKey);
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('VCoreDB Free Tier');
    expect(res.body.quotas.database_storage.limit_bytes).toBe(26843545600); // 25 GB
    expect(res.body.quotas.file_storage.limit_bytes).toBe(26843545600);     // 25 GB
    expect(res.body.quotas.bandwidth.limit_bytes).toBe(26843545600);        // 25 GB
  });
});
