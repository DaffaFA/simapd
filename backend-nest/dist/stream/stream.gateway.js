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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const ws_1 = require("ws");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const uuid_1 = require("uuid");
let StreamGateway = class StreamGateway {
    constructor(jwtService, cfg) {
        this.jwtService = jwtService;
        this.cfg = cfg;
        this.clients = new Map();
    }
    handleConnection(client, req) {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const token = url.searchParams.get('token');
        try {
            if (!token)
                throw new Error('no token');
            this.jwtService.verify(token, { secret: this.cfg.get('jwt.secret') });
            this.clients.set(client, (0, uuid_1.v4)());
            client.send(JSON.stringify({ event: 'system', message: 'Connected', level: 'info' }));
        }
        catch {
            client.send(JSON.stringify({ event: 'error', message: 'Unauthorized' }));
            client.close(1008, 'Unauthorized');
        }
    }
    handleDisconnect(client) {
        this.clients.delete(client);
    }
    broadcast(message) {
        const payload = JSON.stringify(message);
        const dead = [];
        this.clients.forEach((_, ws) => {
            if (ws.readyState === 1) {
                ws.send(payload);
            }
            else {
                dead.push(ws);
            }
        });
        dead.forEach(ws => this.clients.delete(ws));
    }
    getConnectionCount() {
        return this.clients.size;
    }
};
exports.StreamGateway = StreamGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", ws_1.Server)
], StreamGateway.prototype, "server", void 0);
exports.StreamGateway = StreamGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ namespace: '/stream', cors: { origin: '*' } }),
    __metadata("design:paramtypes", [jwt_1.JwtService, config_1.ConfigService])
], StreamGateway);
//# sourceMappingURL=stream.gateway.js.map