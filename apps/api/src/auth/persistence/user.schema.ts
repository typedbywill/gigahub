import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<UserModel>;

@Schema({ collection: 'users', timestamps: true })
export class UserModel {
  @Prop({ required: true })
  _id!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, enum: ['active', 'blocked'] })
  status!: 'active' | 'blocked';

  @Prop({ required: true, default: 0 })
  authorizationVersion!: number;

  @Prop({ unique: true, sparse: true, index: true })
  idErp?: string;

  @Prop()
  idErpEmployee?: string;

  @Prop()
  jobTitle?: string;

  @Prop()
  cashboxId?: string;

  @Prop()
  warehouseId?: string;

  @Prop()
  planningId?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserModel);
