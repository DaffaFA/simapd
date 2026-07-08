import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new WsAdapter(app));
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  
  const cfg = app.get(ConfigService);
  app.enableCors({ origin: cfg.get('cors.origin'), credentials: true });
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('SiMAPD API').setVersion('1.0.0').addBearerAuth().build(),
  );
  SwaggerModule.setup('api/docs', app, doc);

  // health check tanpa prefix
  const httpAdapter = app.get(HttpAdapterHost).httpAdapter;
  httpAdapter.get('/health', (req: any, res: any) =>
    res.json({ status: 'ok', version: '1.0.0' }),
  );

  await app.listen(cfg.get<number>('port', 3001));
}
bootstrap();
