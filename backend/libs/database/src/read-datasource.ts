import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

export const readDatasource = new DataSource({
  type: 'postgres',
  host: process.env.DB_READ_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  database: process.env.DB_NAME ?? 'concert_orders',
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  entities: [join(__dirname, '../../domain/src/entities/*.entity.{ts,js}')],
  synchronize: false,
  logging: false,
});
