export const DEMAND_STATUSES = [
  'open',
  'queued',
  'in_progress',
  'waiting',
  'resolved',
  'closed',
] as const;

export type DemandStatus = (typeof DEMAND_STATUSES)[number];

export const ALLOWED_DEMAND_TRANSITIONS: Record<
  DemandStatus,
  readonly DemandStatus[]
> = {
  open: ['queued', 'in_progress', 'closed'],
  queued: ['in_progress', 'closed'],
  in_progress: ['waiting', 'resolved', 'queued'],
  waiting: ['in_progress', 'resolved', 'closed'],
  resolved: ['closed', 'in_progress'],
  closed: [],
};
