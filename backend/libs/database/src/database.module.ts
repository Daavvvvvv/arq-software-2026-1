import { Module, Global, OnApplicationBootstrap } from '@nestjs/common';
import { writeDatasource } from './write-datasource';
import { readDatasource } from './read-datasource';

export const WRITE_DATA_SOURCE = 'WRITE_DATA_SOURCE';
export const READ_DATA_SOURCE = 'READ_DATA_SOURCE';

@Global()
@Module({
  providers: [
    {
      provide: WRITE_DATA_SOURCE,
      useFactory: async () => {
        if (!writeDatasource.isInitialized) {
          await writeDatasource.initialize();
        }
        return writeDatasource;
      },
    },
    {
      provide: READ_DATA_SOURCE,
      useFactory: async () => {
        if (!readDatasource.isInitialized) {
          await readDatasource.initialize();
        }
        return readDatasource;
      },
    },
  ],
  exports: [WRITE_DATA_SOURCE, READ_DATA_SOURCE],
})
export class DatabaseModule {}
