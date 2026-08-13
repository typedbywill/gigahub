import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RoleDocument = HydratedDocument<RoleModel>;

@Schema({ collection: 'roles', timestamps: true })
export class RoleModel {
  @Prop({ required: true })
  _id!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ type: [String], required: true, default: [] })
  permissionIds!: string[];

  @Prop({ required: true, enum: ['active', 'archived'], default: 'active' })
  status!: 'active' | 'archived';

  createdAt!: Date;
  updatedAt!: Date;
}

export const RoleSchema = SchemaFactory.createForClass(RoleModel);
