import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify, importSPKI } from 'jose';
import type { Request } from 'express';
import type { EnvConfig } from '@gigahub/shared/config';

export type AuthenticatedRequest = Request & {
  userId?: string;
  sessionId?: string;
};

@Injectable()
export class AccessTokenGuard implements CanActivate {
  private publicKeyPromise: Promise<CryptoKey>;

  constructor(private readonly config: ConfigService<EnvConfig, true>) {
    this.publicKeyPromise = importSPKI(
      this.config.get('jwtPublicKey', { infer: true }),
      'ES256',
    ) as Promise<CryptoKey>;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: 'Missing access token',
      });
    }
    const token = header.slice('Bearer '.length).trim();
    try {
      const publicKey = await this.publicKeyPromise;
      const { payload } = await jwtVerify(token, publicKey, {
        issuer: this.config.get('JWT_ISSUER', { infer: true }),
        audience: this.config.get('JWT_AUDIENCE', { infer: true }),
        algorithms: ['ES256'],
      });
      if (!payload.sub) {
        throw new Error('missing sub');
      }
      req.userId = payload.sub;
      req.sessionId = typeof payload.sid === 'string' ? payload.sid : undefined;
      return true;
    } catch {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: 'Invalid access token',
      });
    }
  }
}
