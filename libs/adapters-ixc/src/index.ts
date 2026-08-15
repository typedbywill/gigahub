export { hashIxcPassword, formatIxcName } from './lib/ixc-password';
export {
  MysqlErpUserDirectory,
  IXC_USER_STATUS_ACTIVE,
  IXC_USER_STATUS_INACTIVE,
  type IxcDbConfig,
} from './lib/mysql-erp-user-directory';
export { createIxcPool } from './lib/create-ixc-pool';
export { MysqlFiberAccessTerminalNearbyQuery } from './lib/mysql-fiber-access-terminal-nearby-query';
export {
  MysqlFiberCableNearbyQuery,
  IXC_FIBER_CABLE_ELEMENT_TIPO,
} from './lib/mysql-fiber-cable-nearby-query';
export { MysqlProjectNetworkSearchQuery } from './lib/mysql-project-network-search-query';
export { MysqlCtoSplittingDiagramQuery } from './lib/mysql-cto-splitting-diagram-query';
export { MysqlCustomerSearchQuery } from './lib/mysql-customer-search-query';

export { MysqlCustomerQueryAdapter } from './lib/mysql-customer-query.adapter';
export { MysqlWorkOrderQueryAdapter } from './lib/mysql-work-order-query.adapter';
export { MysqlWorkOrderCommandAdapter } from './lib/mysql-work-order-command.adapter';
export { TcpCustomerRemoteAccessAdapter } from './lib/tcp-customer-remote-access.adapter';
export { NullCustomerSignalReaderAdapter } from './lib/null-customer-signal-reader.adapter';
export {
  mapIxcCustomerRow,
  customerSearchHitFromRow,
  parseCustomerIdErp,
  type IxcCustomerRow,
} from './lib/ixc-customer-mapper';
