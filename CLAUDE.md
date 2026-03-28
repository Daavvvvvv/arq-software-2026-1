# CLAUDE.md — Contexto Completo del Proyecto

## DIRECTRIZ PRINCIPAL — LEE ESTO PRIMERO

Este es un proyecto académico de la Universidad EAFIT — clase de Arquitecturas Avanzadas de Software 2026. El tercer entregable requiere un caso de uso implementado en vivo.

**RESTRICCIÓN ABSOLUTA: $0 DE PRESUPUESTO.**
NO vamos a usar AWS. NO vamos a pagar por ningún servicio.
Todo el despliegue se hace con herramientas open-source y free tiers permanentes.

Sin embargo, la ARQUITECTURA DE REFERENCIA (diseño conceptual) fue diseñada con AWS.
La distinción es: la arquitectura Event-Driven NO cambia. Solo cambia la tecnología de despliegue.
Esto es académicamente correcto: el diagrama de arquitectura define "qué" componentes existen;
el diagrama de despliegue materializa "dónde" y "cómo" se implementan físicamente.

---

## Descripción del Proyecto

Sistema SaaS de pedidos y entregas de comida/bebida desde el asiento en conciertos.
Los asistentes piden desde su celular, la cocina recibe en tiempo real, y se despacha al puesto
usando la ubicación de la boleta (sección, fila, asiento).
El sistema es multi-tenant: sirve múltiples recintos/venues.
Multi-tenant es un patrón de diseño, NO un estilo arquitectónico.

## OKRs

- **Objetivo:** Transformar la experiencia de consumo en conciertos mediante pedidos y entregas desde el asiento.
- **KR1:** ≥25% de asistentes piden por la plataforma durante el evento.
- **KR2:** Tiempo promedio de entrega <10 minutos desde el pedido.
- **KR3:** <1% pedidos fallidos durante los eventos.

## Estilo Arquitectónico: Event-Driven Architecture (EDA)

Seleccionado con el Architecture Styles Worksheet V2.0 de Mark Richards.
Scores correctos de EDA (verificados y corregidos en documentación):
- Elasticidad: 3/5 (NO 5/5 — fue corregido)
- Escalabilidad: 5/5
- Fault Tolerance: 5/5
- Responsiveness: 5/5

### Por qué EDA y no otros:
- **Microservices** descartado: supera en elasticidad (5/5) pero responsiveness 3/5, costo/complejidad (Kubernetes, service mesh) no se justifica.
- **Space-Based** descartado: elasticidad 5/5 pero fault tolerance 3/5, requiere almacenamiento in-memory distribuido costoso.
- **Monolito modular** descartado: no soporta picos de demanda de 15,000 personas ni escala componentes independientemente.

---

## MAPEO: DISEÑO DE PRODUCCIÓN → DESPLIEGUE REAL ($0)

| Componente (Arq. Referencia) | Producción (AWS) | Despliegue Real ($0) | Servicio Concreto |
|---|---|---|---|
| Event Processors | ECS Fargate | Contenedor managed | **Render.com** (free tier) |
| Broker de Eventos | SQS/SNS | RabbitMQ managed | **CloudAMQP** (Little Lemur free) |
| Base de Datos | RDS PostgreSQL Multi-AZ | PostgreSQL serverless | **Neon.tech** (free tier) |
| App Cliente (PWA) | CloudFront + S3 | CDN + hosting estático | **Vercel** (free tier) |
| Dashboard Cocina | CloudFront + S3 | CDN + hosting estático | **Vercel** (free tier) |
| API Gateway | AWS API Gateway | Reverse proxy incluido | Incluido en Render |
| Autenticación | Amazon Cognito | JWT manual | Implementado en NestJS |
| WebSockets | AppSync / IoT Core | Socket.io | Incluido en backend NestJS |
| Observabilidad | CloudWatch + X-Ray | Logs consola + RabbitMQ dashboard | Logs de Render |
| CI/CD | CodeBuild + ECR | GitHub Push → Auto-deploy | Render + Vercel auto-deploy |

**IMPORTANTE PARA EL CÓDIGO:** Cuando generes código, usa las tecnologías de la columna "Despliegue Real ($0)", NUNCA las de AWS. Por ejemplo:
- Usa `amqplib` / `amqp-connection-manager` para RabbitMQ, NO aws-sdk para SQS/SNS.
- Usa `typeorm` + `pg` para PostgreSQL, NO aws-sdk para RDS.
- Usa `@nestjs/platform-socket.io` para WebSockets, NO AWS IoT.
- Usa JWT manual con `@nestjs/jwt`, NO Cognito SDK.

