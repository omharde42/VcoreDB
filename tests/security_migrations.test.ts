import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createGatewayApp } from '../server/gateway';

describe('Security Center & Migration Engine APIs', () => {
  const app = createGatewayApp();
  const apiKey = 'vcore_anon_default_key';

  it('should fetch security audit findings and health score', async () => {
    const res = await request(app)
      .get('/api/v1/projects/proj_default/security/audit')
      .set('x-vcore-api-key', apiKey);

    expect(res.status).toBe(200);
    expect(res.body.security_score).toBeGreaterThan(0);
    expect(res.body.findings.length).toBeGreaterThan(0);
  });

  it('should execute security auto-remediation to enable RLS policy', async () => {
    const res = await request(app)
      .post('/api/v1/projects/proj_default/security/remediate')
      .set('x-vcore-api-key', apiKey)
      .send({ action: 'enable_rls', tableName: 'users' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should fetch database migration status and run custom migration SQL script', async () => {
    const statusRes = await request(app)
      .get('/api/v1/projects/proj_default/migrations/status')
      .set('x-vcore-api-key', apiKey);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.total_applied).toBeGreaterThan(0);

    const runRes = await request(app)
      .post('/api/v1/projects/proj_default/migrations/run')
      .set('x-vcore-api-key', apiKey)
      .send({
        name: '0006_test_migration.sql',
        sql: 'CREATE TABLE IF NOT EXISTS public.test_migrations_table (id BIGSERIAL PRIMARY KEY);',
      });

    expect(runRes.status).toBe(201);
    expect(runRes.body.success).toBe(true);
  });
});
