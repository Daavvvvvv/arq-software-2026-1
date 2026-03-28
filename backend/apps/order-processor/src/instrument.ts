// Must be the first import in main.ts — OTel patches modules at load time
import { initTracing } from '@concert/telemetry';
initTracing(process.env.SERVICE_NAME ?? 'order-processor');
