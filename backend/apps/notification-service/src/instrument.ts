import { initTracing } from '@concert/telemetry';
initTracing(process.env.SERVICE_NAME ?? 'notification-service');
