# Deploy a Produccion — Plan de Implementacion

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deployar el sistema Concert Orders a internet con $0 de costo usando free tiers.

**Architecture:** Backend monolito unificado (5 procesadores NestJS en 1 proceso) en Render.com, PostgreSQL en Neon.tech, RabbitMQ en CloudAMQP, frontend en Vercel. Redis se elimina del stack de produccion (no es necesario para el demo).

**Tech Stack:** NestJS, TypeORM, @golevelup/nestjs-rabbitmq, PostgreSQL (Neon), RabbitMQ (CloudAMQP), React+Vite (Vercel), Docker, Render.com

---

## Task 1: Crear app unificada del backend

Consolidar los 5 procesadores NestJS en un solo proceso desplegable. Cada procesador ya importa los mismos shared libs (@Global), asi que basta con crear un unico AppModule que registre todos los controllers, services y processors.

**Files:**
- Create: `backend/apps/unified/src/main.ts`
- Create: `backend/apps/unified/src/app.module.ts`
- Create: `backend/apps/unified/package.json`
- Create: `backend/apps/unified/tsconfig.json`
- Create: `backend/apps/unified/src/instrument.ts`

- [ ] **Step 1: Crear package.json del app unificada**

```json
{
  "name": "@concert/unified",
  "version": "1.0.0",
  "scripts": {
    "start:dev": "ts-node-dev --respawn --transpile-only -r tsconfig-paths/register src/main.ts",
    "build": "tsc -p tsconfig.json && tsc-alias -p tsconfig.json",
    "start:prod": "node dist/main.js"
  },
  "dependencies": {
    "@concert/auth": "*",
    "@concert/database": "*",
    "@concert/domain": "*",
    "@concert/events": "*",
    "@concert/messaging": "*",
    "@concert/telemetry": "*"
  }
}
```

- [ ] **Step 2: Crear tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Crear instrument.ts**

```typescript
import { initTracing } from '@concert/telemetry';
initTracing('concert-unified');
```

- [ ] **Step 4: Crear app.module.ts unificado**

Este modulo importa los shared libs una sola vez y registra todos los controllers/services/processors de los 5 apps.

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from '@concert/database';
import { AuthModule } from '@concert/auth';
import { MessagingModule } from '@concert/messaging';
import { TelemetryModule } from '@concert/telemetry';

// ── Order Processor ────────────────────────────────────────
import { AuthController } from '../../order-processor/src/auth/auth.controller';
import { AuthService } from '../../order-processor/src/auth/auth.service';
import { OrdersController } from '../../order-processor/src/orders/orders.controller';
import { OrdersService } from '../../order-processor/src/orders/orders.service';
import { BoletasController } from '../../order-processor/src/boletas/boletas.controller';
import { BoletasService } from '../../order-processor/src/boletas/boletas.service';
import { TiendasController } from '../../order-processor/src/tiendas/tiendas.controller';
import { TiendasService } from '../../order-processor/src/tiendas/tiendas.service';
import { MenuController } from '../../order-processor/src/tiendas/menu.controller';
import { AdminController } from '../../order-processor/src/admin/admin.controller';
import { AdminService } from '../../order-processor/src/admin/admin.service';
import { HealthController } from '../../order-processor/src/health/health.controller';

// ── Kitchen Processor ──────────────────────────────────────
import { KitchenController } from '../../kitchen-processor/src/kitchen/kitchen.controller';
import { KitchenService } from '../../kitchen-processor/src/kitchen/kitchen.service';
import { KitchenProcessor } from '../../kitchen-processor/src/kitchen/kitchen.processor';

// ── Payment Processor ──────────────────────────────────────
import { PaymentService } from '../../payment-processor/src/payment.service';
import { PaymentProcessor } from '../../payment-processor/src/payment.processor';
import { MockPaymentService } from '../../payment-processor/src/modules/mock/mock-payment.service';
import { MercadoPagoModule } from '../../payment-processor/src/modules/mercadopago/mercadopago.module';
import { StripeModule } from '../../payment-processor/src/modules/stripe/stripe.module';

// ── Delivery Processor ─────────────────────────────────────
import { DeliveryController } from '../../delivery-processor/src/delivery/delivery.controller';
import { DeliveryService } from '../../delivery-processor/src/delivery/delivery.service';
import { DeliveryProcessor } from '../../delivery-processor/src/delivery/delivery.processor';

