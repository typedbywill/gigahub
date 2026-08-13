import { z } from 'zod';

export const careChannelSchema = z.enum([
  'whatsapp',
  'crm',
  'phone',
  'internal',
]);

export const careTicketStatusSchema = z.enum([
  'open',
  'queued',
  'in_progress',
  'waiting',
  'resolved',
  'closed',
]);

export const careInboxDtoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  department: z.string().optional(),
  channel: careChannelSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CareInboxDto = z.infer<typeof careInboxDtoSchema>;

export const careTicketDtoSchema = z.object({
  id: z.string().min(1),
  inboxId: z.string().min(1),
  customerId: z.string().optional(),
  workOrderId: z.string().optional(),
  status: careTicketStatusSchema,
  channel: careChannelSchema,
  assignedAgentId: z.string().optional(),
  externalId: z.string().optional(),
  openedAt: z.string(),
  updatedAt: z.string(),
});

export type CareTicketDto = z.infer<typeof careTicketDtoSchema>;
