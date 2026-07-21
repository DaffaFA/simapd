"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const configuration_1 = require("./config/configuration");
const redis_module_1 = require("./redis/redis.module");
const auth_module_1 = require("./auth/auth.module");
const personnel_module_1 = require("./personnel/personnel.module");
const violations_module_1 = require("./violations/violations.module");
const sp_module_1 = require("./sp/sp.module");
const analytics_module_1 = require("./analytics/analytics.module");
const stream_module_1 = require("./stream/stream.module");
const storage_module_1 = require("./storage/storage.module");
const seed_service_1 = require("./common/seed.service");
const user_entity_1 = require("./auth/entities/user.entity");
const sp_config_entity_1 = require("./sp/entities/sp-config.entity");
const camera_entity_1 = require("./stream/entities/camera.entity");
const personnel_entity_1 = require("./personnel/entities/personnel.entity");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, load: [configuration_1.default] }),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (cfg) => ({
                    type: 'postgres',
                    host: cfg.get('database.host'),
                    port: cfg.get('database.port'),
                    database: cfg.get('database.name'),
                    username: cfg.get('database.user'),
                    password: cfg.get('database.password'),
                    entities: [__dirname + '/**/*.entity{.ts,.js}'],
                    synchronize: false,
                    migrations: ['dist/migrations/*{.ts,.js}'],
                    migrationsRun: true,
                }),
            }),
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, sp_config_entity_1.SpConfig, camera_entity_1.Camera, personnel_entity_1.Personnel]),
            redis_module_1.RedisModule,
            auth_module_1.AuthModule,
            personnel_module_1.PersonnelModule,
            violations_module_1.ViolationsModule,
            sp_module_1.SpModule,
            analytics_module_1.AnalyticsModule,
            stream_module_1.StreamModule,
            storage_module_1.StorageModule,
        ],
        providers: [seed_service_1.SeedService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map