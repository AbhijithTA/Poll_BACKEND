import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PollsController } from './polls.controller';
import { PollsService } from './polls.service';
import { Poll, PollSchema } from '../schemas/poll.schema';
import { Vote, VoteSchema } from '../schemas/vote.schema';
import { User, UserSchema } from '../schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Poll.name, schema: PollSchema },
      { name: Vote.name, schema: VoteSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [PollsController],
  providers: [PollsService],
})
export class PollsModule {}