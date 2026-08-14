import { ApiClientError } from './auth.api';

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

export async function apiFetch<T>(
  path: string,
  options: {
    method?: string;
    accessToken: string;
    body?: unknown;
    formData?: FormData;
    query?: Record<
      string,
      string | number | boolean | string[] | undefined
    >;
    signal?: AbortSignal;
  },
): Promise<T> {
  const url = new URL(path, window.location.origin);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value === undefined) {
        continue;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          url.searchParams.append(key, String(item));
        }
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.accessToken}`,
  };
  if (options.body !== undefined && options.formData === undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url.pathname + url.search, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers,
    body:
      options.formData !== undefined
        ? options.formData
        : options.body !== undefined
          ? JSON.stringify(options.body)
          : undefined,
    signal: options.signal,
  });

  if (!res.ok) {
    await parseError(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
