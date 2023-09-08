import * as mongoose from 'mongoose';
import { PROVIDER_NAME } from '../ts/enums/common';

export const databaseProviders = [
  {
    provide: PROVIDER_NAME.DATABASE_CONNECTION,
    useFactory: (): Promise<typeof mongoose> => {
      const DB_CONNECT_LINK =
        process.env.NODE_ENV === 'production'
          ? process.env.DB_CONNECT_LINK_PROD
          : process.env.DB_CONNECT_LINK_DEV;

      return mongoose.connect(DB_CONNECT_LINK);
    },
  },
];
