import { z } from 'zod';
import {
  customerAddressDtoSchema,
  customerDtoSchema,
  customerStatusSchema,
  geoPointDtoSchema,
} from './customer';

export const customerSearchQueryDtoSchema = z.object({
  q: z.string().trim().min(2),
  limit: z.coerce.number().int().min(1).max(40).optional(),
});

export type CustomerSearchQueryDto = z.infer<typeof customerSearchQueryDtoSchema>;

export const customerSearchHitDtoSchema = z.object({
  id: z.string().min(1),
  idErp: z.string().min(1),
  name: z.string().min(1),
  document: z.string().optional(),
  location: geoPointDtoSchema.optional(),
});

export type CustomerSearchHitDto = z.infer<typeof customerSearchHitDtoSchema>;

export const customerSearchResponseDtoSchema = z.object({
  q: z.string().min(1),
  limit: z.number().int().positive(),
  items: z.array(customerSearchHitDtoSchema),
});

export type CustomerSearchResponseDto = z.infer<
  typeof customerSearchResponseDtoSchema
>;

export const CUSTOMER_CONSULT_SECTIONS = [
  'cadastro',
  'contratos',
  'logins',
  'fibra',
  'sinal',
  'fibraHistorico',
  'faturas',
  'comodatos',
  'senhasWifi',
  'acessoRemoto',
] as const;

export type CustomerConsultSection = (typeof CUSTOMER_CONSULT_SECTIONS)[number];

export const customerConsultSectionSchema = z.enum(CUSTOMER_CONSULT_SECTIONS);

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const customerConsultationQueryDtoSchema = z
  .object({
    include: z
      .union([
        customerConsultSectionSchema,
        z.array(customerConsultSectionSchema).min(1),
        z.string().trim().min(1),
      ])
      .transform((value) => {
        if (Array.isArray(value)) {
          return value;
        }
        if (value.includes(',')) {
          return value
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean);
        }
        return [value];
      })
      .pipe(z.array(customerConsultSectionSchema).min(1)),
    contractId: z.coerce.number().int().positive().optional(),
    fiberId: z.coerce.number().int().positive().optional(),
    contractsLimit: z.coerce.number().int().min(1).max(100).optional(),
    contractsOffset: z.coerce.number().int().min(0).optional(),
    contractsStatus: z.string().optional(),
    loginsLimit: z.coerce.number().int().min(1).max(100).optional(),
    loginsOffset: z.coerce.number().int().min(0).optional(),
    loginsAtivo: z.enum(['S', 'N']).optional(),
    fibraHistoricoLimit: z.coerce.number().int().min(1).max(100).optional(),
    fibraHistoricoOffset: z.coerce.number().int().min(0).optional(),
    faturasLimit: z.coerce.number().int().min(1).max(100).optional(),
    faturasOffset: z.coerce.number().int().min(0).optional(),
    faturasStatus: z.enum(['A', 'R', 'P', 'C']).optional(),
    faturasOnlyOpen: z
      .union([z.literal('true'), z.literal('false'), z.boolean()])
      .optional()
      .transform((value) => value === true || value === 'true'),
    comodatosLimit: z.coerce.number().int().min(1).max(100).optional(),
    comodatosOffset: z.coerce.number().int().min(0).optional(),
    comodatosStatus: z.enum(['E', 'D', 'B', 'A']).optional(),
  })
  .refine((value) => value.include.length > 0, {
    message: 'At least one include section is required',
  });

export type CustomerConsultationQueryDto = z.infer<
  typeof customerConsultationQueryDtoSchema
>;

export const paginatedSectionDtoSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    total: z.number().int().nonnegative(),
    items: z.array(item),
  });

export const customerContractItemDtoSchema = z.object({
  id: z.string().min(1),
  idErp: z.string().min(1),
  status: z.string(),
  activatedAt: z.string().optional(),
});

export const customerLoginItemDtoSchema = z.object({
  id: z.string().min(1),
  idErp: z.string().min(1),
  active: z.boolean(),
  contractIdErp: z.string().optional(),
  ip: z.string().optional(),
  login: z.string().optional(),
});

export const customerFibraItemDtoSchema = z.object({
  id: z.string().min(1),
  idErp: z.string().min(1),
  loginIdErp: z.string().optional(),
  onuSerial: z.string().optional(),
  mac: z.string().optional(),
});

export const customerFibraHistoricoItemDtoSchema = z.object({
  recordedAt: z.string(),
  signalRx: z.number().optional(),
});

export const customerFaturaItemDtoSchema = z.object({
  id: z.string().min(1),
  idErp: z.string().min(1),
  status: z.string(),
  dueDate: z.string().optional(),
  issuedAt: z.string().optional(),
  openAmount: z.number().optional(),
});

export const customerComodatoItemDtoSchema = z.object({
  id: z.string().min(1),
  idErp: z.string().min(1),
  productDescription: z.string().optional(),
  status: z.string(),
});

export const customerSinalSectionDtoSchema = z.object({
  value: z.string().optional(),
  error: z.string().optional(),
});

export const customerSenhasWifiSectionDtoSchema = z.object({
  lines: z.array(z.string()),
});

export const customerAcessoRemotoPortDtoSchema = z.object({
  port: z.number().int().positive(),
  isOpen: z.boolean(),
});

export const customerAcessoRemotoSectionDtoSchema = z.object({
  ip: z.string().min(1),
  ports: z.array(customerAcessoRemotoPortDtoSchema),
});

export const customerConsultationDataDtoSchema = z.object({
  cadastro: customerDtoSchema.optional(),
  contratos: paginatedSectionDtoSchema(customerContractItemDtoSchema).optional(),
  logins: paginatedSectionDtoSchema(customerLoginItemDtoSchema).optional(),
  fibra: paginatedSectionDtoSchema(customerFibraItemDtoSchema).optional(),
  sinal: customerSinalSectionDtoSchema.optional(),
  fibraHistorico: paginatedSectionDtoSchema(
    customerFibraHistoricoItemDtoSchema,
  ).optional(),
  faturas: paginatedSectionDtoSchema(customerFaturaItemDtoSchema).optional(),
  comodatos: paginatedSectionDtoSchema(customerComodatoItemDtoSchema).optional(),
  senhasWifi: customerSenhasWifiSectionDtoSchema.optional(),
  acessoRemoto: customerAcessoRemotoSectionDtoSchema.optional(),
});

export const customerConsultationResponseDtoSchema = z.object({
  customerId: z.string().min(1),
  found: z.boolean(),
  included: z.array(customerConsultSectionSchema).min(1),
  data: customerConsultationDataDtoSchema,
  warnings: z.array(z.string()).optional(),
});

export type CustomerConsultationResponseDto = z.infer<
  typeof customerConsultationResponseDtoSchema
>;
