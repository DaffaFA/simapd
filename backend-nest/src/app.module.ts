import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';

import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { PersonnelModule } from './personnel/personnel.module';
import { ViolationsModule } from './violations/violations.module';
import { SpModule } from './sp/sp.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { StreamModule } from './stream/stream.module';

import { SeedService } from './common/seed.service';
import { User } from './auth/entities/user.entity';
import { SpConfig } from './sp/entities/sp-config.entity';
import { Camera } from './stream/entities/camera.entity';
import { Personnel } from './personnel/entities/personnel.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get('database.host'),
        port: cfg.get<number>('database.port'),
        database: cfg.get('database.name'),
        username: cfg.get('database.user'),
        password: cfg.get('database.password'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        migrations: ['dist/migrations/*{.ts,.js}'],
        migrationsRun: true,
      }),
    }),
    TypeOrmModule.forFeature([User, SpConfig, Camera, Personnel]),
    RedisModule,
    AuthModule,
    PersonnelModule,
    ViolationsModule,
    SpModule,
    AnalyticsModule,
    StreamModule,
  ],
  providers: [SeedService],
})
export class AppModule {}
