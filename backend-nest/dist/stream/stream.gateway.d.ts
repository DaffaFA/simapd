import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
export declare class StreamGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwtService;
    private readonly configService;
    server: Server;
    private readonly logger;
    private readonly clients;
    constructor(jwtService: JwtService, configService: ConfigService);
    afterInit(server: Server): void;
    handleConnection(client: WebSocket, req: IncomingMessage): void;
    handleDisconnect(client: WebSocket): void;
    broadcast(message: object): void;
    getConnectionCount(): number;
}
