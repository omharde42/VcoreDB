import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createGatewayApp } from '../server/gateway';

describe('Storage & Serverless Edge Functions', () => {
  const app = createGatewayApp();
  const apiKey = 'vcore_anon_default_key';

  it('should create storage bucket, upload file, and retrieve file', async () => {
    // Create bucket
    const bucketRes = await request(app)
      .post('/api/v1/projects/proj_default/storage/buckets')
      .set('x-vcore-api-key', apiKey)
      .send({ name: 'avatars', is_public: true });

    expect(bucketRes.status).toBe(201);

    // Upload file
    const uploadRes = await request(app)
      .post('/api/v1/projects/proj_default/storage/buckets/avatars/objects')
      .set('x-vcore-api-key', apiKey)
      .attach('file', Buffer.from('hello world content'), 'sample.txt');

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.name).toBe('sample.txt');

    // Retrieve file
    const downloadRes = await request(app)
      .get(`/api/v1/projects/proj_default/storage/buckets/avatars/objects/${uploadRes.body.id}`)
      .set('x-vcore-api-key', apiKey);

    expect(downloadRes.status).toBe(200);
    expect(downloadRes.text).toBe('hello world content');
  });

  it('should deploy function and invoke function inside sandbox', async () => {
    const fnRes = await request(app)
      .post('/api/v1/projects/proj_default/functions')
      .set('x-vcore-api-key', apiKey)
      .send({
        name: 'hello-func',
        slug: 'hello-func',
        env_vars: { GREETING: 'Welcome' },
        code: `
          console.log('Function running...');
          res.status(200).json({ message: env.GREETING + ' ' + (req.body.name || 'Developer') });
        `,
      });

    expect(fnRes.status).toBe(201);

    // Invoke function
    const invokeRes = await request(app)
      .post('/api/v1/projects/proj_default/functions/hello-func/invoke')
      .set('x-vcore-api-key', apiKey)
      .send({ name: 'VCore User' });

    expect(invokeRes.status).toBe(200);
    expect(invokeRes.body.result.message).toBe('Welcome VCore User');
    expect(invokeRes.body.logs).toContain('Function running...');
  });
});
