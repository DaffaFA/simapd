import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
export declare class StreamGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private jwtService;
    private cfg;
    server: Server;
    private clients;
    constructor(jwtService: JwtService, cfg: ConfigService);
    handleConnection(client: WebSocket, req: IncomingMessage): void;
    handleDisconnect(client: WebSocket): void;
    broadcast(message: object): void;
    getConnectionCount(): number;
}
