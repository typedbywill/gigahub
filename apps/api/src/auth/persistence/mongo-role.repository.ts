import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role, type PermissionId } from '@gigahub/domain/identity';
import type { RoleRepository } from '@gigahub/application-identity';
import { roleId, type RoleId } from '@gigahub/shared/kernel';
import { RoleModel } from './role.schema';

@Injectable()
export class MongoRoleRepository implements RoleRepository {
  constructor(
    @InjectModel(RoleModel.name) private readonly model: Model<RoleModel>,
  ) {}

  async findById(id: RoleId): Promise<Role | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findBySlug(slug: string): Promise<Role | null> {
    const doc = await this.model
      .findOne({ slug: slug.toLowerCase() })
      .lean()
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async listActive(): Promise<Role[]> {
    const docs = await this.model
      .find({ status: 'active' })
      .sort({ name: 1 })
      .lean()
      .exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async save(role: Role): Promise<void> {
    const snap = role.toSnapshot();
    await this.model
      .updateOne(
        { _id: snap.id },
        {
          $set: {
            slug: snap.slug,
            name: snap.name,
            permissionIds: [...snap.permissionIds],
            status: snap.status,
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

  private toDomain(doc: {
    _id: string;
    slug: string;
    name: string;
    permissionIds: string[];
    status: 'active' | 'archived';
    createdAt: Date;
    updatedAt: Date;
  }): Role {
    return Role.fromSnapshot({
      id: roleId(doc._id),
      slug: doc.slug,
      name: doc.name,
      permissionIds: doc.permissionIds as PermissionId[],
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
