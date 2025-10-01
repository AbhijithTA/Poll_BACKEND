import { IsString, IsNotEmpty, IsArray, IsEnum, IsOptional, IsNumber, Min, Max, ArrayMinSize, ArrayMaxSize, Length, ValidateNested, IsEmail, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { PollVisibility } from '../schemas/poll.schema';

export class PollOptionDto {
  @IsString({ message: 'Option text must be a string' })
  @IsNotEmpty({ message: 'Option text cannot be empty' })
  @Length(1, 200, { message: 'Option text must be between 1 and 200 characters' })
  text: string;
}

export class CreatePollDto {
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title cannot be empty' })
  @Length(3, 500, { message: 'Title must be between 3 and 500 characters' })
  title: string;

  @IsArray({ message: 'Options must be an array' })
  @ArrayMinSize(2, { message: 'At least 2 options are required' })
  @ArrayMaxSize(10, { message: 'Maximum 10 options allowed' })
  @ValidateNested({ each: true })
  @Type(() => PollOptionDto)
  options: PollOptionDto[];

  @IsEnum(PollVisibility, { message: 'Visibility must be either public or private' })
  @IsOptional()
  visibility?: PollVisibility;

  @IsArray({ message: 'Allowed users must be an array' })
  @IsOptional()
  @ArrayMaxSize(50, { message: 'Maximum 50 users allowed for private polls' })
  @Matches(/^[0-9a-fA-F]{24}$/, { each: true, message: 'Each allowed user must be a valid user ID' })
  allowedUsers?: string[];

  @IsNumber({}, { message: 'Duration must be a number' })
  @Min(1, { message: 'Duration must be at least 1 minute' })
  @Max(120, { message: 'Duration cannot exceed 120 minutes (2 hours)' })
  duration: number;
}

export class UpdatePollDto {
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title cannot be empty' })
  @Length(3, 500, { message: 'Title must be between 3 and 500 characters' })
  title: string;

  @IsArray({ message: 'Options must be an array' })
  @ArrayMinSize(2, { message: 'At least 2 options are required' })
  @ArrayMaxSize(10, { message: 'Maximum 10 options allowed' })
  @ValidateNested({ each: true })
  @Type(() => PollOptionDto)
  options: PollOptionDto[];

  @IsEnum(PollVisibility, { message: 'Visibility must be either public or private' })
  @IsOptional()
  visibility?: PollVisibility;

  @IsArray({ message: 'Allowed users must be an array' })
  @IsOptional()
  @ArrayMaxSize(50, { message: 'Maximum 50 users allowed for private polls' })
  @Matches(/^[0-9a-fA-F]{24}$/, { each: true, message: 'Each allowed user must be a valid user ID' })
  allowedUsers?: string[];

  @IsNumber({}, { message: 'Duration must be a number' })
  @Min(1, { message: 'Duration must be at least 1 minute' })
  @Max(120, { message: 'Duration cannot exceed 120 minutes (2 hours)' })
  duration: number;
}

export class VoteDto {
  @IsNumber({}, { message: 'Option index must be a number' })
  @Min(0, { message: 'Option index must be a valid positive number' })
  optionIndex: number;
}
