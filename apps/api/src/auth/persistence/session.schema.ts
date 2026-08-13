import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SessionDocument = HydratedDocument<SessionModel>;

@Schema({ collection: 'sessions', timestamps: true })
export class SessionModel {
  @Prop({ required: true })
  _id!: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, index: true })
  familyId!: string;

  @Prop({ required: true, unique: true, index: true })
  refreshTokenHash!: string;

  @Prop()
  previousRefreshTokenHash?: string;

  @Prop()
  deviceLabel?: string;

  @Prop({ required: true })
  absoluteExpiresAt!: Date;

  @Prop()
  revokedAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const SessionSchema = SchemaFactory.createForClass(SessionModel);
SessionSchema.index({ previousRefreshTokenHash: 1 }, { sparse: true });
