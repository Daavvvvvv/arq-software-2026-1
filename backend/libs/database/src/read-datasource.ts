import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

const databaseUrl = process.env.DATABASE_READ_URL ?? process.env.DATABASE_URL;

const connectionOptions = databaseUrl
  ? {
      url: databaseUrl,
      ssl: databaseUrl.includes('neon.tech') || databaseUrl.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : undefined,
    }
  : {
      host: process.env.DB_READ_HOST ?? process.env.DB_WRITE_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      database: process.env.DB_NAME ?? 'concert_orders',
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASS ?? 'postgres',
    };

export const readDatasource = new DataSource({
  type: 'postgres',
  ...connectionOptions,
  entities: [join(__dirname, '../../domain/src/entities/*.entity.{ts,js}')],
  synchronize: false,
  logging: false,
});
