import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    Req,
    UsePipes,
    ValidationPipe,
  } from '@nestjs/common';
  import { AuthGuard } from '@nestjs/passport';
  import { PollsService } from './polls.service';
  import { RolesGuard } from '../guards/roles.guards';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';
import { PollVisibility } from '../schemas/poll.schema';
import { CreatePollDto, UpdatePollDto, VoteDto } from '../dto/poll.dto';
  
  @Controller('polls')
  @UseGuards(AuthGuard('jwt'))
  export class PollsController {
    constructor(private pollsService: PollsService) {}
  
  //=========================================================================================================================//

    @Post()
    // @desc    create poll
    // @route   post /api/polls
    // @access  admin

    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    async createPoll(@Body() pollData: CreatePollDto, @Req() req) {
      return this.pollsService.createPoll({
        title: pollData.title,
        options: pollData.options,
        visibility: pollData.visibility || PollVisibility.PUBLIC,
        allowedUsers: pollData.allowedUsers || [],
        duration: pollData.duration,
        createdBy: req.user._id,
      });
    }
  
  //=========================================================================================================================//


    @Get()
    // @desc    get polls
    // @route   get /api/polls
    // @access  user

    async getPolls(@Req() req) {
      return this.pollsService.getPollsForUser(req.user._id, req.user.role);
    }

  //=========================================================================================================================//
  
     @Get('admin')
    // @desc    get admin polls
    // @route   get /api/polls/admin
    // @access  admin

    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async getAdminPolls(@Req() req) {
      return this.pollsService.getAdminPolls(req.user._id);
    }

  //=========================================================================================================================//
  
    @Get(':id')
    // @desc    get poll
    // @route   get /api/polls/:id
    // @access  user

    async getPoll(@Param('id') id: string, @Req() req) {
      return this.pollsService.getPollById(id, req.user._id, req.user.role);
    }
  
  //=========================================================================================================================//
  
    @Post(':id/vote')
    // @desc    vote on poll
    // @route   post /api/polls/:id/vote
    // @access  user

    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    async vote(
      @Param('id') pollId: string,
      @Body() body: VoteDto,
      @Req() req,
    ) {
      return this.pollsService.vote(pollId, req.user._id, body.optionIndex, req.user.role);
    }

  //=========================================================================================================================//
  
    @Get(':id/results')
    // @desc    get poll results
    // @route   get /api/polls/:id/results
    // @access  user

    async getResults(@Param('id') pollId: string, @Req() req) {
      return this.pollsService.getPollResults(pollId, req.user._id, req.user.role);
    }
  
  //=========================================================================================================================//
  
  
    @Put(':id')
    // @desc    update poll
    // @route   put /api/polls/:id
    // @access  admin

    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    async updatePoll(
      @Param('id') pollId: string,
      @Body() updateData: UpdatePollDto,
      @Req() req,
    ) {
      return this.pollsService.updatePoll(pollId, req.user._id, updateData);
    }

  //=========================================================================================================================//
  
  
    @Delete(':id')
    // @desc    delete poll
    // @route   delete /api/polls/:id
    // @access  admin

    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async deletePoll(@Param('id') pollId: string, @Req() req) {
      return this.pollsService.deletePoll(pollId, req.user._id);
    }

  //=========================================================================================================================//
  
  
    @Get('user/votes')
    // @desc    get user votes
    // @route   get /api/polls/user/votes
    // @access  user

    async getUserVotes(@Req() req) {
      return this.pollsService.getUserVotes(req.user._id);
    }
    
  //=========================================================================================================================//
  
  }