import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createGatewayApp } from '../server/gateway';

describe('Auto-generated REST API Engine', () => {
  const app = createGatewayApp();
  const apiKey = 'vcore_anon_default_key';

  it('should create a custom table dynamically', async () => {
    const res = await request(app)
      .post('/api/v1/projects/proj_default/schema/tables')
      .set('x-vcore-api-key', apiKey)
      .send({
        name: 'products',
        columns: [
          { name: 'title', type: 'TEXT' },
          { name: 'price', type: 'NUMERIC' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should insert, query, update, and delete rows in custom table', async () => {
    // Insert
    const insertRes = await request(app)
      .post('/api/v1/projects/proj_default/tables/products')
      .set('x-vcore-api-key', apiKey)
      .send({ title: 'Laptop', price: '999.99' });

    expect(insertRes.status).toBe(201);

    // Query with filter
    const queryRes = await request(app)
      .get('/api/v1/projects/proj_default/tables/products?title=eq.Laptop')
      .set('x-vcore-api-key', apiKey);

    expect(queryRes.status).toBe(200);
    expect(queryRes.body.data.length).toBe(1);
    expect(queryRes.body.data[0].title).toBe('Laptop');

    // Update
    const updateRes = await request(app)
      .patch('/api/v1/projects/proj_default/tables/products?id=1')
      .set('x-vcore-api-key', apiKey)
      .send({ title: 'Pro Laptop' });

    expect(updateRes.status).toBe(200);

    // Delete
    const deleteRes = await request(app)
      .delete('/api/v1/projects/proj_default/tables/products?id=1')
      .set('x-vcore-api-key', apiKey);

    expect(deleteRes.status).toBe(200);
  });
});
