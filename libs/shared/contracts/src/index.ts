export interface HealthServiceStatus {
  status: 'up' | 'down';
  details?: Record<string, unknown> | string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  services: {
    mongodb: HealthServiceStatus;
    redis: HealthServiceStatus;
    minio: HealthServiceStatus;
  };
}

export interface ApiErrorEnvelope {
  code: string;
  message: string;
  details?: unknown;
  traceId?: string;
}

export interface UserStub {
  id: string;
  email: string;
  name: string;
}
