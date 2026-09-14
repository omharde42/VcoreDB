import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createGatewayApp } from '../server/gateway';

describe('GitHub Integration & Codebase Analysis APIs', () => {
  const app = createGatewayApp();
  const apiKey = 'vcore_anon_default_key';

  it('should list GitHub user connection status and available repos', async () => {
    const userRes = await request(app)
      .get('/api/v1/projects/proj_default/github/user')
      .set('x-vcore-api-key', apiKey);

    expect(userRes.status).toBe(200);
    expect(userRes.body.connected).toBe(true);

    const reposRes = await request(app)
      .get('/api/v1/projects/proj_default/github/repos')
      .set('x-vcore-api-key', apiKey);

    expect(reposRes.status).toBe(200);
    expect(reposRes.body.repos.length).toBeGreaterThan(0);
  });

  it('should import GitHub repository and run codebase analysis', async () => {
    const importRes = await request(app)
      .post('/api/v1/projects/proj_default/github/import')
      .set('x-vcore-api-key', apiKey)
      .send({
        owner: 'octocat',
        name: 'my-express-api',
        branch: 'main',
        projectName: 'Octocat API',
      });

    expect(importRes.status).toBe(201);
    expect(importRes.body.success).toBe(true);
    expect(importRes.body.analysis.language).toBe('TypeScript');
    expect(importRes.body.analysis.total_files).toBeGreaterThan(0);
  });
});
