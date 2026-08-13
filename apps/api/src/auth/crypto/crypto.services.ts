import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'crypto';
import type {
  Clock,
  IdGenerator,
  PasswordHasher,
  RefreshTokenService,
} from '@gigahub/application-identity';

@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  hash(plaintext: string): Promise<string> {
    return argon2.hash(plaintext, { type: argon2.argon2id });
  }

  verify(plaintext: string, passwordHash: string): Promise<boolean> {
    return argon2.verify(passwordHash, plaintext);
  }
}

@Injectable()
export class CryptoRefreshTokenService implements RefreshTokenService {
  generate(): string {
    return randomBytes(48).toString('base64url');
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

@Injectable()
export class UuidGenerator implements IdGenerator {
  generate(): string {
    return randomUUID();
  }
}

@Injectable()
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
