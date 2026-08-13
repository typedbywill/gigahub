import { z } from 'zod';

/** Development-only ES256 pair — replace in real deployments. */
const DEV_JWT_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgwbKkEwUyn7hXHl0X
7XRpizn66pgK+Eo/sRip//CUokihRANCAAQD4rA5I3eKX+62IkbkxogPWBfiLcZ7
EnUKwwZmip3SPNwFWVLdhlDEmjdoJFi9j0ngBaRjwfll/5s2p+HtGeFE
-----END PRIVATE KEY-----`;

const DEV_JWT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA+KwOSN3il/utiJG5MaID1gX4i3G
exJ1CsMGZoqd0jzcBVlS3YZQxJo3aCRYvY9J4AWkY8H5Zf+bNqfh7RnhRA==
-----END PUBLIC KEY-----`;

function pemFromEnv(value: string | undefined, fallback: string): string {
  if (!value || value.trim().length === 0) {
    return fallback;
  }
  return value.replace(/\\n/g, '\n');
}

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  GLOBAL_PREFIX: z.string().default('/api/v1'),
  MONGODB_URI: z
    .string()
    .default('mongodb://127.0.0.1:27017/gigahub?replicaSet=rs0&directConnection=true'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_USE_SSL: z.preprocess((val) => val === true || val === 'true', z.boolean()).default(false),
  MINIO_ACCESS_KEY: z.string().default('minioadmin'),
  MINIO_SECRET_KEY: z.string().default('minioadmin'),
  MINIO_BUCKET: z.string().default('gigahub'),
  CORS_ORIGIN: z.string().default('http://localhost:4200'),
  JWT_ISSUER: z.string().default('gigahub'),
  JWT_AUDIENCE: z.string().default('gigahub-web'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().default(900),
  JWT_PRIVATE_KEY: z.string().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
  AUTH_COOKIE_NAME: z.string().default('gh_refresh'),
  AUTH_COOKIE_SECURE: z
    .preprocess((val) => val === true || val === 'true', z.boolean())
    .default(false),
  AUTH_COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  IXC_DB_HOST: z.string().default('127.0.0.1'),
  IXC_DB_PORT: z.coerce.number().default(3306),
  IXC_DB_USER: z.string().default(''),
  IXC_DB_PASS: z.string().default(''),
  IXC_DB_NAME: z.string().default('ixcprovedor'),
});

export type EnvConfig = z.infer<typeof envSchema> & {
  jwtPrivateKey: string;
  jwtPublicKey: string;
};

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    console.error('Invalid environment variables:', JSON.stringify(result.error.format(), null, 2));
    throw new Error(`Config validation error: ${result.error.message}`);
  }
  const data = result.data;
  if (data.NODE_ENV === 'production') {
    if (!data.JWT_PRIVATE_KEY || !data.JWT_PUBLIC_KEY) {
      throw new Error('JWT_PRIVATE_KEY and JWT_PUBLIC_KEY are required in production');
    }
  }
  return {
    ...data,
    jwtPrivateKey: pemFromEnv(data.JWT_PRIVATE_KEY, DEV_JWT_PRIVATE_KEY),
    jwtPublicKey: pemFromEnv(data.JWT_PUBLIC_KEY, DEV_JWT_PUBLIC_KEY),
  };
}
