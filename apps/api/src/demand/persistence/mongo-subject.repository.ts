import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Subject,
  type ParamType,
  type SubjectParam,
} from '@gigahub/domain/demand';
import type { SubjectRepository } from '@gigahub/application-demand';
import {
  demandQueueId,
  subjectId,
  type SubjectId,
} from '@gigahub/shared/kernel';
import { SubjectModel } from './subject.schema';

@Injectable()
export class MongoSubjectRepository implements SubjectRepository {
  constructor(
    @InjectModel(SubjectModel.name)
    private readonly model: Model<SubjectModel>,
  ) {}

  async findById(id: SubjectId): Promise<Subject | null> {
    const doc = await this.model.findById(String(id)).lean().exec();
    return doc ? this.toDomain(doc) : null;
  }

  async list(activeOnly = false): Promise<Subject[]> {
    const filter = activeOnly ? { isActive: true } : {};
    const docs = await this.model
      .find(filter)
      .sort({ name: 1 })
      .lean()
      .exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async save(subject: Subject): Promise<void> {
    const snap = subject.toSnapshot();
    await this.model
      .updateOne(
        { _id: snap.id },
        {
          $set: {
            name: snap.name,
            description: snap.description,
            defaultQueueId: snap.defaultQueueId
              ? String(snap.defaultQueueId)
              : undefined,
            params: snap.params.map((p) => ({
              id: p.id,
              label: p.label,
              type: p.type,
              required: p.required,
              options: p.options ? [...p.options] : undefined,
              placeholder: p.placeholder,
            })),
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
    description?: string;
    defaultQueueId?: string;
    params: Array<{
      id: string;
      label: string;
      type: string;
      required: boolean;
      options?: string[];
      placeholder?: string;
    }>;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): Subject {
    return Subject.fromSnapshot({
      id: subjectId(doc._id),
      name: doc.name,
      description: doc.description,
      defaultQueueId: doc.defaultQueueId
        ? demandQueueId(doc.defaultQueueId)
        : undefined,
      params: (doc.params ?? []).map(
        (p): SubjectParam => ({
          id: p.id,
          label: p.label,
          type: p.type as ParamType,
          required: p.required,
          options: p.options ? [...p.options] : undefined,
          placeholder: p.placeholder,
        }),
      ),
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
