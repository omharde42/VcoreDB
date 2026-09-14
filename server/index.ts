import http from 'http';
import { createGatewayApp } from './gateway';
import { realtimeServer } from './realtime';

const PORT = process.env.PORT || 8080;
const app = createGatewayApp();
const server = http.createServer(app);

realtimeServer.init(server);

server.listen(PORT, () => {
  console.log(`🚀 VCoreDB BaaS Platform running on http://localhost:${PORT}`);
});
