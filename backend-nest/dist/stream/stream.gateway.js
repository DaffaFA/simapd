"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var StreamGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamGateway = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const ws_1 = require("ws");
const uuid_1 = require("uuid");
let StreamGateway = StreamGateway_1 = class StreamGateway {
    constructor(jwtService, configService) {
        this.jwtService = jwtService;
        this.configService = configService;
        this.logger = new common_1.Logger(StreamGateway_1.name);
        this.clients = new Map();
    }
    afterInit(server) {
        this.logger.log('WebSocket Gateway initialized');
    }
    handleConnection(client, req) {
        let token = null;
        let requestPath = '/';
        try {
            const rawUrl = req.url ?? '/';
            const base = `http://${req.headers.host ?? 'localhost'}`;
            const parsed = new URL(rawUrl, base);
            token = parsed.searchParams.get('token');
            requestPath = parsed.pathname;
        }
        catch (err) {
            this.logger.error(`[WS] URL parse error: ${err}`);
        }
        const allowedPaths = ['/stream', '/stream/', '/'];
        if (!allowedPaths.includes(requestPath)) {
            this.logger.warn(`[WS] Rejected path: ${requestPath}`);
            try {
                client.close(1008, 'Wrong path');
            }
            catch { }
            return;
        }
        if (!token) {
            this.logger.warn('[WS] No token provided — closing');
            try {
                client.send(JSON.stringify({ event: 'error', message: 'No token' }));
                client.close(1008, 'Unauthorized');
            }
            catch { }
            return;
        }
        try {
            const secret = this.configService.get('jwt.secret');
            if (!secret) {
                this.logger.error('[WS] JWT secret not configured!');
                client.close(1011, 'Server error');
                return;
            }
            this.jwtService.verify(token, { secret });
        }
        catch (err) {
            this.logger.warn(`[WS] JWT verify failed: ${err.message}`);
            try {
                client.send(JSON.stringify({ event: 'error', message: 'Unauthorized' }));
                client.close(1008, 'Unauthorized');
            }
            catch { }
            return;
        }
        const clientId = (0, uuid_1.v4)();
        this.clients.set(client, clientId);
        this.logger.log(`[WS] Client connected: ${clientId} | total: ${this.clients.size}`);
        try {
            client.send(JSON.stringify({
                event: 'system',
                message: 'Connected to SiMAPD stream',
                level: 'info',
            }));
        }
        catch { }
    }
    handleDisconnect(client) {
        const id = this.clients.get(client) ?? 'unknown';
        this.clients.delete(client);
        this.logger.log(`[WS] Client disconnected: ${id} | remaining: ${this.clients.size}`);
    }
    broadcast(message) {
        if (this.clients.size === 0)
            return;
        const payload = JSON.stringify(message);
        const dead = [];
        this.clients.forEach((_, ws) => {
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                try {
                    ws.send(payload);
                }
                catch {
                    dead.push(ws);
                }
            }
            else {
                dead.push(ws);
            }
        });
        dead.forEach(ws => this.clients.delete(ws));
    }
    getConnectionCount() { return this.clients.size; }
};
exports.StreamGateway = StreamGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", ws_1.Server)
], StreamGateway.prototype, "server", void 0);
exports.StreamGateway = StreamGateway = StreamGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        path: '/stream',
        cors: {
            origin: '*',
            credentials: false,
        },
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService])
], StreamGateway);
//# sourceMappingURL=stream.gateway.js.map