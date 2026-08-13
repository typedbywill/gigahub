export type { HealthServiceStatus, HealthCheckResponse } from './lib/health';
export type { ApiErrorEnvelope } from './lib/errors';
export type {
  UserStub,
  PublicUserDto,
  LoginRequestDto,
  LoginResponseDto,
  RenewTokenResponseDto,
} from './lib/identity';
export {
  userStatusSchema,
  publicUserDtoSchema,
  loginRequestDtoSchema,
  loginResponseDtoSchema,
  renewTokenResponseDtoSchema,
} from './lib/identity';
export {
  geoPointDtoSchema,
  customerStatusSchema,
  customerAddressDtoSchema,
  customerDtoSchema,
  type GeoPointDto,
  type CustomerDto,
} from './lib/customer';
export {
  workOrderStatusSchema,
  workOrderDtoSchema,
  subjectDtoSchema,
  type WorkOrderDto,
  type SubjectDto,
} from './lib/work-order';
export {
  careChannelSchema,
  careTicketStatusSchema,
  careInboxDtoSchema,
  careTicketDtoSchema,
  type CareInboxDto,
  type CareTicketDto,
} from './lib/care-inbox';
export {
  DomainEventTypes,
  type DomainEventActor,
  type DomainEventEnvelope,
  type DomainEventType,
  type WorkOrderEventPayload,
  type CareTicketEventPayload,
} from './lib/events';
