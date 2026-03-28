import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { writeDatasource } from '../libs/database/src/write-datasource';
import { InitialSchema1700000000001 } from './001_initial_schema';
import { SuperAdmin1700000000002 } from './002_super_admin';

async function runMigrations(): Promise<void> {
  // Register migrations manually
  writeDatasource.setOptions({
    migrations: [InitialSchema1700000000001, SuperAdmin1700000000002],
  });

  await writeDatasource.initialize();
  await writeDatasource.runMigrations();
  console.log('✅ Migrations complete');
  await writeDatasource.destroy();
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
