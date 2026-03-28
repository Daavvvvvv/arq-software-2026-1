import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { createWinstonOptions } from './logger.factory';
import { MetricsController } from './metrics.controller';

@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createWinstonOptions(config.get<string>('SERVICE_NAME') ?? 'concert'),
    }),
  ],
  controllers: [MetricsController],
  exports: [WinstonModule],
})
export class TelemetryModule {}
