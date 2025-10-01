import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';


//=========================================================================================================================//

// @desc    JWT authentication strategy

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback-secret',
      algorithms: ['HS256'], 
    });
  }

  //=========================================================================================================================//

  // @desc    validate JWT payload

  async validate(payload: any) {
    try {
      // Validating payload structure
      if (!payload || !payload.id || !payload.email) {
        this.logger.warn('Invalid JWT payload structure');
        throw new UnauthorizedException('Invalid token payload');
      }

      // User validation
      const user = await this.authService.validateUser(payload);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      
      const userId = (user._id as Types.ObjectId).toString();
      const normalizedUser = {
        _id: userId,
        id: userId,
        email: user.email,
        name: user.name,
        role: user.role,
      };
      return normalizedUser;
    } catch (error) {
      this.logger.error(`JWT validation error: ${error.message}`, error.stack);
      throw new UnauthorizedException('Token validation failed');
    }
  }

  //=========================================================================================================================//

}