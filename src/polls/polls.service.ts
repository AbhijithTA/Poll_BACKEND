import { Injectable, NotFoundException, BadRequestException, ForbiddenException, InternalServerErrorException, ConflictException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Poll, PollDocument, PollVisibility } from '../schemas/poll.schema';
import { Vote, VoteDocument } from '../schemas/vote.schema';
import { UserDocument } from '../schemas/user.schema';

@Injectable()
export class PollsService {
  private readonly logger = new Logger(PollsService.name);

  constructor(
    @InjectModel(Poll.name) private pollModel: Model<PollDocument>,
    @InjectModel(Vote.name) private voteModel: Model<VoteDocument>,
    @InjectModel('User') private userModel: Model<UserDocument>,
  ) {}

  //=========================================================================================================================//
 
    // @desc    create poll
   
  async createPoll(pollData: {
    title: string;
    options: { text: string }[];
    visibility: PollVisibility;
    allowedUsers: string[];
    duration: number; 
    createdBy: any; 
  }) {
    try {
      this.logger.log(`Creating poll: ${pollData.title} by user: ${pollData.createdBy}`);

      // Enhanced validation
      await this.validatePollData(pollData);

      // Checking for duplicate poll titles
      const existingPoll = await this.pollModel.findOne({
        title: { $regex: new RegExp(`^${pollData.title}$`, 'i') },
        createdBy: new Types.ObjectId(pollData.createdBy)
      });

      if (existingPoll) {
        this.logger.warn(`Duplicate poll title attempt: ${pollData.title}`);
        throw new ConflictException('A poll with this title already exists');
      }

      // Validate allowed users for private polls
      if (pollData.visibility === PollVisibility.PRIVATE && pollData.allowedUsers.length > 0) {
        await this.validateAllowedUsers(pollData.allowedUsers);
      }

      // Calculating the expry time
      const expiresAt = new Date(Date.now() + pollData.duration * 60000);
      
      // Sanitizing the poll options
      const pollOptions = pollData.options.map(option => ({ 
        text: this.sanitizeInput(option.text), 
        votes: 0 
      }));

      const createdBy = typeof pollData.createdBy === 'string' 
        ? new Types.ObjectId(pollData.createdBy)
        : pollData.createdBy;

      const allowedUserObjectIds = pollData.allowedUsers.map(userId => new Types.ObjectId(userId));

      // Creating the poll
      const poll = await this.pollModel.create({
        title: this.sanitizeInput(pollData.title),
        options: pollOptions,
        visibility: pollData.visibility,
        allowedUsers: allowedUserObjectIds,
        expiresAt,
        createdBy: createdBy,
        isActive: true,
      });

      this.logger.log(`Poll created successfully: ${poll._id}`);
      return poll;

    } catch (error) {
      this.logger.error(`Failed to create poll: ${error.message}`, error.stack);
      
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      
      if (error.code === 11000) {
        throw new ConflictException('Poll with this title already exists');
      }
      
      throw new InternalServerErrorException('Failed to create poll');
    }
  }

  //=========================================================================================================================//

    // @desc    get polls for user

  async getPollsForUser(userId: string, userRole?: string) {
    const userObjectId = new Types.ObjectId(userId);
    
    const polls = await this.pollModel.find({
      $or: [
        { visibility: PollVisibility.PUBLIC },
        { 
          visibility: PollVisibility.PRIVATE,
          allowedUsers: userObjectId
        },
        ...(userRole === 'admin' ? [{ 
          visibility: PollVisibility.PRIVATE,
          createdBy: userObjectId
        }] : [])
      ],
      isActive: true
    }).populate('createdBy', 'name email');

    
    for (const poll of polls) {
      const votes = await this.voteModel.find({ poll: poll._id });
      
      poll.options.forEach(option => option.votes = 0);
      votes.forEach(vote => {
        if (vote.optionIndex >= 0 && vote.optionIndex < poll.options.length) {
          poll.options[vote.optionIndex].votes += 1;
        }
      });

      const userVote = await this.voteModel.findOne({
        user: userObjectId,
        poll: poll._id,
      });

      (poll as any).userVote = userVote ? userVote.optionIndex : null;
      (poll as any).hasVoted = !!userVote;
    }
    return polls;
  }

  //=========================================================================================================================//

    // @desc    get poll by id

