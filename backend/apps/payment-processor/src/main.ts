import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? '*' });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // Raw body for Stripe webhook signature validation
  app.use('/webhook/stripe', json({ verify: (req: any, _res, buf) => { req.rawBody = buf; } }));

  const config = new DocumentBuilder()
    .setTitle('Payment Processor API')
    .setDescription('Concert orders — payment processor (port 3002)')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(3002);
  console.log('Payment Processor running on port 3002');
}

void bootstrap();
