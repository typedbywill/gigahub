import type { Response } from 'express';
import type { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '@gigahub/shared/config';
import { SESSION_ABSOLUTE_TTL_MS } from '@gigahub/domain/identity';

export function setRefreshCookie(
  res: Response,
  config: ConfigService<EnvConfig, true>,
  refreshToken: string,
): void {
  const name = config.get('AUTH_COOKIE_NAME', { infer: true });
  const secure = config.get('AUTH_COOKIE_SECURE', { infer: true });
  const sameSite = config.get('AUTH_COOKIE_SAME_SITE', { infer: true });

  res.cookie(name, refreshToken, {
    httpOnly: true,
    secure,
    sameSite,
    path: '/api/v1/auth',
    maxAge: SESSION_ABSOLUTE_TTL_MS,
  });
}

export function clearRefreshCookie(
  res: Response,
  config: ConfigService<EnvConfig, true>,
): void {
  const name = config.get('AUTH_COOKIE_NAME', { infer: true });
  const secure = config.get('AUTH_COOKIE_SECURE', { infer: true });
  const sameSite = config.get('AUTH_COOKIE_SAME_SITE', { infer: true });
  res.clearCookie(name, {
    httpOnly: true,
    secure,
    sameSite,
    path: '/api/v1/auth',
  });
}