---

## Caso de Uso a Implementar (Tercer Entregable)

**Flujo: Pedido desde el asiento → Notificación a cocina en tiempo real**

```
[App Cliente] --POST /orders--> [NestJS API]
                                    |
                                    ├── Guarda en PostgreSQL (Neon.tech)
                                    |
                                    └── Publica "order.created" --> [RabbitMQ (CloudAMQP)]
                                                                       |
                                                                       v
                                                               [Kitchen Consumer]
                                                                       |
                                                                       └── WebSocket emit --> [Dashboard Cocina]
```

Demuestra EDA en vivo: comunicación asíncrona a través de un broker de eventos.
Si la cocina está desconectada, el mensaje espera en la cola y se procesa cuando vuelva.
Eso es <1% de pedidos fallidos (KR3) por diseño.

---

## Stack Técnico

- **Lenguaje:** TypeScript exclusivamente
- **Backend:** NestJS
- **Broker:** RabbitMQ (CloudAMQP)
- **Base de datos:** PostgreSQL (Neon.tech)
- **ORM:** TypeORM
- **WebSockets:** Socket.io (@nestjs/websockets + @nestjs/platform-socket.io)
- **Frontend:** React o Next.js (Vercel)
- **Auth:** JWT manual (@nestjs/jwt + bcrypt) — NO Cognito

NO usar: AWS SDK, Cognito SDK, SQS SDK, SNS SDK, ni ningún servicio de pago.

---

## Estructura del Proyecto

```
concert-orders/
├── CLAUDE.md                   ← este archivo
├── docker-compose.yml          ← desarrollo local (RabbitMQ + PostgreSQL)
├── apps/
│   ├── api/                    ← NestJS backend (deploy en Render.com)
│   │   ├── src/
│   │   │   ├── orders/
│   │   │   │   ├── orders.controller.ts
│   │   │   │   ├── orders.service.ts
│   │   │   │   ├── orders.module.ts
│   │   │   │   ├── order.entity.ts
│   │   │   │   └── dto/
│   │   │   │       └── create-order.dto.ts
│   │   │   ├── kitchen/
│   │   │   │   ├── kitchen.consumer.ts       # @EventPattern('order.created')
│   │   │   │   ├── kitchen.gateway.ts        # @WebSocketGateway
│   │   │   │   └── kitchen.module.ts
│   │   │   ├── health/
│   │   │   │   └── health.controller.ts      # GET /health — OBLIGATORIO para Render
│   │   │   ├── app.module.ts
│   │   │   └── main.ts                       # Hybrid app: HTTP + RMQ consumer
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── client/                 ← App del asistente (deploy en Vercel)
│   │   └── ...
│   └── kitchen-dashboard/      ← Dashboard cocina (deploy en Vercel)
│       └── ...
```

---

## Docker Compose para Desarrollo Local

```yaml
version: '3.8'
services:
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
    # Dashboard: http://localhost:15672 (guest/guest)
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: concert_orders
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
```

SIEMPRE probar localmente con docker-compose antes de deployar.

---

## Backend NestJS: Especificaciones Técnicas

### main.ts — Hybrid Application (CRÍTICO)

El backend DEBE ser una hybrid app: HTTP + RabbitMQ consumer en el MISMO proceso.
Render free tier solo da 1 instancia.

```typescript
// Patrón obligatorio en main.ts:
// 1. const app = await NestFactory.create(AppModule)
// 2. app.connectMicroservice({
//      transport: Transport.RMQ,
//      options: {
//        urls: [process.env.RABBITMQ_URL],
//        queue: 'orders_queue',
//        queueOptions: { durable: true },
//        noAck: false
//      }
//    })
// 3. app.enableCors({ origin: process.env.CORS_ORIGIN.split(',') })
// 4. await app.startAllMicroservices()
// 5. await app.listen(process.env.PORT || 3000)
```

### Entidad Order

