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
  avatarUrl: z.string().url().optional(),
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

export const roleSummaryDtoSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
});

export type RoleSummaryDto = z.infer<typeof roleSummaryDtoSchema>;

export const roleListItemDtoSchema = roleSummaryDtoSchema.extend({
  permissionIds: z.array(z.string().min(1)),
});

export type RoleListItemDto = z.infer<typeof roleListItemDtoSchema>;

export const listRolesResponseDtoSchema = z.object({
  items: z.array(roleListItemDtoSchema),
});

export type ListRolesResponseDto = z.infer<typeof listRolesResponseDtoSchema>;

export const permissionDefinitionDtoSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  group: z.string().min(1),
});

export type PermissionDefinitionDto = z.infer<
  typeof permissionDefinitionDtoSchema
>;

export const listPermissionsResponseDtoSchema = z.object({
  items: z.array(permissionDefinitionDtoSchema),
});

export type ListPermissionsResponseDto = z.infer<
  typeof listPermissionsResponseDtoSchema
>;

export const replaceRolePermissionsRequestDtoSchema = z.object({
  permissionIds: z.array(z.string().min(1)),
});

export type ReplaceRolePermissionsRequestDto = z.infer<
  typeof replaceRolePermissionsRequestDtoSchema
>;

export const replaceRolePermissionsResponseDtoSchema = z.object({
  role: roleListItemDtoSchema,
});

export type ReplaceRolePermissionsResponseDto = z.infer<
  typeof replaceRolePermissionsResponseDtoSchema
>;

export const createRoleRequestDtoSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be kebab-case'),
  permissionIds: z.array(z.string().min(1)).default([]),
});

export type CreateRoleRequestDto = z.infer<typeof createRoleRequestDtoSchema>;

export const createRoleResponseDtoSchema = z.object({
  role: roleListItemDtoSchema,
});

export type CreateRoleResponseDto = z.infer<typeof createRoleResponseDtoSchema>;

export const userDetailDtoSchema = userListItemDtoSchema.extend({
  cashboxId: z.string().min(1).optional(),
  warehouseId: z.string().min(1).optional(),
  planningId: z.string().min(1).optional(),
  roles: z.array(roleSummaryDtoSchema).default([]),
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

export const updateUserRequestDtoSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
  })
  .refine((value) => value.name !== undefined || value.email !== undefined, {
    message: 'At least one of name or email is required',
  });

export type UpdateUserRequestDto = z.infer<typeof updateUserRequestDtoSchema>;

export const updateUserResponseDtoSchema = z.object({
  user: userDetailDtoSchema,
});

export type UpdateUserResponseDto = z.infer<typeof updateUserResponseDtoSchema>;

export const replaceUserRolesRequestDtoSchema = z.object({
  roleIds: z.array(z.string().min(1)),
});

export type ReplaceUserRolesRequestDto = z.infer<
  typeof replaceUserRolesRequestDtoSchema
>;

export const replaceUserRolesResponseDtoSchema = z.object({
  user: userDetailDtoSchema,
});

export type ReplaceUserRolesResponseDto = z.infer<
  typeof replaceUserRolesResponseDtoSchema
>;

export const updateUserAvatarResponseDtoSchema = z.object({
  user: userDetailDtoSchema,
});

export type UpdateUserAvatarResponseDto = z.infer<
  typeof updateUserAvatarResponseDtoSchema
>;

/** @deprecated Prefer PublicUserDto once auth is wired. */
export interface UserStub {
  id: string;
  email: string;
  name: string;
}
