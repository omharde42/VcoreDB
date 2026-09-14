import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createGatewayApp } from '../server/gateway';

describe('Database Platform & Introspection APIs', () => {
  const app = createGatewayApp();
  const apiKey = 'vcore_anon_default_key';

  it('should fetch database schemas, views, functions, triggers, indexes, and relationships', async () => {
    const schemasRes = await request(app)
      .get('/api/v1/projects/proj_default/schema/schemas')
      .set('x-vcore-api-key', apiKey);
    expect(schemasRes.status).toBe(200);
    expect(schemasRes.body.schemas).toContain('public');

    const viewsRes = await request(app)
      .get('/api/v1/projects/proj_default/schema/views')
      .set('x-vcore-api-key', apiKey);
    expect(viewsRes.status).toBe(200);

    const funcsRes = await request(app)
      .get('/api/v1/projects/proj_default/schema/functions')
      .set('x-vcore-api-key', apiKey);
    expect(funcsRes.status).toBe(200);

    const trigRes = await request(app)
      .get('/api/v1/projects/proj_default/schema/triggers')
      .set('x-vcore-api-key', apiKey);
    expect(trigRes.status).toBe(200);

    const idxRes = await request(app)
      .get('/api/v1/projects/proj_default/schema/indexes')
      .set('x-vcore-api-key', apiKey);
    expect(idxRes.status).toBe(200);

    const relRes = await request(app)
      .get('/api/v1/projects/proj_default/schema/relationships')
      .set('x-vcore-api-key', apiKey);
    expect(relRes.status).toBe(200);
  });

  it('should execute raw SQL and EXPLAIN queries with history and saved queries', async () => {
    const queryRes = await request(app)
      .post('/api/v1/projects/proj_default/query')
      .set('x-vcore-api-key', apiKey)
      .send({ query: 'SELECT * FROM core.projects' });

    expect(queryRes.status).toBe(200);
    expect(queryRes.body.data).toBeDefined();

    const explainRes = await request(app)
      .post('/api/v1/projects/proj_default/query')
      .set('x-vcore-api-key', apiKey)
      .send({ query: 'EXPLAIN SELECT * FROM core.projects' });

    expect(explainRes.status).toBe(200);

    const historyRes = await request(app)
      .get('/api/v1/projects/proj_default/sql/history')
      .set('x-vcore-api-key', apiKey);

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.history.length).toBeGreaterThan(0);

    const saveRes = await request(app)
      .post('/api/v1/projects/proj_default/sql/saved')
      .set('x-vcore-api-key', apiKey)
      .send({ name: 'Project Query', sql: 'SELECT * FROM core.projects' });

    expect(saveRes.status).toBe(201);
  });
});
