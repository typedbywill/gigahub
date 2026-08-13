import type {
  LoginRequestDto,
  LoginResponseDto,
  RenewTokenResponseDto,
  PublicUserDto,
} from '@gigahub/shared/contracts';

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function parseError(res: Response): Promise<never> {
  let code = 'HTTP_ERROR';
  let message = `Request failed (${res.status})`;
  try {
    const body = (await res.json()) as {
      code?: string;
      error?: string;
      message?: string;
    };
    code = body.code ?? body.error ?? code;
    message = body.message ?? message;
  } catch {
    // ignore
  }
  throw new ApiClientError(res.status, code, message);
}

export async function loginRequest(
  payload: LoginRequestDto,
): Promise<LoginResponseDto> {
  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    await parseError(res);
  }
  return res.json() as Promise<LoginResponseDto>;
}

export async function renewTokenRequest(): Promise<RenewTokenResponseDto> {
  const res = await fetch('/api/v1/auth/renew-token', {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    await parseError(res);
  }
  return res.json() as Promise<RenewTokenResponseDto>;
}

export async function changePasswordRequest(
  payload: { currentPassword: string; newPassword: string },
  accessToken: string,
): Promise<{ user: PublicUserDto }> {
  const res = await fetch('/api/v1/auth/change-password', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    await parseError(res);
  }
  return res.json() as Promise<{ user: PublicUserDto }>;
}

export type { PublicUserDto };
