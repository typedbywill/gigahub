import { z } from 'zod';

export const demandStatusSchema = z.enum([
  'open',
  'queued',
  'in_progress',
  'waiting',
  'resolved',
  'closed',
]);

export type DemandStatusDto = z.infer<typeof demandStatusSchema>;

export const paramTypeSchema = z.enum([
  'text',
  'longtext',
  'number',
  'date',
  'select',
  'multiselect',
  'checkbox',
  'ref:customer',
  'ref:user',
  'ref:workOrder',
  'ref:contract',
]);

export type ParamTypeDto = z.infer<typeof paramTypeSchema>;

export const subjectParamDtoSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: paramTypeSchema,
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
});

export type SubjectParamDto = z.infer<typeof subjectParamDtoSchema>;

export const subjectDtoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  defaultQueueId: z.string().optional(),
  params: z.array(subjectParamDtoSchema),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SubjectDto = z.infer<typeof subjectDtoSchema>;

export const demandQueueDtoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  department: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DemandQueueDto = z.infer<typeof demandQueueDtoSchema>;

export const demandDtoSchema = z.object({
  id: z.string().min(1),
  queueId: z.string().min(1),
  subjectId: z.string().min(1),
  title: z.string().min(1),
  values: z.record(z.string(), z.unknown()),
  customerIds: z.array(z.string()),
  openedByUserId: z.string().min(1),
  status: demandStatusSchema,
  assignedAgentId: z.string().optional(),
  openedAt: z.string(),
  updatedAt: z.string(),
});

export type DemandDto = z.infer<typeof demandDtoSchema>;

export const openDemandInputSchema = z.object({
  subjectId: z.string().min(1),
  queueId: z.string().optional(),
  title: z.string().min(1),
  values: z.record(z.string(), z.unknown()).optional().default({}),
  customerIds: z.array(z.string()).optional().default([]),
  assignedAgentId: z.string().optional(),
});

export type OpenDemandInputDto = z.input<typeof openDemandInputSchema>;

export const assignDemandInputSchema = z.object({
  agentId: z.string().min(1),
});

export type AssignDemandInputDto = z.infer<typeof assignDemandInputSchema>;

export const transferDemandInputSchema = z.object({
  queueId: z.string().min(1),
});

export type TransferDemandInputDto = z.infer<typeof transferDemandInputSchema>;

export const updateDemandValuesInputSchema = z.object({
  values: z.record(z.string(), z.unknown()),
});

export type UpdateDemandValuesInputDto = z.infer<
  typeof updateDemandValuesInputSchema
>;

export const createSubjectInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  defaultQueueId: z.string().optional(),
  params: z.array(subjectParamDtoSchema).default([]),
  isActive: z.boolean().default(true),
});

export type CreateSubjectInputDto = z.infer<typeof createSubjectInputSchema>;

export const updateSubjectInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  defaultQueueId: z.string().optional(),
  params: z.array(subjectParamDtoSchema).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateSubjectInputDto = z.infer<typeof updateSubjectInputSchema>;

export const createDemandQueueInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  department: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type CreateDemandQueueInputDto = z.infer<
  typeof createDemandQueueInputSchema
>;
