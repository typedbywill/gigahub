import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DemandQueue } from '@gigahub/domain/demand';
import type { DemandQueueRepository } from '@gigahub/application-demand';
import { demandQueueId, type DemandQueueId } from '@gigahub/shared/kernel';
import { DemandQueueModel } from './demand-queue.schema';

@Injectable()
export class MongoDemandQueueRepository implements DemandQueueRepository {
  constructor(
    @InjectModel(DemandQueueModel.name)
    private readonly model: Model<DemandQueueModel>,
  ) {}

  async findById(id: DemandQueueId): Promise<DemandQueue | null> {
    const doc = await this.model.findById(String(id)).lean().exec();
    return doc ? this.toDomain(doc) : null;
  }

  async list(activeOnly = false): Promise<DemandQueue[]> {
    const filter = activeOnly ? { isActive: true } : {};
    const docs = await this.model
      .find(filter)
      .sort({ name: 1 })
      .lean()
      .exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async save(queue: DemandQueue): Promise<void> {
    const snap = queue.toSnapshot();
    await this.model
      .updateOne(
        { _id: snap.id },
        {
          $set: {
            name: snap.name,
            department: snap.department,
            description: snap.description,
            isActive: snap.isActive,
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
    name: string;
    department?: string;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): DemandQueue {
    return DemandQueue.fromSnapshot({
      id: demandQueueId(doc._id),
      name: doc.name,
      department: doc.department,
      description: doc.description,
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
