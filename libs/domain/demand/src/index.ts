export {
  CARE_CHANNELS,
  CARE_TICKET_STATUSES,
  ALLOWED_TICKET_TRANSITIONS,
  type CareChannel,
  type CareTicketStatus,
} from './lib/care-status';
export {
  CareInbox,
  type CareInboxSnapshot,
  type CreateCareInboxInput,
} from './lib/care-inbox';
export {
  CareTicket,
  type CareTicketSnapshot,
  type CreateCareTicketInput,
} from './lib/care-ticket';
