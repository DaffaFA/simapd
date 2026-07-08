import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@WebSocketGateway({ path: '/stream', cors: { origin: '*' } })
export class StreamGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private clients = new Map<WebSocket, string>(); // ws → clientId

  constructor(private jwtService: JwtService, private cfg: ConfigService) {}

  handleConnection(client: WebSocket, req: IncomingMessage) {
    const url = new URL(req.url!, `http://${req.headers.host || 'localhost'}`);
    const token = url.searchParams.get('token');
    
    try {
      if (!token) throw new Error('no token');
      this.jwtService.verify(token, { secret: this.cfg.get('jwt.secret') });
      this.clients.set(client, uuidv4());
      client.send(JSON.stringify({ event: 'system', message: 'Connected', level: 'info' }));
    } catch {
      client.send(JSON.stringify({ event: 'error', message: 'Unauthorized' }));
      client.close(1008, 'Unauthorized');
    }
  }

  handleDisconnect(client: WebSocket) {
    this.clients.delete(client);
  }

  broadcast(message: object) {
    const payload = JSON.stringify(message);
    const dead: WebSocket[] = [];
    
    this.clients.forEach((_, ws) => {
      if (ws.readyState === 1) { // 1 means OPEN
        ws.send(payload);
      } else {
        dead.push(ws);
      }
    });
    
    dead.forEach(ws => this.clients.delete(ws));
  }

  getConnectionCount(): number {
    return this.clients.size;
  }
}
