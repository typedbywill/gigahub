import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Demand, type DemandStatus } from '@gigahub/domain/demand';
import type {
  DemandCountsResult,
  DemandListQuery,
  DemandListResult,
  DemandRepository,
} from '@gigahub/application-demand';
import {
  customerId,
  type CustomerId,
  demandId,
  type DemandId,
  demandQueueId,
  subjectId,
  type UserId,
  userId,
} from '@gigahub/shared/kernel';
import { DemandModel } from './demand.schema';

@Injectable()
export class MongoDemandRepository implements DemandRepository {
  constructor(
    @InjectModel(DemandModel.name)
    private readonly model: Model<DemandModel>,
  ) {}

  async findById(id: DemandId): Promise<Demand | null> {
    const doc = await this.model.findById(String(id)).lean().exec();
    return doc ? this.toDomain(doc) : null;
  }

  async list(query: DemandListQuery): Promise<DemandListResult> {
    const filter: Record<string, unknown> = {};

    if (query.view === 'mine') {
      filter.assignedAgentId = query.actorUserId ? String(query.actorUserId) : undefined;
    } else if (query.view === 'queue') {
      filter.status = 'queued';
    } else if (query.view === 'claimed') {
      filter.assignedAgentId = query.actorUserId ? String(query.actorUserId) : undefined;
      filter.status = { $in: ['in_progress', 'waiting'] };
    }

    if (query.status) {
      filter.status = query.status;
    }
    if (query.subjectId) {
      filter.subjectId = query.subjectId;
    }
    if (query.queueId) {
      filter.queueId = query.queueId;
    }
    if (query.customerId) {
      filter.customerIds = query.customerId;
    }

    if (query.q?.trim()) {
      const q = query.q.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { _id: { $regex: q, $options: 'i' } },
      ];
    }

    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const [docs, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((doc) => this.toDomain(doc)),
      total,
    };
  }

  async countByViews(actorUserId: UserId): Promise<DemandCountsResult> {
    const actorIdStr = String(actorUserId);

    const [inbox, queue, claimed, all] = await Promise.all([
      this.model.countDocuments({ assignedAgentId: actorIdStr }).exec(),
      this.model.countDocuments({ status: 'queued' }).exec(),
      this.model
        .countDocuments({
          assignedAgentId: actorIdStr,
          status: { $in: ['in_progress', 'waiting'] },
        })
        .exec(),
      this.model.countDocuments({}).exec(),
    ]);

    return { inbox, queue, claimed, all };
  }

  async save(demand: Demand): Promise<void> {
    const snap = demand.toSnapshot();
    await this.model
      .updateOne(
        { _id: snap.id },
        {
          $set: {
            queueId: String(snap.queueId),
            subjectId: String(snap.subjectId),
            title: snap.title,
            values: snap.values,
            customerIds: snap.customerIds.map(String),
            openedByUserId: String(snap.openedByUserId),
            status: snap.status,
            assignedAgentId: snap.assignedAgentId
              ? String(snap.assignedAgentId)
              : undefined,
            openedAt: snap.openedAt,
            updatedAt: snap.updatedAt,
          },
          $setOnInsert: {
            _id: snap.id,
            createdAt: snap.openedAt,
          },
        },
        { upsert: true },
      )
      .exec();
  }

  private toDomain(doc: {
    _id: string;
    queueId: string;
    subjectId: string;
    title: string;
    values?: Record<string, unknown>;
    customerIds?: string[];
    openedByUserId: string;
    status: string;
    assignedAgentId?: string;
    openedAt: Date;
    updatedAt: Date;
  }): Demand {
    return Demand.fromSnapshot({
      id: demandId(doc._id),
      queueId: demandQueueId(doc.queueId),
      subjectId: subjectId(doc.subjectId),
      title: doc.title,
      values: doc.values ?? {},
      customerIds: (doc.customerIds ?? []).map((cid) =>
        customerId(cid) as CustomerId,
      ),
      openedByUserId: userId(doc.openedByUserId),
      status: doc.status as DemandStatus,
      assignedAgentId: doc.assignedAgentId
        ? userId(doc.assignedAgentId)
        : undefined,
      openedAt: doc.openedAt,
      updatedAt: doc.updatedAt,
    });
  }
}
