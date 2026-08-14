export {
  ApplicationError,
  ApplicationErrorCodes,
  REMOTE_ACCESS_PORTS,
  REMOTE_ACCESS_TIMEOUT_MS,
  type CustomerSearchHitReadModel,
  type PaginatedReadModel,
  type CustomerContractReadModel,
  type CustomerLoginReadModel,
  type CustomerFibraReadModel,
  type CustomerFibraHistoricoReadModel,
  type CustomerFaturaReadModel,
  type CustomerComodatoReadModel,
  type CustomerSnapshotBundle,
  type CustomerSearchQuery,
  type CustomerRegistrationQuery,
  type CustomerConsultationQuery,
  type CustomerSignalReaderPort,
  type CustomerRemoteAccessPort,
  type CustomerConsultationCommand,
  type CustomerContractsQueryParams,
  type CustomerLoginsQueryParams,
  type CustomerFibraHistoricoQueryParams,
  type CustomerFaturasQueryParams,
  type CustomerComodatosQueryParams,
} from './lib/ports';
export {
  SearchCustomersUseCase,
  type SearchCustomersQuery,
} from './lib/search-customers.use-case';
export { GetCustomerConsultationUseCase } from './lib/get-customer-consultation.use-case';
export { toCustomerDto, toCustomerSearchHitDto } from './lib/mappers';
