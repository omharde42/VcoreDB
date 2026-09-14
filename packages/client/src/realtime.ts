import WebSocket from 'ws';

export class RealtimeChannel {
  private ws: WebSocket | null = null;
  private channelName: string;
  private wsUrl: string;
  private callbacks: Map<string, (payload: any) => void> = new Map();

  constructor(wsUrl: string, channelName: string) {
    this.wsUrl = wsUrl;
    this.channelName = channelName;
  }

  public on(event: 'INSERT' | 'UPDATE' | 'DELETE' | 'broadcast', callback: (payload: any) => void): this {
    this.callbacks.set(event, callback);
    return this;
  }

  public subscribe(): this {
    this.ws = new WebSocket(this.wsUrl);

    this.ws.on('open', () => {
      this.ws?.send(JSON.stringify({ event: 'subscribe', channel: this.channelName }));
    });

    this.ws.on('message', (data: any) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.event && this.callbacks.has(msg.event)) {
          this.callbacks.get(msg.event)!(msg.payload);
        }
      } catch {}
    });

    return this;
  }

  public unsubscribe(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event: 'unsubscribe', channel: this.channelName }));
      this.ws.close();
    }
  }
}

export class RealtimeClient {
  private wsUrl: string;

  constructor(baseUrl: string) {
    this.wsUrl = baseUrl.replace(/^http/, 'ws') + '/realtime/v1';
  }

  public channel(name: string): RealtimeChannel {
    return new RealtimeChannel(this.wsUrl, name);
  }
}
