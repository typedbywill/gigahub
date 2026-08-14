import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DemandQueueDocument = HydratedDocument<DemandQueueModel>;

@Schema({ collection: 'demand_queues', timestamps: true })
export class DemandQueueModel {
  @Prop({ required: true })
  _id!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true })
  department?: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, default: true })
  isActive!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const DemandQueueSchema = SchemaFactory.createForClass(DemandQueueModel);
