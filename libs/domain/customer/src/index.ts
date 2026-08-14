export {
  Customer,
  CUSTOMER_STATUSES,
  type CustomerStatus,
  type CustomerAddress,
  type CustomerSnapshot,
  type CreateCustomerInput,
} from './lib/customer';
export {
  mapIxcCustomerStatus,
  type IxcCustomerAtivo,
  type IxcCustomerStatusInternet,
} from './lib/map-ixc-customer-status';
export {
  DEFAULT_CUSTOMER_SEARCH_LIMIT,
  MAX_CUSTOMER_SEARCH_LIMIT,
  MIN_CUSTOMER_SEARCH_LENGTH,
  assertCustomerSearchParams,
  type CustomerSearchParams,
} from './lib/customer-search';
