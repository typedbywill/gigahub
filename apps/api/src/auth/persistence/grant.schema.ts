import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GrantDocument = HydratedDocument<GrantModel>;

@Schema({ collection: 'grants', timestamps: true })
export class GrantModel {
  @Prop({ required: true })
  _id!: string;

  @Prop({ required: true, enum: ['role', 'permission'] })
  kind!: 'role' | 'permission';

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true })
  grantedByUserId!: string;

  @Prop()
  roleId?: string;

  @Prop()
  permissionId?: string;

  @Prop()
  reason?: string;

  @Prop()
  expiresAt?: Date;

  @Prop()
  revokedAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const GrantSchema = SchemaFactory.createForClass(GrantModel);
GrantSchema.index({ userId: 1, kind: 1 });
