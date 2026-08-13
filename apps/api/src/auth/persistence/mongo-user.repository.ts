import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '@gigahub/domain/identity';
import type { UserRepository } from '@gigahub/application-identity';
import { userId, type UserId } from '@gigahub/shared/kernel';
import { UserModel } from './user.schema';

@Injectable()
export class MongoUserRepository implements UserRepository {
  constructor(@InjectModel(UserModel.name) private readonly model: Model<UserModel>) {}

  async findByEmail(email: string): Promise<User | null> {
    const doc = await this.model.findOne({ email: email.toLowerCase() }).lean().exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findById(id: UserId): Promise<User | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? this.toDomain(doc) : null;
  }

  async save(user: User): Promise<void> {
    const snap = user.toSnapshot();
    await this.model
      .updateOne(
        { _id: snap.id },
        {
          $set: {
            email: snap.email,
            name: snap.name,
            status: snap.status,
            authorizationVersion: snap.authorizationVersion,
            idErp: snap.idErp ?? null,
            idErpEmployee: snap.idErpEmployee ?? null,
            jobTitle: snap.jobTitle ?? null,
            cashboxId: snap.cashboxId ?? null,
            warehouseId: snap.warehouseId ?? null,
            planningId: snap.planningId ?? null,
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
    email: string;
    name: string;
    status: 'active' | 'blocked';
    authorizationVersion?: number;
    idErp?: string | null;
    idErpEmployee?: string | null;
    jobTitle?: string | null;
    cashboxId?: string | null;
    warehouseId?: string | null;
    planningId?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return User.fromSnapshot({
      id: userId(doc._id),
      email: doc.email,
      name: doc.name,
      status: doc.status,
      authorizationVersion: doc.authorizationVersion ?? 0,
      idErp: doc.idErp ?? undefined,
      idErpEmployee: doc.idErpEmployee ?? undefined,
      jobTitle: doc.jobTitle ?? undefined,
      cashboxId: doc.cashboxId ?? undefined,
      warehouseId: doc.warehouseId ?? undefined,
      planningId: doc.planningId ?? undefined,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
