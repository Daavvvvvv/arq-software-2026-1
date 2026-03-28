import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { AmqplibInstrumentation } from '@opentelemetry/instrumentation-amqplib';

let sdk: NodeSDK | null = null;

/**
 * Must be called as a side-effect BEFORE NestJS bootstrap.
 * Import via `import './instrument'` as the first line of main.ts.
 */
export function initTracing(serviceName: string): void {
  if (sdk) return;

  const otlpBase = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

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
