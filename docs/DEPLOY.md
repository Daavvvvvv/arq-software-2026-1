# Deploy a Produccion

## 1. Base de Datos: Neon.tech

1. Ir a https://neon.tech y crear cuenta (GitHub login)
2. Crear proyecto: "concert-orders"
3. Copiar el **Connection string** (formato: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`)
4. Ejecutar migraciones desde tu maquina local:
   ```bash
   cd backend
   DATABASE_URL="tu-connection-string" npm run migrate
   DATABASE_URL="tu-connection-string" npm run seed
   ```

## 2. RabbitMQ: CloudAMQP

1. Ir a https://www.cloudamqp.com y crear cuenta
2. Crear instancia: plan **Little Lemur (Free)**
3. Copiar la **AMQP URL** (formato: `amqps://user:pass@host.cloudamqp.com/vhost`)

## 3. Backend: Render.com

### Opcion A: Deploy con render.yaml (recomendado)
1. Ir a https://render.com y crear cuenta (GitHub login)
2. Click "New" > "Blueprint"
3. Conectar el repo de GitHub
4. Render detecta el `render.yaml` y crea el servicio
5. Configurar las env vars manuales:
   - `DATABASE_URL` = URL de Neon.tech
   - `RABBITMQ_URL` = URL de CloudAMQP
   - `CORS_ORIGIN` = `https://tu-app.vercel.app,https://tu-kitchen.vercel.app`

### Opcion B: Deploy manual
1. "New" > "Web Service"
2. Conectar repo, branch `main`
3. Root directory: `backend`
4. Runtime: Docker
5. Plan: Free
6. Env vars: DATABASE_URL, RABBITMQ_URL, JWT_SECRET, PAYMENT_PROVIDER=mock, CORS_ORIGIN, NODE_ENV=production, PORT=3000

### Health Check
El endpoint `/health` mantiene el servicio activo en Render.

**NOTA:** Free tier duerme despues de 15 min de inactividad. Primer request tarda ~30s.

## 4. Frontend: Vercel

### App Cliente
1. Ir a https://vercel.com y crear cuenta (GitHub login)
2. "Add New" > "Project"
3. Importar el repo
4. Framework: Vite
5. Root Directory: `.` (raiz del proyecto)
6. Environment Variables:
   - `VITE_API_URL` = `https://concert-orders-api.onrender.com`
7. Deploy

## 5. Verificacion

1. `https://<render-url>/health` → `{ "status": "ok" }`
2. `https://<render-url>/api/docs` → Swagger UI
3. Frontend en Vercel carga el menu
4. Crear pedido, verificar flujo

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
