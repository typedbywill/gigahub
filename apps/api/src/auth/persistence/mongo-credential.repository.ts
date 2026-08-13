import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Credential } from '@gigahub/domain/identity';
import type { CredentialRepository } from '@gigahub/application-identity';
import { credentialId, userId, type UserId } from '@gigahub/shared/kernel';
import { CredentialModel } from './credential.schema';

@Injectable()
export class MongoCredentialRepository implements CredentialRepository {
  constructor(
    @InjectModel(CredentialModel.name) private readonly model: Model<CredentialModel>,
  ) {}

  async findByUserId(userIdValue: UserId): Promise<Credential | null> {
    const doc = await this.model.findOne({ userId: userIdValue }).lean().exec();
    return doc ? this.toDomain(doc) : null;
  }

  async save(credential: Credential): Promise<void> {
    const snap = credential.toSnapshot();
    await this.model
      .updateOne(
        { _id: snap.id },
        {
          $set: {
            userId: snap.userId,
            passwordHash: snap.passwordHash,
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
    userId: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
  }): Credential {
    return Credential.fromSnapshot({
      id: credentialId(doc._id),
      userId: userId(doc.userId),
      passwordHash: doc.passwordHash,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