  async getPollById(pollId: string, userId: string, userRole?: string) {
    const poll = await this.pollModel.findById(pollId).populate('createdBy', 'name email');
    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    // Checking the user is allowed to access the poll
    if (poll.visibility === PollVisibility.PRIVATE) {
      const userObjectId = new Types.ObjectId(userId);
      const isAllowed = poll.allowedUsers.some(allowedUserId => 
        allowedUserId.equals(userObjectId)
      );
      
      const isAdmin = userRole === 'admin';
      
      if (!isAllowed && !isAdmin) {
        throw new ForbiddenException('You are not allowed to access this poll');
      }
    }

    const votes = await this.voteModel.find({ poll: new Types.ObjectId(pollId) });
    
    poll.options.forEach(option => option.votes = 0);
    votes.forEach(vote => {
      if (vote.optionIndex >= 0 && vote.optionIndex < poll.options.length) {
        poll.options[vote.optionIndex].votes += 1;
      }
    });

    const userVote = await this.voteModel.findOne({
      user: new Types.ObjectId(userId),
      poll: new Types.ObjectId(pollId),
    });

    return {
      ...poll.toObject(),
      userVote: userVote ? userVote.optionIndex : null,
      hasVoted: !!userVote
    };
  }

  //=========================================================================================================================//

    // @desc    vote on poll

  async vote(pollId: string, userId: string, optionIndex: number, userRole?: string) {
    const poll = await this.pollModel.findById(pollId);
    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    // Preventing the admins from voting
    if (userRole === 'admin') {
      throw new ForbiddenException('Admins cannot vote in polls');
    }

    // checking the poll is active and not expired
    if (!poll.isActive || poll.expiresAt < new Date()) {
      throw new BadRequestException('Poll is no longer active');
    }

    if (poll.visibility === PollVisibility.PRIVATE) {
      const userObjectId = new Types.ObjectId(userId);
      const isAllowed = poll.allowedUsers.some(allowedUserId => 
        allowedUserId.equals(userObjectId)
      );
      
      if (!isAllowed) {
        throw new ForbiddenException('You are not allowed to vote in this poll');
      }
    }

    const existingVote = await this.voteModel.findOne({
      user: new Types.ObjectId(userId),
      poll: new Types.ObjectId(pollId),
    });

    if (existingVote) {
      throw new BadRequestException('You have already voted in this poll');
    }

    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      throw new BadRequestException('Invalid option index');
    }

    // Creating the vote record
    await this.voteModel.create({
      user: new Types.ObjectId(userId),
      poll: new Types.ObjectId(pollId),
      optionIndex,
    });

    
    const updatedPoll = await this.pollModel.findById(pollId).populate('createdBy', 'name email');
    
    if (!updatedPoll) {
      throw new NotFoundException('Poll not found after voting');
    }
    
    const votes = await this.voteModel.find({ poll: new Types.ObjectId(pollId) });
    
    updatedPoll.options.forEach(option => option.votes = 0);
    votes.forEach(vote => {
      if (vote.optionIndex >= 0 && vote.optionIndex < updatedPoll.options.length) {
        updatedPoll.options[vote.optionIndex].votes += 1;
      }
    });
    