// ── Notification Service ───────────────────────────────────
import { NotificationService } from '../../notification-service/src/notification/notification.service';
import { NotificationProcessor } from '../../notification-service/src/notification/notification.processor';
import { FcmChannel } from '../../notification-service/src/channels/fcm.channel';
import { EmailChannel } from '../../notification-service/src/channels/email.channel';
import { SmsChannel } from '../../notification-service/src/channels/sms.channel';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    TelemetryModule,
    DatabaseModule,
    AuthModule,
    MessagingModule,
    MercadoPagoModule,
    StripeModule,
  ],
  controllers: [
    HealthController,
    AuthController,
    OrdersController,
    BoletasController,
    TiendasController,
    MenuController,
    AdminController,
    KitchenController,
    DeliveryController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Order
    AuthService,
    OrdersService,
    BoletasService,
    TiendasService,
    AdminService,
    // Kitchen
    KitchenService,
    KitchenProcessor,
    // Payment
    MockPaymentService,
    PaymentService,
    PaymentProcessor,
    // Delivery
    DeliveryService,
    DeliveryProcessor,
    // Notification
    FcmChannel,
    EmailChannel,
    SmsChannel,
    NotificationService,
    NotificationProcessor,
  ],
})
export class AppModule {}
```

- [ ] **Step 5: Crear main.ts unificado**

```typescript
import './instrument';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? '*' });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const config = new DocumentBuilder()
    .setTitle('Concert Orders API')
    .setDescription('Sistema de pedidos en conciertos — API unificada')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`Concert Orders API running on port ${port}`);
}

void bootstrap();
```

- [ ] **Step 6: Verificar que compila localmente**

Run: `cd backend && npx tsc -p apps/unified/tsconfig.json --noEmit`
Expected: 0 errors (o errores que se arreglan en Task 2)

- [ ] **Step 7: Commit**

```bash
git add backend/apps/unified/
git commit -m "feat: add unified backend app for single-process deployment"
```

---

## Task 2: Hacer datasource compatible con DATABASE_URL

Neon.tech provee un `DATABASE_URL` con SSL. El datasource actual usa variables individuales (DB_HOST, DB_PORT, etc). Necesita soportar ambos modos.

**Files:**
- Modify: `backend/libs/database/src/write-datasource.ts`
- Modify: `backend/libs/database/src/read-datasource.ts`

- [ ] **Step 1: Modificar write-datasource.ts**

```typescript
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

const connectionOptions = databaseUrl
  ? {
      url: databaseUrl,
      ssl: databaseUrl.includes('neon.tech') || databaseUrl.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : undefined,
    }
  : {
      host: process.env.DB_WRITE_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      database: process.env.DB_NAME ?? 'concert_orders',
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASS ?? 'postgres',
    };

