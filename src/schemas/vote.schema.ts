import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { Poll } from './poll.schema';

export type VoteDocument = Vote & Document;

@Schema({ timestamps: true })
export class Vote {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Poll', required: true })
  poll: Types.ObjectId;

  @Prop({ required: true })
  optionIndex: number;
}

export const VoteSchema = SchemaFactory.createForClass(Vote);


// Db index
VoteSchema.index({ user: 1, poll: 1 }, { unique: true }); 
VoteSchema.index({ user: 1, createdAt: -1 }); 
VoteSchema.index({ poll: 1, createdAt: -1 }); 