    return { 
      message: 'Vote recorded successfully',
      poll: {
        ...updatedPoll.toObject(),
        userVote: optionIndex,
        hasVoted: true
      }
    };
  }

  //=========================================================================================================================//

    // @desc    get user votes

  async getUserVotes(userId: string) {
    const votes = await this.voteModel
      .find({ user: new Types.ObjectId(userId) })
      .populate('poll')
      .exec();

    // Calculating the vote counts for each poll
    for (const vote of votes) {
      const poll = vote.poll as any; 
      if (poll && poll.options) {
        const pollVotes = await this.voteModel.find({ poll: poll._id });
        
        poll.options.forEach(option => option.votes = 0);
        pollVotes.forEach(pollVote => {
          if (pollVote.optionIndex >= 0 && pollVote.optionIndex < poll.options.length) {
            poll.options[pollVote.optionIndex].votes += 1;
          }
        });
      }
    }

    return votes;
  }

  //=========================================================================================================================//

    // @desc    get poll results

  async getPollResults(pollId: string, userId: string, userRole?: string) {
    const poll = await this.getPollById(pollId, userId, userRole);
    
    // checking the user has voted in this poll or the poll is expired
    const userVote = await this.voteModel.findOne({
      user: new Types.ObjectId(userId),
      poll: new Types.ObjectId(pollId),
    });

    const isExpired = poll.expiresAt < new Date();

    if (!userVote && !isExpired) {
      throw new ForbiddenException('You can only view results after voting or when poll expires');
    }

    return {
      poll,
      totalVotes: poll.options.reduce((sum, option) => sum + option.votes, 0),
      userVote: userVote ? userVote.optionIndex : null,
    };
  }

  //=========================================================================================================================//

    // @desc    update poll

  async updatePoll(pollId: string, userId: string, updateData: any) {
    const poll = await this.pollModel.findById(pollId);
    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    
    if (!poll.createdBy.equals(new Types.ObjectId(userId))) {
      throw new ForbiddenException('You can only edit your own polls');
    }

    // Checking if poll is still active
    if (!poll.isActive) {
      throw new BadRequestException('Cannot edit inactive poll');
    }

    const optionsChanged = updateData.options && 
      JSON.stringify(updateData.options.map(opt => opt.text)) !== JSON.stringify(poll.options.map(opt => opt.text));

    if (optionsChanged) {
      // Deleting all existing votes for this poll
      await this.voteModel.deleteMany({ poll: new Types.ObjectId(pollId) });

      updateData.options = updateData.options.map(option => ({ text: option.text, votes: 0 }));
    }

    // Update poll
    Object.assign(poll, updateData);
    await poll.save();

    return poll;
  }

  //=========================================================================================================================//

    // @desc    delete poll

  async deletePoll(pollId: string, userId: string) {
    const poll = await this.pollModel.findById(pollId);
    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    // Checking if the user is the creator of the poll
    if (!poll.createdBy.equals(new Types.ObjectId(userId))) {
      throw new ForbiddenException('You can only delete your own polls');
    }

    await this.pollModel.findByIdAndDelete(pollId);
    await this.voteModel.deleteMany({ poll: new Types.ObjectId(pollId) });

    return { message: 'Poll deleted successfully' };
  }

  //=========================================================================================================================//

    // @desc    get admin polls
     
  async getAdminPolls(userId: string) {
    const polls = await this.pollModel
      .find({ createdBy: new Types.ObjectId(userId) })
      .populate('allowedUsers', 'name email')
      .sort({ createdAt: -1 });

    // Calculating the vote counts for each poll
    for (const poll of polls) {
      const votes = await this.voteModel.find({ poll: poll._id });

      
      poll.options.forEach(option => (option.votes = 0));
      votes.forEach(vote => {
        if (vote.optionIndex >= 0 && vote.optionIndex < poll.options.length) {
          poll.options[vote.optionIndex].votes += 1;
        }
      });
    }

    return polls;
  }

  //=========================================================================================================================//


    // @desc    validate poll data

  private async validatePollData(pollData: any): Promise<void> {
    // duration
    if (pollData.duration < 1 || pollData.duration > 120) {
      throw new BadRequestException('Poll duration must be between 1 and 120 minutes');
    }

    // title
    if (!pollData.title || pollData.title.trim().length < 3) {
      throw new BadRequestException('Poll title must be at least 3 characters long');
    }

    if (pollData.title.length > 500) {
      throw new BadRequestException('Poll title cannot exceed 500 characters');
    }

    // options
    if (!pollData.options || pollData.options.length < 2) {
      throw new BadRequestException('At least 2 options are required');
    }

    if (pollData.options.length > 10) {
      throw new BadRequestException('Maximum 10 options allowed');
    }

    // options
    for (const option of pollData.options) {
      if (!option.text || option.text.trim().length === 0) {
        throw new BadRequestException('All options must have text');
      }
      if (option.text.length > 200) {
        throw new BadRequestException('Option text cannot exceed 200 characters');
      }
    }

    // private poll
    if (pollData.visibility === PollVisibility.PRIVATE) {
      if (!pollData.allowedUsers || pollData.allowedUsers.length === 0) {
        throw new BadRequestException('Private polls must have at least one allowed user');
      }
      if (pollData.allowedUsers.length > 50) {
        throw new BadRequestException('Private polls cannot have more than 50 allowed users');
      }
    }
  }

  //=========================================================================================================================//


  // @desc    validate allowed users

  private async validateAllowedUsers(allowedUsers: string[]): Promise<void> {
    try {
      const userObjectIds = allowedUsers.map(userId => new Types.ObjectId(userId));
      const existingUsers = await this.userModel.find({
        _id: { $in: userObjectIds }
      });
      
      if (existingUsers.length !== allowedUsers.length) {
        throw new BadRequestException('One or more selected users do not exist');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error validating allowed users: ${error.message}`);
      throw new BadRequestException('Failed to validate allowed users');
    }
  }

  //=========================================================================================================================//

  // @desc    sanitize input

  private sanitizeInput(input: string): string {
    if (!input) return '';
    
    // Basic sanitization - remove potentially dangerous characters
    return input
      .trim()
      .replace(/[<>]/g, '') 
      .replace(/javascript:/gi, '') 
      .replace(/on\w+=/gi, ''); 
  }

  //=========================================================================================================================//

}