import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import WebSocket from 'ws';
import { createGatewayApp } from '../server/gateway';
import { realtimeServer } from '../server/realtime';

describe('Realtime WebSocket Engine', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    const app = createGatewayApp();
    server = http.createServer(app);
    realtimeServer.init(server);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        port = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('should subscribe to channel and receive broadcasted events', async () => {
    const client = new WebSocket(`ws://localhost:${port}/realtime/v1`);

    await new Promise<void>((resolve) => client.on('open', resolve));

    client.send(JSON.stringify({ event: 'subscribe', channel: 'public:messages' }));

    let subReceived = false;
    let eventReceived = false;

    await new Promise<void>((resolve) => {
      client.on('message', (data: string) => {
        const msg = JSON.parse(data.toString());
        if (msg.event === 'subscribed') {
          subReceived = true;
          // Trigger broadcast from server
          realtimeServer.broadcast('public:messages', 'INSERT', { id: 1, text: 'Hello Realtime' });
        }
        if (msg.event === 'INSERT' && msg.payload?.text === 'Hello Realtime') {
          eventReceived = true;
          client.close();
          resolve();
        }
      });
    });

    expect(subReceived).toBe(true);
    expect(eventReceived).toBe(true);
  });
});
