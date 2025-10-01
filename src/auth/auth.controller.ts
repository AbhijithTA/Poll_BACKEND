import { Controller, Post, Get, Body, UseGuards, Req, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../guards/roles.guards';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  //=========================================================================================================================//

  // @desc    register user

  @Post('register')
  async register(@Body() userData: { name: string; email: string; password: string; role?: string }) {
    return this.authService.register(userData);
  }

  //=========================================================================================================================//

  // @desc    login user

  @Post('login')
  async login(@Body() credentials: { email: string; password: string }) {
    return this.authService.login(credentials);
  }

  //=========================================================================================================================//

  // @desc    logout user

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout() {
    return { message: 'Logged out successfully' };
  }

  //=========================================================================================================================//

  // @desc    search users

  @Get('search-users')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async searchUsers(@Query('q') query: string) {
    return this.authService.searchUsers(query);
  }

  //=========================================================================================================================//

}