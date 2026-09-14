import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createGatewayApp } from '../server/gateway';

describe('Platform Admin & RBAC Authorization APIs', () => {
  const app = createGatewayApp();

  it('should deny unauthorized non-admin access with 403 Forbidden', async () => {
    const res = await request(app).get('/api/v1/admin/overview');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should allow platform admin access with valid admin key', async () => {
    const res = await request(app)
      .get('/api/v1/admin/overview')
      .set('x-vcore-admin-key', 'vcore_admin_secret_key');

    expect(res.status).toBe(200);
    expect(res.body.metrics).toBeDefined();
    expect(res.body.metrics.total_users).toBeGreaterThanOrEqual(0);
  });

  it('should fetch admin users, payments, system health, and audit logs', async () => {
    const usersRes = await request(app)
      .get('/api/v1/admin/users')
      .set('x-vcore-admin-key', 'vcore_admin_secret_key');

    expect(usersRes.status).toBe(200);
    expect(usersRes.body.users).toBeDefined();

    const systemRes = await request(app)
      .get('/api/v1/admin/system')
      .set('x-vcore-admin-key', 'vcore_admin_secret_key');

    expect(systemRes.status).toBe(200);
    expect(systemRes.body.system.database.status).toBe('healthy');
  });
});
