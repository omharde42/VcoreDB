import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createGatewayApp } from '../server/gateway';

describe('Dashboard UI & Web Console', () => {
  const app = createGatewayApp();

  it('should render the VCoreDB dashboard HTML', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('VCoreDB');
    expect(res.text).toContain('Your Intelligent Backend, Built Around Your Code');
    expect(res.text).toContain('GitHub Repository');
  });
});
