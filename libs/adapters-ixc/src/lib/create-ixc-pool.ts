import { createPool, type Pool } from 'mysql2/promise';
import type { IxcDbConfig } from './mysql-erp-user-directory';

export function createIxcPool(config: IxcDbConfig): Pool {
  return createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: false,
  });
}
