import { z } from 'zod';
import { geoPointDtoSchema } from './customer';

/**
 * Query for nearby project layers (FAT, cables, future CEO).
 * `radius` is optional; when omitted the API applies the domain default (5 km).
 */
export const nearbyProjectQueryDtoSchema = z.object({
  lat: z.coerce.number().gte(-90).lte(90),
  lng: z.coerce.number().gte(-180).lte(180),
  radius: z.coerce.number().positive().optional(),
});

export type NearbyProjectQueryDto = z.infer<typeof nearbyProjectQueryDtoSchema>;

export const nearbyFiberAccessTerminalDtoSchema = z.object({
  id: z.string().min(1),
  idErp: z.string().min(1),
  name: z.string().min(1),
  location: geoPointDtoSchema,
  distanceMeters: z.number().nonnegative(),
  mapColorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export type NearbyFiberAccessTerminalDto = z.infer<
  typeof nearbyFiberAccessTerminalDtoSchema
>;

export const nearbyFiberAccessTerminalsResponseDtoSchema = z.object({
  items: z.array(nearbyFiberAccessTerminalDtoSchema),
  radiusMeters: z.number().positive(),
});

export type NearbyFiberAccessTerminalsResponseDto = z.infer<
  typeof nearbyFiberAccessTerminalsResponseDtoSchema
>;

/**
 * `distanceMeters` is the distance from the query center to the nearest
 * vertex on the cable path (not the perpendicular distance to the segment).
 */
export const nearbyFiberCableDtoSchema = z.object({
  id: z.string().min(1),
  idErp: z.string().min(1),
  name: z.string().min(1),
  projectIdErp: z.string().min(1),
  lengthMeters: z.number().nonnegative().optional(),
  path: z.array(geoPointDtoSchema).min(2),
  distanceMeters: z.number().nonnegative(),
  strokeColorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  strokeWidth: z.number().positive(),
  strokeDashed: z.boolean(),
  cableTypeName: z.string().min(1).optional(),
});

export type NearbyFiberCableDto = z.infer<typeof nearbyFiberCableDtoSchema>;

export const nearbyFiberCablesResponseDtoSchema = z.object({
  items: z.array(nearbyFiberCableDtoSchema),
  radiusMeters: z.number().positive(),
});

export type NearbyFiberCablesResponseDto = z.infer<
  typeof nearbyFiberCablesResponseDtoSchema
>;
