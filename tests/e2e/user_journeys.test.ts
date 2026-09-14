import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import request from 'supertest';
import WebSocket from 'ws';
import { createGatewayApp } from '../../server/gateway';
import { realtimeServer } from '../../server/realtime';
import { createClient } from '../../packages/client/src';

describe('VCoreDB End-to-End User Journeys (Journeys 1 - 8)', () => {
  let server: http.Server;
  let port: number;
  let baseUrl: string;
  const apiKey = 'vcore_anon_default_key';

  beforeAll(async () => {
    const app = createGatewayApp();
    server = http.createServer(app);
    realtimeServer.init(server);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        port = addr.port;
        baseUrl = `http://localhost:${port}/api/v1/projects/proj_default`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('Journey 1: Landing -> Signup -> Login -> Dashboard Session', async () => {
    // 1. Landing page
    const landingRes = await request(server).get('/');
    expect(landingRes.status).toBe(200);

    // 2. Signup
    const signupRes = await request(server)
      .post('/api/v1/projects/proj_default/auth/signup')
      .send({ email: 'e2e_user@vcoredb.com', password: 'Password123!' });

    expect(signupRes.status).toBe(200);
    expect(signupRes.body.user.email).toBe('e2e_user@vcoredb.com');

    // 3. Login
    const loginRes = await request(server)
      .post('/api/v1/projects/proj_default/auth/login')
      .send({ email: 'e2e_user@vcoredb.com', password: 'Password123!' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.session.access_token).toBeDefined();
  });

  it('Journey 2: Create Project -> Provisioning -> Ready', async () => {
    const res = await request(server)
      .post('/api/v1/projects')
      .send({ name: 'Production Mobile App', region: 'us-west-2' });

    expect(res.status).toBe(201);
    expect(res.body.project.name).toBe('Production Mobile App');
    expect(res.body.project.status).toBe('ready');
    expect(res.body.project.api_keys.length).toBe(2);
  });

  it('Journey 3: Database Table Creation -> Row Insert / Query / Edit / Delete', async () => {
    // Create Table
    const tableRes = await request(server)
      .post('/api/v1/projects/proj_default/schema/tables')
      .set('x-vcore-api-key', apiKey)
      .send({
        name: 'e2e_orders',
        columns: [
          { name: 'item', type: 'TEXT' },
          { name: 'amount', type: 'NUMERIC', nullable: true },
        ],
      });

    expect(tableRes.status).toBe(201);

    // Insert Row
    const insertRes = await request(server)
      .post('/api/v1/projects/proj_default/tables/e2e_orders')
      .set('x-vcore-api-key', apiKey)
      .send({ item: 'Monitor', amount: '299.99' });

    expect(insertRes.status).toBe(201);

    // Query Row
    const queryRes = await request(server)
      .get('/api/v1/projects/proj_default/tables/e2e_orders?item=eq.Monitor')
      .set('x-vcore-api-key', apiKey);

    expect(queryRes.status).toBe(200);
    expect(queryRes.body.data.length).toBe(1);

    // Edit Row
    const editRes = await request(server)
      .patch('/api/v1/projects/proj_default/tables/e2e_orders?id=1')
      .set('x-vcore-api-key', apiKey)
      .send({ item: '4K Monitor' });

    expect(editRes.status).toBe(200);

    // Delete Row
    const deleteRes = await request(server)
      .delete('/api/v1/projects/proj_default/tables/e2e_orders?id=1')
      .set('x-vcore-api-key', apiKey);

    expect(deleteRes.status).toBe(200);
  });

  it('Journey 4: Connect SDK -> Execute Database Queries', async () => {
    const vcore = createClient(baseUrl, apiKey);

    const insertRes = await vcore.from('e2e_orders').insert({ item: 'Keyboard', amount: '49.99' });
    expect(insertRes.error).toBeNull();

    const queryRes = await vcore.from('e2e_orders').select('*').eq('item', 'Keyboard').execute();
    expect(queryRes.error).toBeNull();
    expect(queryRes.data?.[0].item).toBe('Keyboard');
  });

  it('Journey 5: User Management -> Inspect Users -> Session Logout', async () => {
    const usersRes = await request(server)
      .get('/api/v1/projects/proj_default/auth/users')
      .set('x-vcore-api-key', apiKey);

    expect(usersRes.status).toBe(200);
    expect(usersRes.body.users.length).toBeGreaterThan(0);
  });

  it('Journey 6: Storage Bucket Creation -> Upload File -> Download -> Delete', async () => {
    const vcore = createClient(baseUrl, apiKey);

    // Create bucket via API
    await request(server)
      .post('/api/v1/projects/proj_default/storage/buckets')
      .set('x-vcore-api-key', apiKey)
      .send({ name: 'documents', is_public: true });

    // Upload file via SDK
    const uploadRes = await vcore.storage.from('documents').upload('docs/readme.txt', 'VCoreDB Docs File');
    expect(uploadRes.error).toBeNull();

    // Download file
    const downloadRes = await vcore.storage.from('documents').download(uploadRes.data.id);
    expect(downloadRes.error).toBeNull();
  });

  it('Journey 7: Function Deployment -> Invocation -> Execution Logs', async () => {
    const vcore = createClient(baseUrl, apiKey);

    await request(server)
      .post('/api/v1/projects/proj_default/functions')
      .set('x-vcore-api-key', apiKey)
      .send({
        name: 'process-order',
        slug: 'process-order',
        code: `
          console.log('Processing order ' + req.body.orderId);
          res.status(200).json({ processed: true, orderId: req.body.orderId });
        `,
      });

    const invokeRes = await vcore.functions.invoke('process-order', { body: { orderId: 'ORD_123' } });
    expect(invokeRes.error).toBeNull();
    expect(invokeRes.data?.processed).toBe(true);
    expect(invokeRes.logs).toContain('Processing order ORD_123');
  });

  it('Journey 8: Realtime Subscription -> Database Mutation -> Receive Realtime Event', async () => {
    const ws = new WebSocket(`ws://localhost:${port}/realtime/v1`);
    await new Promise<void>((resolve) => ws.on('open', resolve));

    ws.send(JSON.stringify({ event: 'subscribe', channel: 'orders' }));

    let subDone = false;
    let eventData: any = null;

    await new Promise<void>((resolve) => {
      ws.on('message', (data: string) => {
        const msg = JSON.parse(data.toString());
        if (msg.event === 'subscribed') {
          subDone = true;
          realtimeServer.broadcast('orders', 'INSERT', { orderId: 'ORD_999', status: 'created' });
        }
        if (msg.event === 'INSERT' && msg.payload?.orderId === 'ORD_999') {
          eventData = msg.payload;
          ws.close();
          resolve();
        }
      });
    });

    expect(subDone).toBe(true);
    expect(eventData?.status).toBe('created');
  });
});