```typescript
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('jsonb')
  items: Array<{ name: string; quantity: number; price: number }>;

  @Column()
  section: string;      // Sección del venue (ej: "A", "VIP")

  @Column()
  row: number;          // Fila

  @Column()
  seat: number;         // Puesto/asiento

  @Column({
    type: 'enum',
    enum: ['pending', 'preparing', 'ready', 'delivered'],
    default: 'pending'
  })
  status: string;

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Endpoints HTTP

```
GET  /health              → { status: 'ok', timestamp }  ← OBLIGATORIO
POST /orders              → Crear pedido + publicar order.created
GET  /orders/:id          → Consultar estado del pedido
PATCH /orders/:id/status  → Actualizar estado (usado por dashboard cocina)
GET  /menu                → Retornar menú hardcodeado
```

### Eventos RabbitMQ

```
Queue: orders_queue (durable: true)

Publicado por OrdersService:
  Pattern: 'order.created'
  Payload: { orderId, items, section, row, seat, total, createdAt }

Consumido por KitchenConsumer:
  @EventPattern('order.created')
  Acción: emitir 'new-order' por WebSocket al dashboard
```

### WebSocket Gateway

```typescript
@WebSocketGateway({ cors: true })
export class KitchenGateway {
  @WebSocketServer()
  server: Server;

  notifyNewOrder(order: any) {
    this.server.emit('new-order', order);
  }

  notifyOrderUpdate(orderId: string, status: string) {
    this.server.emit('order-update', { orderId, status });
  }
}
```

### Flujo en OrdersService

```typescript
async createOrder(dto: CreateOrderDto) {
  // 1. Guardar en PostgreSQL
  const order = this.orderRepo.create({ ...dto, status: 'pending' });
  const saved = await this.orderRepo.save(order);

  // 2. Publicar evento al broker (RabbitMQ)
  this.rmqClient.emit('order.created', {
    orderId: saved.id,
    items: saved.items,
    section: saved.section,
    row: saved.row,
    seat: saved.seat,
    total: saved.total,
    createdAt: saved.createdAt,
  });

  return saved;
}
```

### Menú Hardcodeado

```typescript
const MENU = [
  { id: 1, name: 'Hamburguesa', price: 25000, category: 'Comida' },
  { id: 2, name: 'Hot Dog', price: 15000, category: 'Comida' },
  { id: 3, name: 'Nachos', price: 18000, category: 'Comida' },
  { id: 4, name: 'Cerveza', price: 12000, category: 'Bebida' },
  { id: 5, name: 'Agua', price: 5000, category: 'Bebida' },
  { id: 6, name: 'Gaseosa', price: 8000, category: 'Bebida' },
];
// Precios en COP (pesos colombianos)
```

### Variables de Entorno

```env
# --- Desarrollo local ---
RABBITMQ_URL=amqp://localhost:5672
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/concert_orders
PORT=3000
CORS_ORIGIN=http://localhost:3001,http://localhost:3002