export const writeDatasource = new DataSource({
  type: 'postgres',
  ...connectionOptions,
  entities: [join(__dirname, '../../domain/src/entities/*.entity.{ts,js}')],
  migrations: [join(__dirname, '../../../migrations/[0-9]*_*.{ts,js}')],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
```

- [ ] **Step 2: Modificar read-datasource.ts para usar DATABASE_URL tambien**

Mismo patron que write-datasource pero con DB_READ_HOST como fallback. En produccion con Neon free tier, read y write apuntan al mismo URL.

```typescript
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

const databaseUrl = process.env.DATABASE_READ_URL ?? process.env.DATABASE_URL;

const connectionOptions = databaseUrl
  ? {
      url: databaseUrl,
      ssl: databaseUrl.includes('neon.tech') || databaseUrl.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : undefined,
    }
  : {
      host: process.env.DB_READ_HOST ?? process.env.DB_WRITE_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      database: process.env.DB_NAME ?? 'concert_orders',
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASS ?? 'postgres',
    };

export const readDatasource = new DataSource({
  type: 'postgres',
  ...connectionOptions,
  entities: [join(__dirname, '../../domain/src/entities/*.entity.{ts,js}')],
  synchronize: false,
  logging: false,
});
```

- [ ] **Step 3: Commit**

```bash
git add backend/libs/database/
git commit -m "feat: support DATABASE_URL for Neon.tech production deployment"
```

---

## Task 3: Hacer telemetria graceful en produccion

En produccion (Render free tier) no hay Loki, Tempo ni Prometheus. El tracing y los logs a Loki deben degradarse sin errores si no hay endpoint disponible.

**Files:**
- Modify: `backend/libs/telemetry/src/tracing.ts`
- Modify: `backend/libs/telemetry/src/logger.factory.ts`

- [ ] **Step 1: Leer logger.factory.ts actual**

Run: `cat backend/libs/telemetry/src/logger.factory.ts`
(Necesitamos ver la implementacion actual antes de modificar)

- [ ] **Step 2: Modificar tracing.ts para ser no-op cuando no hay endpoint**

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { AmqplibInstrumentation } from '@opentelemetry/instrumentation-amqplib';

let sdk: NodeSDK | null = null;

export function initTracing(serviceName: string): void {
  if (sdk) return;

  const otlpBase = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  // Skip tracing if no endpoint configured (production free tier)
  if (!otlpBase) {
    console.log(`[OTel] No OTEL_EXPORTER_OTLP_ENDPOINT set — tracing disabled`);
    return;
  }

  sdk = new NodeSDK({
    resource: new Resource({
      [SEMRESATTRS_SERVICE_NAME]: serviceName,
      'deployment.environment': process.env.NODE_ENV ?? 'development',
    }),
    traceExporter: new OTLPTraceExporter({
      url: `${otlpBase}/v1/traces`,
    }),
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
      new PgInstrumentation({ enhancedDatabaseReporting: false }),
      new AmqplibInstrumentation(),
    ],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk?.shutdown().catch((err: unknown) => console.error('[OTel] shutdown error', err));
  });
}
```

- [ ] **Step 3: Modificar logger.factory.ts para no enviar a Loki cuando no hay URL**

Revisar el archivo y asegurar que el transporte a Loki solo se agrega si `LOKI_URL` esta definido. Si no, solo usar console transport. El cambio exacto depende del contenido actual del archivo (leido en Step 1).

- [ ] **Step 4: Commit**

```bash
git add backend/libs/telemetry/
git commit -m "fix: graceful degradation of telemetry when no endpoints configured"
```

---

## Task 4: Crear Dockerfile para el backend unificado

Dockerfile multi-stage optimizado para Render.com. Render espera un Dockerfile en la raiz del contexto de build, o se puede especificar la ruta.

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`

- [ ] **Step 1: Crear .dockerignore**

```
node_modules
dist
.env
.env.*
*.md
infrastructure/
```

- [ ] **Step 2: Crear Dockerfile multi-stage**

```dockerfile
# ── Stage 1: Install dependencies ─────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/unified/package.json apps/unified/
COPY apps/order-processor/package.json apps/order-processor/
COPY apps/kitchen-processor/package.json apps/kitchen-processor/
COPY apps/payment-processor/package.json apps/payment-processor/
COPY apps/delivery-processor/package.json apps/delivery-processor/
COPY apps/notification-service/package.json apps/notification-service/
COPY libs/auth/package.json libs/auth/
COPY libs/database/package.json libs/database/
COPY libs/domain/package.json libs/domain/
COPY libs/events/package.json libs/events/
COPY libs/messaging/package.json libs/messaging/
COPY libs/telemetry/package.json libs/telemetry/
RUN npm ci --omit=dev

# ── Stage 2: Build ────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
COPY apps/ apps/
COPY libs/ libs/
COPY migrations/ migrations/
COPY scripts/ scripts/
COPY --from=deps /app/node_modules node_modules
RUN npm run build --workspace=apps/unified

# ── Stage 3: Production image ─────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules node_modules
COPY --from=build /app/apps/unified/dist apps/unified/dist
COPY --from=build /app/libs libs
COPY --from=build /app/migrations migrations
COPY --from=build /app/scripts scripts
COPY --from=build /app/package.json .
COPY --from=build /app/tsconfig.json .

EXPOSE 3000
CMD ["node", "apps/unified/dist/main.js"]
```

Nota: El build actual usa tsc que genera JS pero los imports de libs usan paths de TypeScript. Necesitamos que los paths del tsconfig se resuelvan correctamente en runtime. Por eso en Step 1 del Task 1 se agrega `tsc-alias` al build script.

- [ ] **Step 3: Verificar que el Dockerfile construye localmente**

Run: `cd backend && docker build -t concert-orders-api .`
Expected: Build exitoso, imagen creada

- [ ] **Step 4: Verificar que la imagen corre**

Run: `docker run --rm -e DATABASE_URL=postgresql://test:test@host.docker.internal:5432/concert_orders -e RABBITMQ_URL=amqp://user:password@host.docker.internal:5672 -e JWT_SECRET=test -e PAYMENT_PROVIDER=mock -p 3000:3000 concert-orders-api`
Expected: Server starts on port 3000 (puede fallar la conexion a DB/RMQ si no estan corriendo, pero el proceso debe iniciar)

- [ ] **Step 5: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore
git commit -m "feat: add Dockerfile for unified backend deployment"
```

---

## Task 5: Crear render.yaml (Infrastructure as Code)

Render soporta un archivo `render.yaml` en la raiz del repo que define los servicios. Esto permite deploy con un click.

**Files:**
- Create: `render.yaml` (raiz del proyecto)

- [ ] **Step 1: Crear render.yaml**

```yaml
services:
  - type: web
    name: concert-orders-api
    runtime: docker
    dockerfilePath: backend/Dockerfile
    dockerContext: backend
    plan: free
    envVars:
      - key: DATABASE_URL
        sync: false  # se configura manualmente con la URL de Neon.tech
      - key: RABBITMQ_URL
        sync: false  # se configura manualmente con la URL de CloudAMQP
      - key: JWT_SECRET
        generateValue: true
      - key: JWT_EXPIRES_IN
        value: 15m
      - key: JWT_MODE
        value: local
      - key: PAYMENT_PROVIDER
        value: mock
      - key: CORS_ORIGIN
        sync: false  # URLs de Vercel
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
    healthCheckPath: /health
```

- [ ] **Step 2: Commit**

```bash
git add render.yaml
git commit -m "feat: add render.yaml for one-click Render deployment"
```

---

## Task 6: Configurar servicios externos (manual + documentacion)

Crear un documento con las instrucciones paso a paso para configurar Neon.tech, CloudAMQP, y Render.

**Files:**
- Create: `docs/DEPLOY.md`

- [ ] **Step 1: Crear docs/DEPLOY.md**

```markdown
# Deploy a Produccion — Guia Paso a Paso

## 1. Base de Datos: Neon.tech

1. Ir a https://neon.tech y crear cuenta (GitHub login)
2. Crear proyecto: "concert-orders"
3. Copiar el **Connection string** (formato: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`)
4. Ejecutar migraciones desde tu maquina local:
   ```bash
   cd backend
   DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require" npm run migrate
   ```
5. Ejecutar seed:
   ```bash
   DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require" npm run seed
   ```

## 2. RabbitMQ: CloudAMQP

1. Ir a https://www.cloudamqp.com y crear cuenta
2. Crear instancia: plan **Little Lemur (Free)**
3. Copiar la **AMQP URL** (formato: `amqps://user:pass@host.cloudamqp.com/vhost`)
4. Guardar esta URL para Render

## 3. Backend: Render.com

### Opcion A: Deploy automatico con render.yaml
1. Ir a https://render.com y crear cuenta (GitHub login)
2. Click "New" > "Blueprint"
3. Conectar el repo de GitHub
4. Render detecta el render.yaml y crea el servicio
5. Configurar las env vars manuales:
   - `DATABASE_URL` = la URL de Neon.tech
   - `RABBITMQ_URL` = la URL de CloudAMQP
   - `CORS_ORIGIN` = `https://tu-app.vercel.app,https://tu-kitchen.vercel.app`

### Opcion B: Deploy manual
1. "New" > "Web Service"
2. Conectar repo, seleccionar branch `main`
3. Root directory: `backend`
4. Runtime: Docker
5. Plan: Free
6. Configurar env vars (mismas que arriba + JWT_SECRET, PAYMENT_PROVIDER=mock, etc.)

### Health Check
Render pinga `/health` para mantener el servicio vivo. El endpoint ya existe en el codigo.

**IMPORTANTE:** El free tier duerme despues de 15 min de inactividad. Primer request tarda ~30s.

## 4. Frontend: Vercel

### App Cliente (frontend del asistente)
1. Ir a https://vercel.com y crear cuenta (GitHub login)
2. "Add New" > "Project"
3. Importar el repo
4. Framework: Vite
5. Root Directory: `.` (raiz — el frontend esta en la raiz del proyecto)
6. Environment Variables:
   - `VITE_API_URL` = `https://concert-orders-api.onrender.com`
7. Deploy

### Dashboard Cocina (si existe como app separada)
Mismo proceso pero con Root Directory apuntando al subdirectorio del dashboard.

## 5. Verificacion

1. Abrir `https://concert-orders-api.onrender.com/health` — debe retornar `{ "status": "ok" }`
2. Abrir `https://concert-orders-api.onrender.com/api/docs` — Swagger UI
3. Abrir la app de Vercel — debe cargar el menu
4. Crear un pedido y verificar que llega al dashboard de cocina

## Variables de Entorno — Resumen

| Variable | Valor | Donde |
|---|---|---|
| DATABASE_URL | postgresql://...@neon.tech/... | Render |
| RABBITMQ_URL | amqps://...@cloudamqp.com/... | Render |
| JWT_SECRET | (auto-generado por Render) | Render |
| JWT_EXPIRES_IN | 15m | Render |
| PAYMENT_PROVIDER | mock | Render |
| CORS_ORIGIN | https://app.vercel.app,https://kitchen.vercel.app | Render |
| NODE_ENV | production | Render |
| PORT | 3000 | Render |
| VITE_API_URL | https://concert-orders-api.onrender.com | Vercel |
```

- [ ] **Step 2: Commit**

```bash
git add docs/DEPLOY.md
git commit -m "docs: add production deployment guide"
```

---

## Task 7: Actualizar frontend para usar API URL configurable

El frontend actual usa mocks locales. Necesita apuntar a la API real via variable de entorno de Vite.

**Files:**
- Modify: `src/services/menuService.ts`
- Modify: `src/services/orderService.ts`
- Create: `.env.example` (raiz del proyecto)

- [ ] **Step 1: Crear .env.example en la raiz**

```
VITE_API_URL=http://localhost:3001
```

- [ ] **Step 2: Crear un modulo de configuracion de API**

Create: `src/services/api.ts`

```typescript
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `API error ${res.status}`);
  }
  return res;
}
```

- [ ] **Step 3: Actualizar menuService.ts para llamar la API real**

Modificar `getMenu()` para hacer fetch a `GET /tiendas/:id/menu` (o el endpoint correspondiente) en lugar de retornar mocks. Mantener el mock como fallback para desarrollo sin backend.

- [ ] **Step 4: Actualizar orderService.ts para llamar la API real**

Modificar `createOrder()` para hacer POST a `/orders` y `getOrder()` para hacer GET a `/orders/:id`.

- [ ] **Step 5: Commit**

```bash
git add src/services/ .env.example
git commit -m "feat: connect frontend to real API via VITE_API_URL"
```

---

## Task 8: Verificacion local end-to-end

Antes de deployar, verificar que todo funciona localmente con docker-compose.

**Files:** Ninguno nuevo — solo comandos de verificacion.

- [ ] **Step 1: Levantar infraestructura local**

Run: `cd backend && docker-compose -f infrastructure/docker-compose.yml up -d postgres rabbitmq`

- [ ] **Step 2: Crear .env del backend**

Run: `cd backend && cp .env.example .env`

- [ ] **Step 3: Instalar dependencias**

Run: `cd backend && npm install`

- [ ] **Step 4: Ejecutar migraciones y seed**

Run: `cd backend && npm run migrate && npm run seed`

- [ ] **Step 5: Iniciar la app unificada**

Run: `cd backend && npm run start:dev --workspace=apps/unified`
Expected: Server starts on port 3000, connects to PostgreSQL and RabbitMQ

- [ ] **Step 6: Verificar health endpoint**

Run: `curl http://localhost:3000/health`
Expected: `{"status":"ok","timestamp":"..."}`

