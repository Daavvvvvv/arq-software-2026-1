import * as process from 'process';
import * as fs from 'fs';
import * as path from 'path';

// Only initialize tracing in production
if (process.env.NODE_ENV === 'production') {
  try {
    const { NodeSDK } = require('@opentelemetry/sdk-node');
    const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
    const { Resource } = require('@opentelemetry/resources');
    const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

    const sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'concert-orders-unified',
        [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'concert',
      }),
      traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
      }),
      instrumentations: [getNodeAutoInstrumentations()],
    });

    sdk.start();
    console.log('[Instrument] OpenTelemetry initialized for production');

    process.on('SIGTERM', () => {
      sdk
        .shutdown()
        .then(
          () => console.log('[Instrument] OpenTelemetry shutdown complete'),
          (err) => console.error('[Instrument] Error shutting down OpenTelemetry', err),
        )
        .finally(() => process.exit(0));
    });
  } catch (err) {
    // Gracefully handle missing optional dependencies
    console.warn('[Instrument] OpenTelemetry initialization skipped — dependencies not available');
  }
}

// For development, use console logging via @concert/telemetry
