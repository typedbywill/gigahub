import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Session } from '@gigahub/domain/identity';
import type { SessionRepository } from '@gigahub/application-identity';
import { sessionId, userId, type SessionId } from '@gigahub/shared/kernel';
import { SessionModel } from './session.schema';

@Injectable()
export class MongoSessionRepository implements SessionRepository {
  constructor(
    @InjectModel(SessionModel.name) private readonly model: Model<SessionModel>,
  ) {}

  async findById(id: SessionId): Promise<Session | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByRefreshTokenHash(hash: string): Promise<Session | null> {
    const doc = await this.model
      .findOne({
        $or: [{ refreshTokenHash: hash }, { previousRefreshTokenHash: hash }],
      })
      .lean()
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async save(session: Session): Promise<void> {
    const snap = session.toSnapshot();
    await this.model
      .updateOne(
        { _id: snap.id },
        {
          $set: {
            userId: snap.userId,
            familyId: snap.familyId,
            refreshTokenHash: snap.refreshTokenHash,
            previousRefreshTokenHash: snap.previousRefreshTokenHash,
            deviceLabel: snap.deviceLabel,
            absoluteExpiresAt: snap.absoluteExpiresAt,
            revokedAt: snap.revokedAt,
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

  async revokeFamily(familyId: string, at: Date): Promise<void> {
    await this.model
      .updateMany(
        { familyId, revokedAt: { $exists: false } },
        { $set: { revokedAt: at, updatedAt: at } },
      )
      .exec();
  }

  async revokeAllForUser(userIdValue: string, at: Date): Promise<void> {
    await this.model
      .updateMany(
        { userId: userIdValue, revokedAt: { $exists: false } },
        { $set: { revokedAt: at, updatedAt: at } },
      )
      .exec();
  }

  private toDomain(doc: {
    _id: string;
    userId: string;
    familyId: string;
    refreshTokenHash: string;
    previousRefreshTokenHash?: string;
    deviceLabel?: string;
    absoluteExpiresAt: Date;
    revokedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  }): Session {
    return Session.fromSnapshot({
      id: sessionId(doc._id),
      userId: userId(doc.userId),
      familyId: doc.familyId,
      refreshTokenHash: doc.refreshTokenHash,
      previousRefreshTokenHash: doc.previousRefreshTokenHash,
      deviceLabel: doc.deviceLabel,
      absoluteExpiresAt: doc.absoluteExpiresAt,
      revokedAt: doc.revokedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