# --- Producción (Render + CloudAMQP + Neon) ---
# RABBITMQ_URL=amqps://user:pass@servidor.cloudamqp.com/vhost
# DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
# PORT=3000
# CORS_ORIGIN=https://concert-client.vercel.app,https://concert-kitchen.vercel.app
```

### Dependencias NPM del Backend

```json
{
  "@nestjs/common": "^10.0.0",
  "@nestjs/core": "^10.0.0",
  "@nestjs/config": "^3.0.0",
  "@nestjs/typeorm": "^10.0.0",
  "@nestjs/microservices": "^10.0.0",
  "@nestjs/websockets": "^10.0.0",
  "@nestjs/platform-socket.io": "^10.0.0",
  "typeorm": "^0.3.0",
  "pg": "^8.0.0",
  "amqplib": "^0.10.0",
  "amqp-connection-manager": "^4.0.0",
  "class-validator": "^0.14.0",
  "class-transformer": "^0.5.0",
  "socket.io": "^4.0.0"
}
```

---

## Frontends

### App Cliente (apps/client)

Mínimo viable para el demo:
1. Página de menú con los 6 items y botón "Agregar"
2. Formulario: items seleccionados + sección/fila/puesto
3. Botón "Pedir" → POST /orders
4. Confirmación con estado del pedido

NO invertir en diseño. El profe quiere ver el evento viajar, no una UI bonita.
Env var: `NEXT_PUBLIC_API_URL` = URL de Render

### Dashboard Cocina (apps/kitchen-dashboard)

Mínimo viable para el demo:
1. Conectar WebSocket (Socket.io client) al cargar
2. Escuchar 'new-order' → agregar pedido a la lista
3. Cada pedido: items, ubicación (sección-fila-puesto), hora
4. Botones "Preparando" y "Listo" → PATCH /orders/:id/status
5. Escuchar 'order-update' para actualizar estados

Env var: `NEXT_PUBLIC_API_URL` = URL de Render

---

## Deploy

### Backend → Render.com
- Conectar repo GitHub
- Build: `npm install && npm run build`
- Start: `node dist/main.js`
- Env vars: RABBITMQ_URL, DATABASE_URL, PORT, CORS_ORIGIN
- CUIDADO: Free tier duerme tras 15 min inactividad. Abrir /health antes del demo.

### Frontends → Vercel
- Conectar repo, seleccionar subdirectorio
- Env var: NEXT_PUBLIC_API_URL = URL del backend en Render

### Broker → CloudAMQP (Little Lemur free)
- 1M mensajes, 20 conexiones, 100 colas

### BD → Neon.tech (free)
- PostgreSQL serverless, 0.5 GB, autosuspend 5 min

---

## ADRs — Resumen y Mapeo al Despliegue Real

| # | ADR | Diseño (AWS) | Despliegue Real ($0) |
|---|-----|-------------|---------------------|
| 1 | Procesadores en contenedores | ECS Fargate | Render.com |
| 2 | PostgreSQL como BD principal | RDS Multi-AZ | Neon.tech |
| 3 | Multi-tenant schema compartido | tenant_id por tabla | Igual |
| 4 | API Gateway + REST | AWS API Gateway | NestJS directo |
| 5 | PWA inicial | CloudFront + S3 | Vercel |
| 6 | Pasarela de pago (Strategy) | Stripe/MercadoPago | NO implementar en demo |
| 7 | CDN para menú digital | CloudFront | Vercel CDN incluido |
| 8 | Integración boletería con cache | API externa + cache | Input manual en demo |
| 9 | WebSocket para real-time | AppSync | Socket.io |
| 10 | Dead Letter Queue | SQS DLQ | RabbitMQ DLQ nativo |
| 11 | Broker de eventos | SQS + SNS | RabbitMQ (CloudAMQP) |
| 12 | Observabilidad | X-Ray + CloudWatch | Logs Render + CloudAMQP dashboard |
| 13 | CI/CD | CodeBuild + ECR | GitHub → Render auto-deploy |
| 14 | Seguridad | WAF + Cognito + KMS | HTTPS (incluido) + JWT manual |

---

## Trade-Offs (7 principales)

1. **Elasticidad 3/5 vs Costo** — Menor que microservices (5/5) pero mucho más barato.
2. **Asíncrono vs Consistencia** — Eventualmente consistente. Mensajes no se pierden.
3. **Fargate vs Lambda** — Sin cold starts. Render free tier es similar a Fargate.
4. **RabbitMQ vs Kafka** — Sin replay pero sin overhead operacional. Volumen no justifica Kafka.
5. **PWA vs Nativa** — Sin push completas en iOS. Deploy inmediato sin App Store.
6. **BD compartida vs DB per service** — Menos aislamiento pero sin transacciones distribuidas.
7. **Evolución a microservicios** — Empezar simple, separar cuando el volumen lo justifique.

---

## Casos de Uso — Solo implementamos estos 3

- **UC-04:** Realizar pedido desde el asiento (App Cliente → API → RabbitMQ)
- **UC-06:** Recibir pedidos en tiempo real (RabbitMQ → Consumer → WebSocket → Dashboard)
- **UC-07:** Actualizar estado del pedido (Dashboard → PATCH API)

Los otros 8 casos de uso están documentados pero NO se implementan para el demo.

---

## Prioridades de Implementación

1. `docker-compose up` → verificar RabbitMQ y PostgreSQL locales
2. Backend: POST /orders → guarda en DB → publica a RabbitMQ
3. Backend: Kitchen consumer → recibe order.created → emite WebSocket
4. Frontend cliente: formulario mínimo de pedido
5. Frontend cocina: lista con WebSocket
6. Probar flujo completo local
7. Deploy a Render + Vercel + CloudAMQP + Neon
8. Verificar flujo en producción

NO hacer diseño visual ni features extra hasta que el flujo funcione end-to-end.

---

## Datos del Negocio

- Concierto: ~15,000 asistentes
- Estimación: 3,750 pedidos/evento (25% adopción)
- Ticket promedio: $20 USD (~$74,000 COP)
- Indisponibilidad: >$100,000 USD/minuto en ventas perdidas
- Infra producción: $420-$825 USD/mes (AWS)
- Break-even: 1-2 recintos con 2+ eventos/mes