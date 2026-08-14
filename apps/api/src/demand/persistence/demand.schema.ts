import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, HydratedDocument } from 'mongoose';

export type DemandDocument = HydratedDocument<DemandModel>;

@Schema({ collection: 'demands', timestamps: true })
export class DemandModel {
  @Prop({ required: true })
  _id!: string;

  @Prop({ required: true, index: true })
  queueId!: string;

  @Prop({ required: true, index: true })
  subjectId!: string;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  values!: Record<string, unknown>;

  @Prop({ type: [String], default: [], index: true })
  customerIds!: string[];

  @Prop({ required: true, index: true })
  openedByUserId!: string;

  @Prop({ required: true, index: true })
  status!: string;

  @Prop({ index: true, sparse: true })
  assignedAgentId?: string;

  @Prop({ required: true })
  openedAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const DemandSchema = SchemaFactory.createForClass(DemandModel);
DemandSchema.index({ createdAt: -1 });
DemandSchema.index({ status: 1, assignedAgentId: 1 });
DemandSchema.index({ status: 1, queueId: 1 });
