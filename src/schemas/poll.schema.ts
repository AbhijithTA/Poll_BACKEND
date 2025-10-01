import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';

export type PollDocument = Poll & Document;

export enum PollVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export class PollOption {
  @Prop({ required: true })
  text: string;

  @Prop({ default: 0 })
  votes: number;
}

@Schema({ timestamps: true })
export class Poll {
  @Prop({ required: true })
  title: string;

  @Prop({ type: [PollOption], required: true })
  options: PollOption[];

  @Prop({ type: String, enum: PollVisibility, default: PollVisibility.PUBLIC })
  visibility: PollVisibility;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  allowedUsers: Types.ObjectId[];

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;
}

export const PollSchema = SchemaFactory.createForClass(Poll);

// DB Indexes
PollSchema.index({ createdBy: 1, createdAt: -1 }); 
PollSchema.index({ visibility: 1, isActive: 1 }); 
PollSchema.index({ expiresAt: 1 }); 
PollSchema.index({ title: 1, createdBy: 1 }); 