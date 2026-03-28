import * as winston from 'winston';
import { utilities as nestWinstonUtilities, WinstonModuleOptions } from 'nest-winston';

export function createWinstonOptions(serviceName: string): WinstonModuleOptions {
  const isProduction = process.env.NODE_ENV === 'production';

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: isProduction
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          )
        : winston.format.combine(
            winston.format.timestamp(),
            nestWinstonUtilities.format.nestLike(serviceName, {
              colors: true,
              prettyPrint: true,
            }),
          ),
    }),
  ];

  const lokiUrl = process.env.LOKI_URL;
  if (lokiUrl) {
    // Dynamic import to avoid startup errors when winston-loki is not installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const LokiTransport = require('winston-loki') as new (opts: Record<string, unknown>) => winston.transport;
    transports.push(
      new LokiTransport({
        host: lokiUrl,
        basicAuth:
          process.env.LOKI_USER && process.env.LOKI_TOKEN
            ? `${process.env.LOKI_USER}:${process.env.LOKI_TOKEN}`
            : undefined,
        labels: {
          app: serviceName,
          env: process.env.NODE_ENV ?? 'development',
        },
        json: true,
        batching: true,
        interval: 5,
        onConnectionError: (err: Error) =>
          console.error(`[Loki] connection error: ${err.message}`),
      }),
    );
  }

  return {
    level: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
    transports,
  };
}
