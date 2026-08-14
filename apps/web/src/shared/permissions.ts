/** Catalog keys used by the web app for navigation and action gating. */
export const Permissions = {
  UsersRead: 'users:read',
  UsersUpdate: 'users:update',
  UsersInactivate: 'users:inactivate',
  AccessManage: 'access:manage',
  DemandRead: 'demand:read',
  DemandReadAll: 'demand:read:all',
  DemandOpen: 'demand:open',
  DemandClaim: 'demand:claim',
  DemandAssign: 'demand:assign',
  DemandReply: 'demand:reply',
  DemandClose: 'demand:close',
  DemandSubjectManage: 'demand:subject:manage',
  CustomerRead: 'customer:read',
} as const;

export type AppPermission = (typeof Permissions)[keyof typeof Permissions];
