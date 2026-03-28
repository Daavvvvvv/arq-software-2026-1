# API Reference — Concert Orders Backend

Base URLs:

| Servicio | URL |
|---|---|
| Order Processor | `http://localhost:3001` |
| Payment Processor | `http://localhost:3002` |
| Kitchen Processor | `http://localhost:3003` |
| Delivery Processor | `http://localhost:3004` |

> Todos los endpoints protegidos requieren el header:
> `Authorization: Bearer <accessToken>`

---

## 1. Autenticación

### POST `/auth/login`

Autentica un usuario y devuelve tokens JWT.

**No requiere autenticación.**

**Request:**
```json
{
  "email": "asistente@test.com",
  "password": "test123"
}
```

**Response `200`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Usuarios disponibles en seed:**

| Email | Password | Rol |
|---|---|---|
| asistente@test.com | test123 | CONSUMER |
| cocina@test.com | test123 | KITCHEN |
| repartidor@test.com | test123 | DISPATCHER |
| admin@test.com | test123 | VENUE_ADMIN |

---

### POST `/auth/refresh`

Renueva el access token.

**Requiere:** JWT válido en el header.

**Response `200`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 2. Boletas

### POST `/boletas/vincular`

Vincula una boleta (código QR) al usuario autenticado.

**Rol requerido:** `CONSUMER`

**Request:**
```json
{
  "codigoQR": "QR-ASISTENTE-001"
}
```

**Response `200`:**
```json
{
  "id": "b3f1e2d4-...",
  "codigoQR": "QR-ASISTENTE-001",
  "zona": "C",
  "fila": "8",
  "asiento": "14",
  "vinculada": true,
  "usuarioId": "a1b2c3d4-...",
  "eventoId": "e5f6g7h8-...",
  "createdAt": "2026-03-27T20:00:00.000Z",
  "updatedAt": "2026-03-27T20:00:01.000Z"
}
```

**Errores:**
```json
// 404 — boleta no existe
{ "statusCode": 404, "message": "Boleta no encontrada" }

// 400 — ya vinculada a otro usuario
{ "statusCode": 400, "message": "Boleta ya vinculada a otro usuario" }
```

---

### GET `/boletas/mis-boletas`

Lista todas las boletas vinculadas del usuario autenticado.

**Rol requerido:** `CONSUMER`

**Response `200`:**
```json
[
  {
    "id": "b3f1e2d4-...",
    "codigoQR": "QR-ASISTENTE-001",
    "zona": "C",
    "fila": "8",
    "asiento": "14",
    "vinculada": true,
    "evento": {
      "id": "e5f6g7h8-...",
      "nombre": "Bad Bunny - Tour Mañana Será Bonito",
      "artista": "Bad Bunny",
      "fecha": "2026-06-15T20:00:00.000Z",
      "activo": true
    }
  }
]
```

---

## 3. Tiendas y Menú

### GET `/tiendas`

Lista todas las tiendas activas del recinto.

**Requiere:** JWT válido.

**Response `200`:**
```json
[
  {
    "id": "t1a2b3c4-...",
    "nombre": "Cocina Sector C",
    "zona": "C",
    "activa": true,
    "recintoId": "r9s8t7u6-..."
  }
]
```

---

### GET `/tiendas/:id/menu`

Lista los productos disponibles de una tienda.

**Requiere:** JWT válido.

**Response `200`:**
```json
[
  {
    "id": "p1q2r3s4-...",
    "nombre": "Hamburguesa Clásica",
    "precio": "25000.00",
    "stock": 100,
    "disponible": true,
    "descripcion": null,
    "imagen": null,
    "tiendaId": "t1a2b3c4-..."
  },
  {
    "id": "p5q6r7s8-...",
    "nombre": "Nachos con Guac",
    "precio": "18000.00",
    "stock": 100,
    "disponible": true
  },
  {
    "id": "p9q0r1s2-...",
    "nombre": "Pizza Personal",
    "precio": "22000.00",
    "stock": 100,
    "disponible": true
  },
  {
    "id": "p3q4r5s6-...",
    "nombre": "Cerveza Pilsen",
    "precio": "10000.00",
    "stock": 200,
    "disponible": true
  }
]
```

---

## 4. Pedidos

### POST `/orders`

Crea un nuevo pedido. Dispara el flujo EDA completo:
`order.validated` → pago → cocina → entrega → notificación.

**Rol requerido:** `CONSUMER`
**Requisito previo:** el usuario debe tener una boleta vinculada.

**Request:**
```json
{
  "items": [
    { "productoId": "p1q2r3s4-...", "cantidad": 2 },
    { "productoId": "p3q4r5s6-...", "cantidad": 3 }
  ],
  "zona": "C",
  "fila": "8",
  "asiento": "14"
}
```

