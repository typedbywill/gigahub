import { z } from 'zod';

export const geoPointDtoSchema = z.object({
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
});

export type GeoPointDto = z.infer<typeof geoPointDtoSchema>;

export const customerStatusSchema = z.enum([
  'active',
  'inactive',
  'cancelled',
  'blocked',
]);

export const customerAddressDtoSchema = z.object({
  street: z.string().optional(),
  number: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  location: geoPointDtoSchema.optional(),
});

export const customerDtoSchema = z.object({
  id: z.string().min(1),
  idErp: z.string().min(1),
  name: z.string().min(1),
  document: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  status: customerStatusSchema,
  address: customerAddressDtoSchema.optional(),
  contractIds: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CustomerDto = z.infer<typeof customerDtoSchema>;
