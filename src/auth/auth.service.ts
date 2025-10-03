import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../schemas/user.schema';


@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  //=========================================================================================================================//

  // @desc    register user
  // @route   post /api/auth/register
  // @access  public

  async register(userData: { name: string; email: string; password: string; role?: string }) {
    try {
      const { email, password, name } = userData;

      // validation
      if (!this.isValidEmail(email)) {
        throw new BadRequestException('Invalid email format');
      }

      if (!this.isStrongPassword(password)) {
        throw new BadRequestException('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
      }

      if (!this.isValidName(name)) {
        throw new BadRequestException('Name must be between 2 and 50 characters and contain only letters and spaces');
      }

      // User exist check
      const existingUser = await this.userModel.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        this.logger.warn(`Registration attempt with existing email: ${email}`);
        throw new ConflictException('User already exists');
      }

      // Password hasj
      const hashedPassword = await bcrypt.hash(password, this.saltRounds);

      // user create
      const user = await this.userModel.create({
        ...userData,
        email: email.toLowerCase(),
        password: hashedPassword,
      });

      const userId = (user._id as Types.ObjectId).toString();
      const token = this.jwtService.sign({ id: userId, email: user.email, role: user.role });

      return {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error) {
      this.logger.error(`Registration failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  //=========================================================================================================================//

  // @desc    login user (Added logger for unauthorized or invalid credentials attempts)
  // @route   post /api/auth/login
  // @access  public

  async login(credentials: { email: string; password: string }) {
    try {
      const { email, password } = credentials;

      // Validation
      if (!email || !password) {
        throw new BadRequestException('Email and password are required');
      }

      // User finding
      const user = await this.userModel.findOne({ email: email.toLowerCase() });
      if (!user) {
        this.logger.warn(`Login attempt with non-existent email: ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Password comparing
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        this.logger.warn(`Invalid password attempt for user: ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      const userId = (user._id as Types.ObjectId).toString();
      const token = this.jwtService.sign({ id: userId, email: user.email, role: user.role });

      return {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error) {
      this.logger.error(`Login failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  //=========================================================================================================================//

  // @desc    validate user
  // @route   post /api/auth/validate-user
  // @access  public

  async validateUser(payload: any) {
    try {
      if (!payload?.id) {
        return null;
      }
      return await this.userModel.findById(payload.id);
    } catch (error) {
      this.logger.error(`User validation failed: ${error.message}`, error.stack);
      return null;
    }
  }

  //=========================================================================================================================//

  // @desc    search users

  async searchUsers(query: string) {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }

      // Query sanitization
      const sanitizedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(sanitizedQuery, 'i');
      
      const users = await this.userModel.find({
        $or: [
          { name: { $regex: searchRegex } },
          { email: { $regex: searchRegex } }
        ]
      }).select('name email _id').limit(10);

      return users.map(user => ({
        id: (user._id as Types.ObjectId).toString(),
        name: user.name,
        email: user.email
      }));
    } catch (error) {
      this.logger.error(`User search failed: ${error.message}`, error.stack);
      return [];
    }
  }

  //=========================================================================================================================//

  // @desc    validate email

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  //=========================================================================================================================//

  // @desc    validate password

  private isStrongPassword(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  }

  //=========================================================================================================================//

  // @desc    validate name

  private isValidName(name: string): boolean {
    const nameRegex = /^[a-zA-Z\s]{2,50}$/;
    return nameRegex.test(name);
  }

  //=========================================================================================================================//
}