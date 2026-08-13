import {
  type SessionId,
  type UserId,
  DomainError,
  DomainErrorCodes,
  assertNonEmpty,
  sessionId,
  userId,
} from '@gigahub/shared/kernel';
import { SESSION_ABSOLUTE_TTL_MS } from './policies';

export interface SessionSnapshot {
  id: SessionId;
  userId: UserId;
  familyId: string;
  refreshTokenHash: string;
  previousRefreshTokenHash?: string;
  deviceLabel?: string;
  absoluteExpiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateSessionInput = {
  id: string;
  userId: string;
  familyId: string;
  refreshTokenHash: string;
  previousRefreshTokenHash?: string;
  deviceLabel?: string;
  absoluteExpiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

export type RotateRefreshResult =
  | { kind: 'rotated' }
  | { kind: 'reuse' };

export class Session {
  private constructor(private props: SessionSnapshot) {}

  static create(input: CreateSessionInput): Session {
    const now = input.createdAt ?? new Date();
    return Session.fromSnapshot({
      id: sessionId(input.id),
      userId: userId(input.userId),
      familyId: assertNonEmpty(input.familyId, 'familyId'),
      refreshTokenHash: assertNonEmpty(
        input.refreshTokenHash,
        'refreshTokenHash',
      ),
      previousRefreshTokenHash: input.previousRefreshTokenHash
        ? assertNonEmpty(
            input.previousRefreshTokenHash,
            'previousRefreshTokenHash',
          )
        : undefined,
      deviceLabel: input.deviceLabel?.trim() || undefined,
      absoluteExpiresAt:
        input.absoluteExpiresAt ??
        new Date(now.getTime() + SESSION_ABSOLUTE_TTL_MS),
      createdAt: now,
      updatedAt: input.updatedAt ?? now,
    });
  }

  static fromSnapshot(snapshot: SessionSnapshot): Session {
    return new Session({ ...snapshot });
  }

  get id(): SessionId {
    return this.props.id;
  }

  get userId(): UserId {
    return this.props.userId;
  }

  get familyId(): string {
    return this.props.familyId;
  }

  get refreshTokenHash(): string {
    return this.props.refreshTokenHash;
  }

  get previousRefreshTokenHash(): string | undefined {
    return this.props.previousRefreshTokenHash;
  }

  get absoluteExpiresAt(): Date {
    return this.props.absoluteExpiresAt;
  }

  get revokedAt(): Date | undefined {
    return this.props.revokedAt;
  }

  get deviceLabel(): string | undefined {
    return this.props.deviceLabel;
  }

  matchesRefreshHash(hash: string): boolean {
    return (
      this.props.refreshTokenHash === hash ||
      this.props.previousRefreshTokenHash === hash
    );
  }

  isRevoked(): boolean {
    return this.props.revokedAt !== undefined;
  }

  isExpired(now: Date = new Date()): boolean {
    return now.getTime() >= this.props.absoluteExpiresAt.getTime();
  }

  assertUsable(now: Date = new Date()): void {
    if (this.isRevoked()) {
      throw new DomainError(
        DomainErrorCodes.SessionNotUsable,
        'Session is revoked',
        { sessionId: this.props.id },
      );
    }
    if (this.isExpired(now)) {
      throw new DomainError(
        DomainErrorCodes.SessionNotUsable,
        'Session is expired',
        { sessionId: this.props.id },
      );
    }
  }

  /**
   * Rotates the refresh token hash. Presenting the previous (already rotated)
   * hash is reuse and revokes this session.
   */
  rotateRefresh(
    presentedHash: string,
    nextHash: string,
    now: Date = new Date(),
  ): RotateRefreshResult {
    this.assertUsable(now);
    const presented = assertNonEmpty(presentedHash, 'presentedHash');
    const next = assertNonEmpty(nextHash, 'nextHash');

    if (this.props.previousRefreshTokenHash === presented) {
      this.revoke(now);
      return { kind: 'reuse' };
    }

    if (presented !== this.props.refreshTokenHash) {
      throw new DomainError(
        DomainErrorCodes.SessionNotUsable,
        'Refresh token does not match session',
        { sessionId: this.props.id },
      );
    }

    this.props.previousRefreshTokenHash = this.props.refreshTokenHash;
    this.props.refreshTokenHash = next;
    this.touch(now);
    return { kind: 'rotated' };
  }

  revoke(now: Date = new Date()): void {
    if (this.props.revokedAt) {
      return;
    }
    this.props.revokedAt = now;
    this.touch(now);
  }

  toSnapshot(): SessionSnapshot {
    return { ...this.props };
  }

  private touch(now: Date = new Date()): void {
    this.props.updatedAt = now;
  }
}
