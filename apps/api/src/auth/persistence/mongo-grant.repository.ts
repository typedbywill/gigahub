import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  GrantPermission,
  GrantRole,
  type PermissionId,
} from '@gigahub/domain/identity';
import type { GrantRepository } from '@gigahub/application-identity';
import {
  grantId,
  roleId,
  userId,
  type UserId,
} from '@gigahub/shared/kernel';
import { GrantModel } from './grant.schema';

@Injectable()
export class MongoGrantRepository implements GrantRepository {
  constructor(
    @InjectModel(GrantModel.name) private readonly model: Model<GrantModel>,
  ) {}

  async listRoleGrantsByUserId(uid: UserId): Promise<GrantRole[]> {
    const docs = await this.model
      .find({ userId: uid, kind: 'role' })
      .lean()
      .exec();
    return docs.map((doc) => this.toRoleGrant(doc));
  }

  async listPermissionGrantsByUserId(uid: UserId): Promise<GrantPermission[]> {
    const docs = await this.model
      .find({ userId: uid, kind: 'permission' })
      .lean()
      .exec();
    return docs.map((doc) => this.toPermissionGrant(doc));
  }

  async saveRoleGrant(grant: GrantRole): Promise<void> {
    const snap = grant.toSnapshot();
    await this.model
      .updateOne(
        { _id: snap.id },
        {
          $set: {
            kind: 'role',
            userId: snap.userId,
            roleId: snap.roleId,
            grantedByUserId: snap.grantedByUserId,
            reason: snap.reason ?? null,
            expiresAt: snap.expiresAt ?? null,
            revokedAt: snap.revokedAt ?? null,
            updatedAt: snap.updatedAt,
          },
          $setOnInsert: {
            _id: snap.id,
            createdAt: snap.createdAt,
          },
        },
        { upsert: true },
      )
      .exec();
  }

  async savePermissionGrant(grant: GrantPermission): Promise<void> {
    const snap = grant.toSnapshot();
    await this.model
      .updateOne(
        { _id: snap.id },
        {
          $set: {
            kind: 'permission',
            userId: snap.userId,
            permissionId: snap.permissionId,
            grantedByUserId: snap.grantedByUserId,
            reason: snap.reason ?? null,
            expiresAt: snap.expiresAt ?? null,
            revokedAt: snap.revokedAt ?? null,
            updatedAt: snap.updatedAt,
          },
          $setOnInsert: {
            _id: snap.id,
            createdAt: snap.createdAt,
          },
        },
        { upsert: true },
      )
      .exec();
  }

  private toRoleGrant(doc: {
    _id: string;
    userId: string;
    roleId?: string;
    grantedByUserId: string;
    reason?: string | null;
    expiresAt?: Date | null;
    revokedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): GrantRole {
    if (!doc.roleId) {
      throw new Error(`Role grant ${doc._id} is missing roleId`);
    }
    return GrantRole.fromSnapshot({
      kind: 'role',
      id: grantId(doc._id),
      userId: userId(doc.userId),
      roleId: roleId(doc.roleId),
      grantedByUserId: userId(doc.grantedByUserId),
      reason: doc.reason ?? undefined,
      expiresAt: doc.expiresAt ?? undefined,
      revokedAt: doc.revokedAt ?? undefined,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  private toPermissionGrant(doc: {
    _id: string;
    userId: string;
    permissionId?: string;
    grantedByUserId: string;
    reason?: string | null;
    expiresAt?: Date | null;
    revokedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): GrantPermission {
    if (!doc.permissionId) {
      throw new Error(`Permission grant ${doc._id} is missing permissionId`);
    }
    return GrantPermission.fromSnapshot({
      kind: 'permission',
      id: grantId(doc._id),
      userId: userId(doc.userId),
      permissionId: doc.permissionId as PermissionId,
      grantedByUserId: userId(doc.grantedByUserId),
      reason: doc.reason ?? undefined,
      expiresAt: doc.expiresAt ?? undefined,
      revokedAt: doc.revokedAt ?? undefined,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
