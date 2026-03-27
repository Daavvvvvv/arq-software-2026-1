# Concert Orders — Backend

Sistema de pedidos en recintos de conciertos. Arquitectura EDA con 5 microservicios NestJS, SNS/SQS (LocalStack en local), PostgreSQL 15 y Redis 7.

## Prerrequisitos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 20 LTS |
| Docker Desktop | 24+ |
| make | cualquiera |
| AWS CLI | 2.x (para `make queues`) |

## Onboarding en 4 comandos

```bash
cd arq-software-2026-1/backend
make setup
make up && make queues && make migrate && make seed
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
| `AWS_ENDPOINT` | `http://localhost:4566` | *(vacío — usa IAM Role)* |
| `PAYMENT_PROVIDER` | `mock` | `mercadopago` \| `stripe` |
| `THROTTLE_ENABLED` | `true` | `false` *(WAF filtra antes)* |
| `CDN_BASE_URL` | `http://localhost:3001/public` | URL de CloudFront |
| `EMAIL_PROVIDER` | `ethereal` | `ses` \| `sendgrid` |

## Local vs Producción — capas del edge

| Capa | Local | Producción |
|---|---|---|
| **WAF** | `@nestjs/throttler` (rate limiting) | AWS WAF + Shield |
| **CDN** | Express sirve `/public` | Amazon CloudFront |
| **Auth** | JWT HS256 con `JWT_SECRET` | Amazon Cognito RS256 (JWKS) |
| **API Gateway** | NestJS actúa como gateway | Amazon API Gateway |
| **Mensajería** | LocalStack en `localhost:4566` | Amazon SQS + SNS |
| **DB** | PostgreSQL en Docker | RDS Multi-AZ |
| **Pagos** | `MockPaymentService` | MercadoPago / Stripe API |
| **Push** | Log estructurado | Firebase Cloud Messaging |
| **Email** | Nodemailer Ethereal | Amazon SES / SendGrid |

## Flujo EDA

```
POST /orders (3001)
  └─▶ SNS: order-events
        └─▶ SQS: payment-queue
              └─▶ PaymentProcessor (3002) → SNS: payment-events
                    └─▶ SQS: kitchen-queue
                          └─▶ KitchenProcessor (3003) → SNS: kitchen-events
                                └─▶ SQS: delivery-queue
                                      └─▶ DeliveryProcessor (3004) → SNS: delivery-events

Todos los SNS topics → notification-queue → NotificationService (3005)
Todas las DLQs       → dlq-monitor-queue  → NotificationService (DLQ_ALERT)
```

## KPIs monitoreados

| KR | Descripción | Endpoint |
|---|---|---|
| KR1 | % pedidos entregados exitosamente | `GET /admin/metricas` |
| KR2 | Tiempo promedio order→delivered (seg) | `GET /admin/metricas` |
| KR3 | % pedidos en DLQ (fallidos) | `GET /health/metrics` |
