"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const platform_ws_1 = require("@nestjs/platform-ws");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    const cfg = app.get(config_1.ConfigService);
    app.enableCors({ origin: cfg.get('cors.origin'), credentials: true });
    app.useWebSocketAdapter(new platform_ws_1.WsAdapter(app));
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    const doc = swagger_1.SwaggerModule.createDocument(app, new swagger_1.DocumentBuilder().setTitle('SiMAPD API').setVersion('1.0.0').addBearerAuth().build());
    swagger_1.SwaggerModule.setup('api/docs', app, doc);
    const httpAdapter = app.get(core_1.HttpAdapterHost).httpAdapter;
    httpAdapter.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));
    await app.listen(cfg.get('port', 3001));
}
bootstrap();
//# sourceMappingURL=main.js.map