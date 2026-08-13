import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, importPKCS8, importSPKI } from 'jose';
import type { TokenIssuer } from '@gigahub/application-identity';
import type { SessionId, UserId } from '@gigahub/shared/kernel';
import type { EnvConfig } from '@gigahub/shared/config';
import { randomUUID } from 'crypto';

type CryptoKeyLike = Awaited<ReturnType<typeof importPKCS8>>;

@Injectable()
export class JoseAccessTokenIssuer implements TokenIssuer {
  private privateKeyPromise: Promise<CryptoKeyLike>;

  constructor(private readonly config: ConfigService<EnvConfig, true>) {
    this.privateKeyPromise = importPKCS8(
      this.config.get('jwtPrivateKey', { infer: true }),
      'ES256',
    );
  }

  async issueAccessToken(input: {
    userId: UserId;
    sessionId: SessionId;
    email: string;
  }): Promise<string> {
    const privateKey = await this.privateKeyPromise;
    const ttl = this.config.get('JWT_ACCESS_TTL_SECONDS', { infer: true });
    return new SignJWT({
      email: input.email,
      sid: input.sessionId,
    })
      .setProtectedHeader({ alg: 'ES256', typ: 'JWT', kid: 'gigahub-es256-1' })
      .setSubject(input.userId)
      .setIssuer(this.config.get('JWT_ISSUER', { infer: true }))
      .setAudience(this.config.get('JWT_AUDIENCE', { infer: true }))
      .setIssuedAt()
      .setExpirationTime(`${ttl}s`)
      .setJti(randomUUID())
      .sign(privateKey);
  }
}

@Injectable()
export class JoseAccessTokenVerifier {
  private publicKeyPromise: Promise<CryptoKeyLike>;

  constructor(private readonly config: ConfigService<EnvConfig, true>) {
    this.publicKeyPromise = importSPKI(
      this.config.get('jwtPublicKey', { infer: true }),
      'ES256',
    );
  }

  async publicKey(): Promise<CryptoKeyLike> {
    return this.publicKeyPromise;
  }
}
