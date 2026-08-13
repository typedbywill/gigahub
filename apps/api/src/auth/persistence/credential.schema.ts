import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CredentialDocument = HydratedDocument<CredentialModel>;

@Schema({ collection: 'credentials', timestamps: true })
export class CredentialModel {
  @Prop({ required: true })
  _id!: string;

  @Prop({ required: true, unique: true, index: true })
  userId!: string;

  @Prop({ required: true })
  passwordHash!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const CredentialSchema = SchemaFactory.createForClass(CredentialModel);