**Response `202`:**
```json
{
  "numeroPedido": "PED-1743120000000",
  "estado": "VALIDADO"
}
```

**Errores:**
```json
// 400 — sin boleta vinculada
{ "statusCode": 400, "message": "No tienes una boleta vinculada" }

// 400 — stock insuficiente
{ "statusCode": 400, "message": "Stock insuficiente para Hamburguesa Clásica" }

// 404 — producto no disponible
{ "statusCode": 404, "message": "Producto p1q2r3s4-... no disponible" }
```

---

### GET `/orders/:id`

Consulta el estado completo de un pedido.

**Requiere:** JWT válido.

**Response `200`:**
```json
{
  "id": "o1r2d3e4-...",
  "numeroPedido": "PED-1743120000000",
  "estado": "EN_PREPARACION",
  "total": "50000.00",
  "zona": "C",
  "fila": "8",
  "asiento": "14",
  "correlationId": "c1o2r3r4-...",
  "createdAt": "2026-03-27T20:00:00.000Z",
  "updatedAt": "2026-03-27T20:00:05.000Z",
  "items": [
    {
      "id": "i1t2e3m4-...",
      "cantidad": 2,
      "precioUnitario": "25000.00",
      "productoId": "p1q2r3s4-...",
      "producto": {
        "nombre": "Hamburguesa Clásica",
        "precio": "25000.00"
      }
    }
  ],
  "pago": {
    "id": "pa1g2o3-...",
    "estado": "CONFIRMADO",
    "referencia": "mock-ref-abc123",
    "proveedor": "mock",
    "monto": "50000.00"
  },
  "entrega": null
}
```

**Estados posibles del pedido:**

| Estado | Descripción |
|---|---|
| `PENDIENTE` | Pedido recién creado |
| `VALIDADO` | Validado, publicado a SNS |
| `PAGADO` | Pago confirmado |
| `EN_PREPARACION` | Cocina lo está preparando |
| `LISTO` | Listo para despacho |
| `EN_ENTREGA` | Repartidor asignado, en camino |
| `ENTREGADO` | Entregado al cliente |
| `CANCELADO` | Cancelado por cocina |

---

### GET `/orders/mis-pedidos`

Lista los últimos 10 pedidos del usuario autenticado.

**Rol requerido:** `CONSUMER`

**Response `200`:**
```json
[
  {
    "id": "o1r2d3e4-...",
    "numeroPedido": "PED-1743120000000",
    "estado": "ENTREGADO",
    "total": "50000.00",
    "zona": "C",
    "fila": "8",
    "asiento": "14",
    "createdAt": "2026-03-27T20:00:00.000Z",
    "items": [
      {
        "cantidad": 2,
        "precioUnitario": "25000.00",
        "productoId": "p1q2r3s4-..."
      }
    ]
  }
]
```

---

## 5. Admin

> Todos los endpoints de esta sección requieren rol `VENUE_ADMIN`.
> Credencial: `admin@test.com` / `test123`

### POST `/admin/productos`

Crea un nuevo producto en una tienda.

**Request:**
```json
{
  "nombre": "Perro Caliente",
  "precio": 12000,
  "stock": 50,
  "tiendaId": "t1a2b3c4-...",
  "descripcion": "Con papas fritas"
}
```

**Response `201`:**
```json
{
  "id": "p7q8r9s0-...",
  "nombre": "Perro Caliente",
  "precio": "12000.00",
  "stock": 50,
  "disponible": true,
  "descripcion": "Con papas fritas",
  "tiendaId": "t1a2b3c4-...",
  "createdAt": "2026-03-27T20:00:00.000Z"
}
```

---

### PUT `/admin/productos/:id`

Actualiza un producto existente.

**Request:**
```json
{
  "nombre": "Perro Caliente Especial",
  "precio": 14000,
  "stock": 30,
  "tiendaId": "t1a2b3c4-..."
}
```

**Response `200`:** objeto producto actualizado.

---

### DELETE `/admin/productos/:id`

Desactiva un producto (no lo elimina físicamente).

**Response `200`:** `{}`

---

### PUT `/admin/eventos/:id/activar`

Activa un evento para que acepte pedidos.

**Response `200`:**
```json
{
  "id": "e5f6g7h8-...",
  "nombre": "Bad Bunny - Tour Mañana Será Bonito",
  "activo": true
}
```

---

### GET `/admin/metricas`

Retorna los KPIs del sistema.

**Response `200`:**
```json
{
  "kr1_adopcion_pct": 85,
  "kr2_tiempo_promedio_seg": 42,
  "kr3_fallidos_pct": 2,
  "pedidos_por_minuto": [],
  "top_productos": []
}
```

