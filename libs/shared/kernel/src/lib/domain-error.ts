export class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export const DomainErrorCodes = {
  InvalidId: 'INVALID_ID',
  InvalidGeoPoint: 'INVALID_GEO_POINT',
  InvalidStatusTransition: 'INVALID_STATUS_TRANSITION',
  InvariantViolation: 'INVARIANT_VIOLATION',
  CustomerNotOperable: 'CUSTOMER_NOT_OPERABLE',
  InboxInactive: 'INBOX_INACTIVE',
  TicketNotAssignable: 'TICKET_NOT_ASSIGNABLE',
  UserCannotAuthenticate: 'USER_CANNOT_AUTHENTICATE',
  WeakPassword: 'WEAK_PASSWORD',
  SessionNotUsable: 'SESSION_NOT_USABLE',
  RefreshTokenReuse: 'REFRESH_TOKEN_REUSE',
  UnknownPermission: 'UNKNOWN_PERMISSION',
  RoleNotAssignable: 'ROLE_NOT_ASSIGNABLE',
  GrantNotActive: 'GRANT_NOT_ACTIVE',
  GrantReasonRequired: 'GRANT_REASON_REQUIRED',
  PermissionDenied: 'PERMISSION_DENIED',
} as const;

export type DomainErrorCode =
  (typeof DomainErrorCodes)[keyof typeof DomainErrorCodes];
