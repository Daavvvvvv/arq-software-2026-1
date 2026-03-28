import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from '@concert/database';
import { AuthModule } from '@concert/auth';
import { MessagingModule } from '@concert/messaging';
import { TelemetryModule } from '@concert/telemetry';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { OrdersController } from './orders/orders.controller';
import { OrdersService } from './orders/orders.service';
import { BoletasController } from './boletas/boletas.controller';
import { BoletasService } from './boletas/boletas.service';
import { TiendasController } from './tiendas/tiendas.controller';
import { TiendasService } from './tiendas/tiendas.service';
import { MenuController } from './tiendas/menu.controller';
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    TelemetryModule,
    DatabaseModule,
    AuthModule,
    MessagingModule,
  ],
  controllers: [
    AuthController,
    OrdersController,
    BoletasController,
    TiendasController,
    MenuController,
    AdminController,
    HealthController,
  ],
  providers: [
    AuthService,
    OrdersService,
    BoletasService,
    TiendasService,
    AdminService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