| KR | Descripción |
|---|---|
| `kr1_adopcion_pct` | % de pedidos que llegaron a ENTREGADO |
| `kr2_tiempo_promedio_seg` | Tiempo promedio order → entrega en segundos |
| `kr3_fallidos_pct` | % de pedidos cancelados/fallidos |

---

### GET `/health/metrics`

Métricas del sistema en texto plano.

**No requiere autenticación.**

**Response `200`:**
```
KR1_adopcion_pct=85
KR2_tiempo_promedio_seg=42
KR3_fallidos_pct=2
```

---

## 6. Webhooks de Pago

> `localhost:3002`

### POST `/webhook/mp`

Recibe notificaciones de pago de MercadoPago.

**Header requerido:** `x-signature: ts=<timestamp>,v1=<hmac-sha256>`

**Request:**
```json
{
  "type": "payment",
  "action": "payment.updated"
}
```

**Response `200`:**
```json
{ "received": true }
```

**Error `401`:** firma inválida o timestamp mayor a 5 minutos.

---

### POST `/webhook/stripe`

Recibe eventos de Stripe. Requiere el body **sin parsear** para validar la firma.

**Header requerido:** `stripe-signature: t=<timestamp>,v1=<hmac>`

**Request:** payload raw del evento Stripe, por ejemplo:
```json
{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_abc123",
      "metadata": { "pedidoId": "o1r2d3e4-..." }
    }
  }
}
```

**Response `200`:**
```json
{ "received": true }
```

**Error `401`:** firma inválida.

---

## 7. Cocina

> `localhost:3003` — Rol requerido: `KITCHEN`
> Credencial: `cocina@test.com` / `test123`

### GET `/cocina/pedidos`

Lista todos los pedidos actualmente en preparación.

**Response `200`:**
```json
[
  {
    "id": "o1r2d3e4-...",
    "numeroPedido": "PED-1743120000000",
    "estado": "EN_PREPARACION",
    "zona": "C",
    "fila": "8",
    "asiento": "14",
    "createdAt": "2026-03-27T20:00:00.000Z",
    "items": [
      {
        "cantidad": 2,
        "precioUnitario": "25000.00",
        "producto": { "nombre": "Hamburguesa Clásica" }
      }
    ]
  }
]
```

---

### GET `/cocina/pedidos/stream`

Stream SSE (Server-Sent Events) con actualizaciones en tiempo real.

**Header de respuesta:** `Content-Type: text/event-stream`

**Eventos recibidos:**
```
data: {"pedidoId":"o1r2d3e4-...","estado":"EN_PREPARACION","numeroPedido":"PED-1743120000000"}

data: {"pedidoId":"o1r2d3e4-...","estado":"LISTO","numeroPedido":"PED-1743120000000"}
```

---

### PATCH `/cocina/pedidos/:id/listo`

Marca el pedido como listo. Dispara asignación de repartidor.

**Response `200`:** `{}`

---

### PATCH `/cocina/pedidos/:id/cancelar`

Cancela el pedido.

**Response `200`:** `{}`

---

## 8. Repartidor

> `localhost:3004` — Rol requerido: `DISPATCHER`
> Credencial: `repartidor@test.com` / `test123`

### GET `/repartidor/pedidos`

Lista los pedidos en entrega con el repartidor asignado.

**Response `200`:**
```json
[
  {
    "id": "o1r2d3e4-...",
    "numeroPedido": "PED-1743120000000",
    "estado": "EN_ENTREGA",
    "zona": "C",
    "fila": "8",
    "asiento": "14",
    "entrega": {
      "id": "en1t2r3-...",
      "estado": "ASIGNADO",
      "repartidor": {
        "nombre": "Carlos",
        "zona": "C"
      }
    }
  }
]
```

---

### PATCH `/repartidor/pedidos/:id/entregar`

Confirma la entrega del pedido. Calcula el tiempo total (KR2).

**Response `200`:** `{}`

> Internamente actualiza `tiempoTotal` en segundos desde la creación del pedido hasta este momento, libera al repartidor y publica `order.delivered` al topic SNS.

---

## Flujo completo de un pedido

```
1. POST /auth/login                  → obtiene token
2. POST /boletas/vincular            → vincula QR al usuario
3. GET  /tiendas                     → obtiene tiendaId
4. GET  /tiendas/:id/menu            → obtiene productoId
5. POST /orders                      → crea pedido → SNS dispara flujo
   ...procesamiento automático EDA...
6. GET  /orders/:id                  → polling del estado
7. PATCH /cocina/pedidos/:id/listo   → cocina marca listo (token KITCHEN)
8. PATCH /repartidor/pedidos/:id/entregar → repartidor entrega (token DISPATCHER)
9. GET  /orders/:id                  → estado final: ENTREGADO
```
