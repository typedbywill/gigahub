export interface ApiErrorEnvelope {
  code: string;
  message: string;
  details?: unknown;
  traceId?: string;
}
