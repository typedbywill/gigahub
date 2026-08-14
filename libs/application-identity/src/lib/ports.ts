import type {
  Credential,
  GrantPermission,
  GrantRole,
  Role,
  Session,
  User,
} from '@gigahub/domain/identity';
import type { RoleId, SessionId, UserId } from '@gigahub/shared/kernel';
import type { PublicUserDto } from '@gigahub/shared/contracts';

export interface UserListQuery {
  q?: string;
  status?: 'active' | 'blocked' | 'all';
  erpLinked?: boolean;
  page: number;
  pageSize: number;
}

export interface UserListResult {
  items: User[];
  total: number;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: UserId): Promise<User | null>;
  findByIdErp(idErp: string): Promise<User | null>;
  findAllWithErpLink(): Promise<User[]>;
  list(query: UserListQuery): Promise<UserListResult>;
  save(user: User): Promise<void>;
}

export interface RoleRepository {
  findById(id: RoleId): Promise<Role | null>;
  findBySlug(slug: string): Promise<Role | null>;
  listActive(): Promise<Role[]>;
  save(role: Role): Promise<void>;
}

export interface GrantRepository {
  listRoleGrantsByUserId(userId: UserId): Promise<GrantRole[]>;
  listPermissionGrantsByUserId(userId: UserId): Promise<GrantPermission[]>;
  saveRoleGrant(grant: GrantRole): Promise<void>;
  savePermissionGrant(grant: GrantPermission): Promise<void>;
}

export interface ObjectStoragePort {
  uploadFile(
    bucket: string,
    key: string,
    file: Buffer,
    contentType?: string,
  ): Promise<string>;
  getFileUrl(bucket: string, key: string): Promise<string>;
  getFile(
    bucket: string,
    key: string,
  ): Promise<{ body: Buffer; contentType?: string }>;
  deleteFile(bucket: string, key: string): Promise<void>;
}

export interface CredentialRepository {
  findByUserId(userId: UserId): Promise<Credential | null>;
  save(credential: Credential): Promise<void>;
}

export interface SessionRepository {
  findById(id: SessionId): Promise<Session | null>;
  findByRefreshTokenHash(hash: string): Promise<Session | null>;
  save(session: Session): Promise<void>;
  revokeFamily(familyId: string, at: Date): Promise<void>;
  revokeAllForUser(userId: UserId, at: Date): Promise<void>;
}

export interface ErpCollaborator {
  idErp: string;
  idErpEmployee: string;
  email: string;
  name: string;
  active: boolean;
  jobTitle?: string;
  cashboxId?: string;
  warehouseId?: string;
  planningId?: string;
}

/** Directory + auth against IXC (usuarios). Password uses SHA-256 hex like the ERP. */
export interface ErpUserDirectory {
  listCollaborators(): Promise<ErpCollaborator[]>;
  verifyPassword(email: string, plaintext: string): Promise<boolean>;
  updatePassword(idErp: string, plaintext: string): Promise<void>;
  setCollaboratorActive(idErp: string, active: boolean): Promise<void>;
}

export interface PasswordHasher {
  hash(plaintext: string): Promise<string>;
  verify(plaintext: string, passwordHash: string): Promise<boolean>;
}

export interface TokenIssuer {
  issueAccessToken(input: {
    userId: UserId;
    sessionId: SessionId;
    email: string;
  }): Promise<string>;
}

export interface RefreshTokenService {
  generate(): string;
  hash(token: string): string;
}

export interface IdGenerator {
  generate(): string;
}

export interface Clock {
  now(): Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: PublicUserDto;
}

export class ApplicationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export const ApplicationErrorCodes = {
  InvalidCredentials: 'INVALID_CREDENTIALS',
  InvalidRefreshToken: 'INVALID_REFRESH_TOKEN',
  RefreshTokenReuse: 'REFRESH_TOKEN_REUSE',
  WeakPassword: 'WEAK_PASSWORD',
  Unauthorized: 'UNAUTHORIZED',
  PermissionDenied: 'PERMISSION_DENIED',
  ErpUnavailable: 'ERP_UNAVAILABLE',
  NotFound: 'NOT_FOUND',
  Conflict: 'CONFLICT',
  ValidationError: 'VALIDATION_ERROR',
} as const;
