import { z } from 'zod';

export const userStatusSchema = z.enum(['active', 'blocked']);

export const publicUserDtoSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  status: userStatusSchema,
  idErp: z.string().min(1).optional(),
  idErpEmployee: z.string().min(1).optional(),
  jobTitle: z.string().min(1).optional(),
});

export type PublicUserDto = z.infer<typeof publicUserDtoSchema>;

export const loginRequestDtoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginRequestDto = z.infer<typeof loginRequestDtoSchema>;

export const loginResponseDtoSchema = z.object({
  accessToken: z.string().min(1),
  user: publicUserDtoSchema,
});

export type LoginResponseDto = z.infer<typeof loginResponseDtoSchema>;

export const renewTokenResponseDtoSchema = z.object({
  accessToken: z.string().min(1),
  user: publicUserDtoSchema,
});

export type RenewTokenResponseDto = z.infer<typeof renewTokenResponseDtoSchema>;

export const changePasswordRequestDtoSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export type ChangePasswordRequestDto = z.infer<
  typeof changePasswordRequestDtoSchema
>;

export const changePasswordResponseDtoSchema = z.object({
  user: publicUserDtoSchema,
});

export type ChangePasswordResponseDto = z.infer<
  typeof changePasswordResponseDtoSchema
>;

export const userListStatusFilterSchema = z.enum(['active', 'blocked', 'all']);

export const userListQueryDtoSchema = z.object({
  q: z.string().optional(),
  status: userListStatusFilterSchema.default('all'),
  erpLinked: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((value) => {
      if (value === undefined) {
        return undefined;
      }
      if (typeof value === 'boolean') {
        return value;
      }
      return value === 'true';
    }),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type UserListQueryDto = z.infer<typeof userListQueryDtoSchema>;

export const userListItemDtoSchema = publicUserDtoSchema.extend({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UserListItemDto = z.infer<typeof userListItemDtoSchema>;

export const userDetailDtoSchema = userListItemDtoSchema.extend({
  cashboxId: z.string().min(1).optional(),
  warehouseId: z.string().min(1).optional(),
  planningId: z.string().min(1).optional(),
});

export type UserDetailDto = z.infer<typeof userDetailDtoSchema>;

export const paginatedUsersDtoSchema = z.object({
  items: z.array(userListItemDtoSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});

export type PaginatedUsersDto = z.infer<typeof paginatedUsersDtoSchema>;

export const inactivateUserResponseDtoSchema = z.object({
  user: userDetailDtoSchema,
});

export type InactivateUserResponseDto = z.infer<
  typeof inactivateUserResponseDtoSchema
>;

/** @deprecated Prefer PublicUserDto once auth is wired. */
export interface UserStub {
  id: string;
  email: string;
  name: string;
}
