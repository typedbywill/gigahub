export const WORK_ORDER_STATUSES = [
  'A',
  'AN',
  'EN',
  'AS',
  'AG',
  'DS',
  'EX',
  'F',
  'RAG',
] as const;

export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  A: 'Aberta',
  AN: 'Análise',
  EN: 'Encaminhada',
  AS: 'Assumida',
  AG: 'Agendada',
  DS: 'Deslocamento',
  EX: 'Execução',
  F: 'Finalizada',
  RAG: 'Aguardando reagendamento',
};

export const FIELD_WORK_STATUSES: readonly WorkOrderStatus[] = [
  'AG',
  'DS',
  'EX',
];

export const ALLOWED_STATUS_TRANSITIONS: Record<
  WorkOrderStatus,
  readonly WorkOrderStatus[]
> = {
  A: ['AN', 'EN', 'AG'],
  AN: ['EN', 'AG'],
  EN: ['AS', 'AG'],
  AS: ['AG'],
  AG: ['DS', 'RAG'],
  DS: ['EX', 'RAG'],
  EX: ['F'],
  F: [],
  RAG: ['AG'],
};

export const GEOFENCE_RADIUS_METERS = 300;
export const FRESH_LOCATION_MAX_AGE_MS = 10 * 60 * 1000;
export const EXECUTION_REASON_MIN_LENGTH = 11;
