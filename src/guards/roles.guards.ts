import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../schemas/user.schema';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<UserRole[]>('roles', context.getHandler());
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const allowed = requiredRoles.includes(user?.role);
    if (!allowed) {
      Logger.warn(`Role check failed for user=${user?.email} role=${user?.role}, required=${requiredRoles.join(',')}`, 'RolesGuard');
    }
    return allowed;
  }
}