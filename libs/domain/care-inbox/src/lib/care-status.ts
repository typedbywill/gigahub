export const CARE_CHANNELS = ['whatsapp', 'crm', 'phone', 'internal'] as const;

export type CareChannel = (typeof CARE_CHANNELS)[number];

export const CARE_TICKET_STATUSES = [
  'open',
  'queued',
  'in_progress',
  'waiting',
  'resolved',
  'closed',
] as const;

export type CareTicketStatus = (typeof CARE_TICKET_STATUSES)[number];

export const ALLOWED_TICKET_TRANSITIONS: Record<
  CareTicketStatus,
  readonly CareTicketStatus[]
> = {
  open: ['queued', 'in_progress', 'closed'],
  queued: ['in_progress', 'closed'],
  in_progress: ['waiting', 'resolved', 'queued'],
  waiting: ['in_progress', 'resolved', 'closed'],
  resolved: ['closed', 'in_progress'],
  closed: [],
};
