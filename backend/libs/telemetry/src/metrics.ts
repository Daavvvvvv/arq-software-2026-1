import { Registry, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

export const register = new Registry();

collectDefaultMetrics({ register, prefix: 'concert_node_' });

export const ordersCreatedTotal = new Counter({
  name: 'concert_orders_created_total',
  help: 'Total number of orders created',
  registers: [register],
});

export const ordersDeliveredTotal = new Counter({
  name: 'concert_orders_delivered_total',
  help: 'Total number of orders delivered',
  registers: [register],
});

export const ordersCancelledTotal = new Counter({
  name: 'concert_orders_cancelled_total',
  help: 'Total number of orders cancelled',
  registers: [register],
});

export const orderDeliveryDurationSeconds = new Histogram({
  name: 'concert_order_delivery_duration_seconds',
  help: 'Duration from order creation to delivery in seconds',
  buckets: [10, 30, 60, 120, 300, 600],
  registers: [register],
});

export const ordersInFlight = new Gauge({
  name: 'concert_orders_in_flight',
  help: 'Number of orders currently in the processing pipeline',
  registers: [register],
});

export const eventsPublishedTotal = new Counter({
  name: 'concert_events_published_total',
  help: 'Total RabbitMQ events published',
  labelNames: ['routing_key'] as const,
  registers: [register],
});

export const eventsConsumedTotal = new Counter({
  name: 'concert_events_consumed_total',
  help: 'Total RabbitMQ events consumed',
  labelNames: ['routing_key', 'status'] as const,
  registers: [register],
});
