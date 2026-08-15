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

export type WorkOrderStatus = z.infer<typeof workOrderStatusSchema>;

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

export const workOrderSummaryDtoSchema = z.object({
  id: z.string().min(1),
  idErp: z.string().min(1),
  status: workOrderStatusSchema,
  customerId: z.string().min(1),
  customerName: z.string(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  customerNeighborhood: z.string().optional(),
  customerCity: z.string().optional(),
  subjectId: z.string().optional(),
  subjectName: z.string().optional(),
  technicianId: z.string().optional(),
  technicianName: z.string().optional(),
  scheduledAt: z.string().optional(),
  displacementStartedAt: z.string().optional(),
  executionStartedAt: z.string().optional(),
  estimatedDurationMinutes: z.number().optional(),
  executionReason: z.string().optional(),
  location: geoPointDtoSchema.optional(),
  contractId: z.string().optional(),
  login: z.string().optional(),
  priority: z.string().optional(),
  sector: z.string().optional(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type WorkOrderSummaryDto = z.infer<typeof workOrderSummaryDtoSchema>;

export const workOrderTimelineMessageDtoSchema = z.object({
  id: z.string().min(1),
  authorName: z.string(),
  message: z.string(),
  createdAt: z.string(),
  isInternal: z.boolean().optional(),
});

export type WorkOrderTimelineMessageDto = z.infer<
  typeof workOrderTimelineMessageDtoSchema
>;

export const workOrderFileDtoSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  url: z.string().optional(),
  uploadedAt: z.string().optional(),
  category: z.string().optional(),
});

export type WorkOrderFileDto = z.infer<typeof workOrderFileDtoSchema>;

export const workOrderDetailDtoSchema = workOrderSummaryDtoSchema.extend({
  messages: z.array(workOrderTimelineMessageDtoSchema).default([]),
  files: z.array(workOrderFileDtoSchema).default([]),
  subjectConfig: subjectDtoSchema.optional(),
  completionRequestedAt: z.string().optional(),
  customerDetails: z
    .object({
      idErp: z.string(),
      razao: z.string(),
      cnpjCpf: z.string().optional(),
      fone: z.string().optional(),
      email: z.string().optional(),
      enderecoCompleto: z.string().optional(),
      statusInternet: z.string().optional(),
      wifiPasswords: z.array(z.string()).default([]),
      ctoNearest: z
        .object({
          name: z.string(),
          distanceMeters: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

export type WorkOrderDetailDto = z.infer<typeof workOrderDetailDtoSchema>;

export const myScheduleQueryDtoSchema = z.object({
  date: z.string().optional(),
  status: workOrderStatusSchema.optional(),
});

export type MyScheduleQueryDto = z.infer<typeof myScheduleQueryDtoSchema>;

export const workOrderListQueryDtoSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: workOrderStatusSchema.optional(),
  q: z.string().trim().optional(),
  technicianId: z.string().optional(),
  customerId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type WorkOrderListQueryDto = z.infer<typeof workOrderListQueryDtoSchema>;

export const workOrderListResponseDtoSchema = z.object({
  items: z.array(workOrderSummaryDtoSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  pages: z.number().int().nonnegative(),
});

export type WorkOrderListResponseDto = z.infer<
  typeof workOrderListResponseDtoSchema
>;

export const startDisplacementDtoSchema = z.object({
  location: geoPointDtoSchema.optional(),
});

export type StartDisplacementDto = z.infer<typeof startDisplacementDtoSchema>;

export const startExecutionDtoSchema = z.object({
  estimatedDurationMinutes: z.coerce.number().positive(),
  reason: z.string().min(11, 'O motivo deve ter pelo menos 11 caracteres'),
  location: geoPointDtoSchema.optional(),
});

export type StartExecutionDto = z.infer<typeof startExecutionDtoSchema>;

export const rescheduleWorkOrderDtoSchema = z.object({
  newDate: z.string().min(1, 'Data de reagendamento é obrigatória'),
  reason: z.string().min(5, 'Motivo de reagendamento é obrigatório'),
});

export type RescheduleWorkOrderDto = z.infer<
  typeof rescheduleWorkOrderDtoSchema
>;

export const completeWorkOrderDtoSchema = z.object({
  location: geoPointDtoSchema,
  reason: z.string().optional(),
  answers: z.record(z.string(), z.unknown()).optional(),
});

export type CompleteWorkOrderDto = z.infer<typeof completeWorkOrderDtoSchema>;

export const addWorkOrderMessageDtoSchema = z.object({
  message: z.string().min(1, 'Mensagem não pode ser vazia'),
});

export type AddWorkOrderMessageDto = z.infer<
  typeof addWorkOrderMessageDtoSchema
>;
