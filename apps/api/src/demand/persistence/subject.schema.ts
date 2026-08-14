import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SubjectDocument = HydratedDocument<SubjectModel>;

export class SubjectParamModel {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  label!: string;

  @Prop({ required: true })
  type!: string;

  @Prop({ required: true, default: false })
  required!: boolean;

  @Prop({ type: [String] })
  options?: string[];

  @Prop()
  placeholder?: string;
}

@Schema({ collection: 'demand_subjects', timestamps: true })
export class SubjectModel {
  @Prop({ required: true })
  _id!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  defaultQueueId?: string;

  @Prop({ type: [SubjectParamModel], default: [] })
  params!: SubjectParamModel[];

  @Prop({ required: true, default: true })
  isActive!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const SubjectSchema = SchemaFactory.createForClass(SubjectModel);
