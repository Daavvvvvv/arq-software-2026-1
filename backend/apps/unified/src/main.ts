import './instrument'; // Must be first import for tracing

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as compression from 'compression';
import * as helmet from 'helmet';
import { Logger } from '@nestjs/common';

import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const NODE_ENV = process.env.NODE_ENV || 'development';

  try {
    // Create HTTP application
    const app = await NestFactory.create(AppModule);

    // Apply global middleware
    app.use(helmet());
    app.use(compression());

    // CORS configuration
    const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3001,http://localhost:3002';
    const corsOrigins = corsOrigin.split(',').map((o) => o.trim());
    app.enableCors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    // Swagger documentation (disabled in production)
    if (NODE_ENV !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('Concert Orders Unified API')
        .setDescription(
          'Event-driven food ordering system for concerts. Single unified application: HTTP API + RabbitMQ microservice consumers.',
        )
        .setVersion('1.0.0')
        .addBearerAuth()
        .addServer(
          process.env.API_URL || 'http://localhost:3000',
          NODE_ENV === 'production' ? 'Production' : 'Development',
        )
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api', app, document);
    }

    // Connect to RabbitMQ as microservice (hybrid pattern)
    // The app will:
    // 1. Listen to HTTP requests on PORT
    // 2. Subscribe to RabbitMQ messages asynchronously
    // This allows all 5 processors (kitchen, delivery, payment, notification) to run in one process
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    logger.log(`[RabbitMQ] Connecting to ${rabbitmqUrl.replace(/:.+@/, ':***@')}`);

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: 'concert-unified-queue',
        noAck: false,
        prefetchCount: 10,
        isGlobal: true,
        queueOptions: {
          durable: true,
        },
      },
    });

    // Start all microservices (RabbitMQ listeners)
    await app.startAllMicroservices();
    logger.log('[RabbitMQ] Microservice listeners started');

    // Listen for HTTP on PORT
    await app.listen(PORT, '0.0.0.0');
    logger.log(`[HTTP] Server running on port ${PORT} (${NODE_ENV})`);

    // Graceful shutdown handlers
    process.on('SIGTERM', async () => {
      logger.log('[Bootstrap] SIGTERM received, shutting down gracefully...');
      await app.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.log('[Bootstrap] SIGINT received, shutting down gracefully...');
      await app.close();
      process.exit(0);
    });

    logger.log('[Bootstrap] Application ready for requests');
  } catch (error) {
    logger.error('[Bootstrap] Fatal error during initialization:', error);
    process.exit(1);
  }
}

bootstrap();
