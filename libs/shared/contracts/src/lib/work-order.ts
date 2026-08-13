import { z } from 'zod';
import { geoPointDtoSchema } from './customer';

export const workOrderStatusSchema = z.enum([
  'A',
  'AN',
  'EN',
  'AS',
  'AG',
  'DS',
  'EX',
  'F',
  'RAG',
]);

export const workOrderDtoSchema = z.object({
  id: z.string().min(1),
  idErp: z.string().min(1),
  status: workOrderStatusSchema,
  customerId: z.string().min(1),
  technicianId: z.string().optional(),
  subjectId: z.string().optional(),
  location: geoPointDtoSchema.optional(),
  scheduledAt: z.string().optional(),
  estimatedDurationMinutes: z.number().positive().optional(),
  executionReason: z.string().optional(),
  completionRequestedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type WorkOrderDto = z.infer<typeof workOrderDtoSchema>;

export const subjectFileRequirementDtoSchema = z.object({
  name: z.string().min(1),
  requiredOnExecution: z.boolean(),
});

export const subjectQuestionDtoSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  type: z.enum(['string', 'number', 'options']),
  required: z.boolean(),
});

export const subjectDtoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  ixcSubjectIds: z.array(z.string()),
  defaultMinutes: z.number().positive(),
  nocReviews: z.boolean(),
  files: z.array(subjectFileRequirementDtoSchema),
  closingQuestions: z.array(subjectQuestionDtoSchema),
});

export type SubjectDto = z.infer<typeof subjectDtoSchema>;
