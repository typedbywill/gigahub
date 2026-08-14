import { z } from 'zod';

export const ctoNodeTypeDtoSchema = z.enum([
  'cable_in',
  'cable_out',
  'splitter_balanced',
  'splitter_unbalanced',
  'splitter',
]);

export type CtoNodeTypeDto = z.infer<typeof ctoNodeTypeDtoSchema>;

export const ctoDiagramPortDtoSchema = z.object({
  portNumber: z.number().int().positive(),
  label: z.string().optional(),
  colorHex: z.string().optional(),
});

export type CtoDiagramPortDto = z.infer<typeof ctoDiagramPortDtoSchema>;

export const ctoDiagramNodeDtoSchema = z.object({
  id: z.string().min(1),
  elementId: z.string().optional(),
  name: z.string().min(1),
  kind: ctoNodeTypeDtoSchema,
  portsIn: z.array(ctoDiagramPortDtoSchema),
  portsOut: z.array(ctoDiagramPortDtoSchema),
  ratio: z.string().optional(),
});

export type CtoDiagramNodeDto = z.infer<typeof ctoDiagramNodeDtoSchema>;

export const ctoDiagramConnectionDtoSchema = z.object({
  id: z.string().min(1),
  sourceNodeId: z.string().min(1),
  sourcePortNumber: z.number().int().positive(),
  targetNodeId: z.string().min(1),
  targetPortNumber: z.number().int().positive(),
  fiberColorHex: z.string(),
  trayNumber: z.number().int().nonnegative().optional(),
});

export type CtoDiagramConnectionDto = z.infer<
  typeof ctoDiagramConnectionDtoSchema
>;

export const ctoSplittingDiagramResponseDtoSchema = z.object({
  fatId: z.string().min(1),
  fatName: z.string().min(1),
  nodes: z.array(ctoDiagramNodeDtoSchema),
  connections: z.array(ctoDiagramConnectionDtoSchema),
});

export type CtoSplittingDiagramResponseDto = z.infer<
  typeof ctoSplittingDiagramResponseDtoSchema
>;
