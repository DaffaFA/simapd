"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const camera_entity_1 = require("./entities/camera.entity");
const violations_module_1 = require("../violations/violations.module");
const stream_gateway_1 = require("./stream.gateway");
const stream_service_1 = require("./stream.service");
const stream_controller_1 = require("./stream.controller");
let StreamModule = class StreamModule {
};
exports.StreamModule = StreamModule;
exports.StreamModule = StreamModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([camera_entity_1.Camera]),
            violations_module_1.ViolationsModule,
            jwt_1.JwtModule.registerAsync({
                inject: [config_1.ConfigService],
                useFactory: (cfg) => ({ secret: cfg.get('jwt.secret') }),
            }),
        ],
        providers: [
            { provide: stream_gateway_1.StreamGateway, useClass: stream_gateway_1.StreamGateway },
            { provide: stream_service_1.StreamService, useClass: stream_service_1.StreamService },
        ],
        controllers: [stream_controller_1.StreamController],
        exports: [stream_gateway_1.StreamGateway],
    })
], StreamModule);
//# sourceMappingURL=stream.module.js.map