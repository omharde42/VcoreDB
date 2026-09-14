import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createGatewayApp } from '../../server/gateway';
import { realtimeServer } from '../../server/realtime';
import { createClient } from '../../packages/client/src';

describe('@vcoredb/client SDK', () => {
  let server: http.Server;
  let baseUrl: string;
  const apiKey = 'vcore_anon_default_key';

  beforeAll(async () => {
    const app = createGatewayApp();
    server = http.createServer(app);
    realtimeServer.init(server);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}/api/v1/projects/proj_default`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('should initialize SDK client and perform Auth signup/login', async () => {
    const vcore = createClient(baseUrl, apiKey);

    const signup = await vcore.auth.signUp({
      email: 'sdkuser@example.com',
      password: 'Password123!',
    });

    expect(signup.error).toBeNull();
    expect(signup.user?.email).toBe('sdkuser@example.com');
    expect(signup.session?.access_token).toBeDefined();

    const login = await vcore.auth.signIn({
      email: 'sdkuser@example.com',
      password: 'Password123!',
    });

    expect(login.error).toBeNull();
    expect(login.session?.access_token).toBeDefined();
  });

  it('should perform database operations using SDK query builder', async () => {
    const vcore = createClient(baseUrl, apiKey);

    // Create custom table first
    await fetch(`${baseUrl}/schema/tables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vcore-api-key': apiKey,
      },
      body: JSON.stringify({ name: 'tasks', columns: [{ name: 'title', type: 'TEXT' }] }),
    });

    // Insert task
    const insertRes = await vcore.from('tasks').insert({ title: 'Build BaaS SDK' });
    expect(insertRes.error).toBeNull();

    // Query tasks
    const queryRes = await vcore.from('tasks').select('*').eq('title', 'Build BaaS SDK').execute();
    expect(queryRes.error).toBeNull();
    expect(queryRes.data?.length).toBe(1);
    expect(queryRes.data?.[0].title).toBe('Build BaaS SDK');
  });

  it('should invoke serverless edge function using SDK', async () => {
    const vcore = createClient(baseUrl, apiKey);

    // Deploy function
    await fetch(`${baseUrl}/functions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vcore-api-key': apiKey,
      },
      body: JSON.stringify({
        name: 'sdk-func',
        slug: 'sdk-func',
        code: `res.status(200).json({ reply: 'SDK Call ' + req.body.input });`,
      }),
    });

    const res = await vcore.functions.invoke('sdk-func', { body: { input: 'Success' } });
    expect(res.error).toBeNull();
    expect(res.data?.reply).toBe('SDK Call Success');
  });
});
