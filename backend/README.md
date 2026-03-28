# Concert Orders — Backend

Sistema de pedidos en recintos de conciertos. Arquitectura EDA con 5 microservicios NestJS, RabbitMQ, PostgreSQL 15 y Redis 7.

## Prerrequisitos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 20 LTS |
| Docker Desktop | 24+ |
| make | cualquiera |

## Onboarding en 4 comandos

```bash
cd arq-software-2026-1/backend
make setup
make up && make migrate && make seed
make dev
```

## Puertos por procesador

| Procesador | Puerto | Responsabilidad |
|---|---|---|
| order-processor | 3001 | Auth, boletas, menú, creación de pedidos, admin |
| payment-processor | 3002 | Cobros Mock/MercadoPago/Stripe, webhooks |
| kitchen-processor | 3003 | Pantalla de cocina, SSE, marcar listo |
| delivery-processor | 3004 | Asignación de repartidores, confirmación de entrega |
| notification-service | 3005 | Push FCM, email fallback, SMS stub, DLQ monitor |

## Credenciales del seed

| Email | Password | Rol |
|---|---|---|
| asistente@test.com | test123 | CONSUMER |
| cocina@test.com | test123 | KITCHEN |
| repartidor@test.com | test123 | DISPATCHER |
| admin@test.com | test123 | VENUE_ADMIN |

> Para crear un `SUPER_ADMIN` usar `POST /admin/venue-admins` con un token de `SUPER_ADMIN` o insertar directamente en BD con `rol = 'SUPER_ADMIN'`.

**Boleta pre-vinculada:** `QR-ASISTENTE-001` — Zona C, Fila 8, Asiento 14

## Swagger / API Docs

- Order Processor: http://localhost:3001/api/docs
- Payment Processor: http://localhost:3002/api/docs
- Kitchen Processor: http://localhost:3003/api/docs
- Delivery Processor: http://localhost:3004/api/docs
- Notification Service: http://localhost:3005/api/docs

## Ejecutar tests

```bash
# Unitarios
make test

# E2E (requiere make dev corriendo en otra terminal)
make test:e2e
```

## Variables de entorno relevantes

| Variable | Local | Producción |
|---|---|---|
| `JWT_MODE` | `local` | `cognito` |
| `PAYMENT_PROVIDER` | `mock` | `mercadopago` \| `stripe` |
| `RABBITMQ_URL` | `amqp://user:password@localhost:5672` | URL de broker gestionado |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | Endpoint Grafana Cloud Tempo |
| `LOKI_URL` | `http://localhost:3100` | URL Grafana Cloud Loki |
| `THROTTLE_ENABLED` | `true` | `false` *(WAF filtra antes)* |
| `EMAIL_PROVIDER` | `ethereal` | `ses` \| `sendgrid` |

## Local vs Producción — capas del edge

| Capa | Local | Producción |
|---|---|---|
| **WAF** | `@nestjs/throttler` (rate limiting) | AWS WAF + Shield |
| **Auth** | JWT HS256 con `JWT_SECRET` | Amazon Cognito RS256 (JWKS) |
| **Mensajería** | RabbitMQ en Docker (`localhost:5672`) | Broker gestionado (CloudAMQP, etc.) |
| **DB** | PostgreSQL en Docker | RDS Multi-AZ |
| **Pagos** | `MockPaymentService` | MercadoPago / Stripe API |
| **Push** | Log estructurado | Firebase Cloud Messaging |
| **Email** | Nodemailer Ethereal | Amazon SES / SendGrid |
| **Métricas** | Prometheus local (`localhost:9090`) | Grafana Cloud |
| **Logs** | Console + Loki local (`localhost:3100`) | Grafana Cloud Loki |
| **Trazas** | Tempo local (`localhost:4318`) | Grafana Cloud Tempo |

## Flujo EDA (RabbitMQ)

```
POST /orders (3001)
  └─▶ exchange: concert-orders  routing: order.validated
        └─▶ payment-queue → PaymentProcessor (3002)
              └─▶ routing: payment.confirmed | payment.failed
                    └─▶ kitchen-queue → KitchenProcessor (3003)
                          └─▶ routing: order.ready
                                └─▶ delivery-queue → DeliveryProcessor (3004)
                                      └─▶ routing: order.delivered

notification-queue  → NotificationService (3005)  [suscrito a routing: #]
dlq-monitor-queue   → NotificationService (3005)  [alertas de DLQ]
```

## Observabilidad local

Levantar el stack completo de observabilidad:

```bash
make obs-up
```

| Herramienta | URL | Propósito |
|---|---|---|
| Grafana | http://localhost:3006 | Dashboards (métricas, logs, trazas) |
| Prometheus | http://localhost:9090 | Scrape de métricas `/metrics` |
| Loki | http://localhost:3100 | Agregación de logs |
| Tempo | http://localhost:3200 | Almacenamiento de trazas (OTLP en 4318) |
| RabbitMQ UI | http://localhost:15672 | Gestión de colas (user/password) |

## Roles y permisos

| Rol | Alcance | Endpoints principales |
|---|---|---|
| `CONSUMER` | Propio usuario | `POST /orders`, `GET /orders/mis-pedidos`, `POST /auth/boleta/vincular` |
| `KITCHEN` | Cocina | `GET /kitchen/pedidos`, `PUT /kitchen/pedidos/:id/listo` |
| `DISPATCHER` | Entregas | `GET /delivery/pedidos`, `PUT /delivery/pedidos/:id/entregado` |
| `VENUE_ADMIN` | Su recinto | Tiendas, productos, eventos y métricas del recinto asignado |
| `SUPER_ADMIN` | Plataforma completa | Crear recintos, crear y asignar `VENUE_ADMIN` |

### Endpoints exclusivos de SUPER_ADMIN

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/admin/recintos` | Crear un recinto |
| `GET` | `/admin/recintos` | Listar todos los recintos |
| `POST` | `/admin/venue-admins` | Crear un VENUE_ADMIN y asignarlo a un recinto |

### Endpoints de VENUE_ADMIN (scopeados a su recinto)

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/admin/tiendas` | Crear tienda en su recinto |
| `GET` | `/admin/tiendas` | Listar tiendas de su recinto |
| `GET` | `/admin/tiendas/:id/productos` | Productos de una tienda |
| `POST` | `/admin/productos` | Crear producto |
| `PUT` | `/admin/productos/:id` | Actualizar producto (incluye `imagen` URL) |
| `DELETE` | `/admin/productos/:id` | Desactivar producto (soft delete) |
| `PUT` | `/admin/eventos/:id/activar` | Activar un evento |
| `GET` | `/admin/metricas` | KPIs del recinto |

## KPIs monitoreados

| KR | Descripción | Endpoint |
|---|---|---|
| KR1 | % pedidos entregados exitosamente | `GET /admin/metricas` |
| KR2 | Tiempo promedio order→delivered (seg) | `GET /admin/metricas` |
| KR3 | % pedidos fallidos/cancelados | `GET /admin/metricas` |

Las métricas también están expuestas en formato Prometheus en `GET /metrics` de cada servicio.

## Migraciones

```bash
# Aplicar todas las migraciones pendientes
make migrate

# Desde cero (borra volúmenes Docker y vuelve a correr todo)
make reset
```

| Migración | Descripción |
|---|---|
| `001_initial_schema` | Schema completo inicial |
| `002_super_admin` | Agrega `SUPER_ADMIN` al enum y columna `recintoId` en `usuarios` |
