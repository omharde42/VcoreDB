import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

export interface RealtimeMessage {
  event: 'subscribe' | 'unsubscribe' | 'broadcast' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ping' | 'pong';
  channel: string;
  payload?: any;
}

export class RealtimeServer {
  private static instance: RealtimeServer;
  private wss!: WebSocketServer;
  private channels: Map<string, Set<WebSocket>> = new Map();

  public static getInstance(): RealtimeServer {
    if (!RealtimeServer.instance) {
      RealtimeServer.instance = new RealtimeServer();
    }
    return RealtimeServer.instance;
  }

  public init(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/realtime/v1' });

    this.wss.on('connection', (ws: WebSocket) => {
      let clientChannels = new Set<string>();

      ws.on('message', (message: string) => {
        try {
          const msg: RealtimeMessage = JSON.parse(message.toString());

          if (msg.event === 'ping') {
            ws.send(JSON.stringify({ event: 'pong' }));
            return;
          }

          if (msg.event === 'subscribe' && msg.channel) {
            if (!this.channels.has(msg.channel)) {
              this.channels.set(msg.channel, new Set());
            }
            this.channels.get(msg.channel)!.add(ws);
            clientChannels.add(msg.channel);
            ws.send(JSON.stringify({ event: 'subscribed', channel: msg.channel }));
            return;
          }

          if (msg.event === 'unsubscribe' && msg.channel) {
            if (this.channels.has(msg.channel)) {
              this.channels.get(msg.channel)!.delete(ws);
            }
            clientChannels.delete(msg.channel);
            ws.send(JSON.stringify({ event: 'unsubscribed', channel: msg.channel }));
            return;
          }

          if (msg.event === 'broadcast' && msg.channel) {
            this.broadcast(msg.channel, 'broadcast', msg.payload);
            return;
          }
        } catch (err: any) {
          ws.send(JSON.stringify({ event: 'error', message: err.message }));
        }
      });

      ws.on('close', () => {
        clientChannels.forEach(channel => {
          if (this.channels.has(channel)) {
            this.channels.get(channel)!.delete(ws);
          }
        });
      });
    });
  }

  public broadcast(channel: string, event: 'INSERT' | 'UPDATE' | 'DELETE' | 'broadcast', payload: any) {
    const subscribers = this.channels.get(channel);
    if (!subscribers) return;

    const data = JSON.stringify({ event, channel, payload, timestamp: new Date().toISOString() });
    subscribers.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
}

export const realtimeServer = RealtimeServer.getInstance();
