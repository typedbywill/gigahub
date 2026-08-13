/** Catalog keys used by the web app for navigation and action gating. */
export const Permissions = {
  UsersRead: 'users:read',
  UsersUpdate: 'users:update',
  UsersInactivate: 'users:inactivate',
  AccessManage: 'access:manage',
} as const;

export type AppPermission = (typeof Permissions)[keyof typeof Permissions];
