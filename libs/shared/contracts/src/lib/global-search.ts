import { z } from 'zod';

/* ------------------------------------------------------------------ */
/*  Query                                                              */
/* ------------------------------------------------------------------ */

export const globalSearchQueryDtoSchema = z.object({
  q: z.string().trim().min(2),
  limit: z.coerce.number().int().min(1).max(10).default(5),
});

export type GlobalSearchQueryDto = z.infer<typeof globalSearchQueryDtoSchema>;

/* ------------------------------------------------------------------ */
/*  Hit                                                                */
/* ------------------------------------------------------------------ */

export const globalSearchCategorySchema = z.enum([
  'customer',
  'fat',
  'cable',
  'ceo',
  'demand',
  'user',
]);

export type GlobalSearchCategory = z.infer<typeof globalSearchCategorySchema>;

export const globalSearchHitDtoSchema = z.object({
  category: globalSearchCategorySchema,
  id: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  href: z.string().min(1),
});

export type GlobalSearchHitDto = z.infer<typeof globalSearchHitDtoSchema>;

/* ------------------------------------------------------------------ */
/*  Response (grouped)                                                 */
/* ------------------------------------------------------------------ */

export const globalSearchGroupDtoSchema = z.object({
  category: globalSearchCategorySchema,
  label: z.string().min(1),
  items: z.array(globalSearchHitDtoSchema),
});

export type GlobalSearchGroupDto = z.infer<typeof globalSearchGroupDtoSchema>;

export const globalSearchResponseDtoSchema = z.object({
  q: z.string().min(1),
  groups: z.array(globalSearchGroupDtoSchema),
});

export type GlobalSearchResponseDto = z.infer<
  typeof globalSearchResponseDtoSchema
>;
