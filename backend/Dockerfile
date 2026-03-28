# ── Stage 1: Install all dependencies ──────────────────────
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
RUN npm ci

# ── Stage 2: Build TypeScript ─────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY package.json package-lock.json tsconfig.json ./
COPY apps/ apps/
COPY libs/ libs/
COPY migrations/ migrations/
COPY scripts/ scripts/
RUN npx tsc -p apps/unified/tsconfig.json && npx tsc-alias -p apps/unified/tsconfig.json

# ── Stage 3: Production image ─────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
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

# Copy compiled JS from build stage
COPY --from=build /app/apps/unified/dist dist

EXPOSE 3000
CMD ["node", "dist/apps/unified/src/main.js"]