- [ ] **Step 7: Verificar Swagger**

Open: `http://localhost:3000/api/docs`
Expected: Swagger UI con todos los endpoints de los 5 procesadores

- [ ] **Step 8: Iniciar frontend**

Run: `npm run dev` (en la raiz del proyecto)
Expected: Frontend en http://localhost:5173 conectando a http://localhost:3000

---

## Task 9: Push y deploy

- [ ] **Step 1: Push a GitHub**

Run: `git push origin main`

- [ ] **Step 2: Configurar Neon.tech**

Seguir docs/DEPLOY.md seccion 1.

- [ ] **Step 3: Configurar CloudAMQP**

Seguir docs/DEPLOY.md seccion 2.

- [ ] **Step 4: Ejecutar migraciones en Neon**

Run: `cd backend && DATABASE_URL="<neon-url>" npm run migrate && DATABASE_URL="<neon-url>" npm run seed`

- [ ] **Step 5: Deploy backend en Render**

Seguir docs/DEPLOY.md seccion 3. Configurar todas las env vars.

- [ ] **Step 6: Deploy frontend en Vercel**

Seguir docs/DEPLOY.md seccion 4. Configurar VITE_API_URL con la URL de Render.

- [ ] **Step 7: Verificar en produccion**

1. `https://<render-url>/health` retorna ok
2. `https://<render-url>/api/docs` muestra Swagger
3. Frontend en Vercel carga el menu
4. Crear pedido, verificar flujo completo
