import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * TenantGuard — injects tenantId from JWT into request.
 * Must be applied AFTER JwtAuthGuard.
 * Verifies the tenant (shop) is still active and not suspended.
 * Sets req.tenantId for downstream use in services.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Super admins have no tenant — they access everything
    if (user?.role === 'SUPER_ADMIN') {
      request.tenantId = null;
      return true;
    }

    if (!user?.tenantId) {
      throw new ForbiddenException('No tenant associated with this account');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { id: true, isActive: true, subscriptionStatus: true },
    });

    if (!tenant || !tenant.isActive) {
      throw new ForbiddenException('Shop account is suspended or not found');
    }

    // Inject tenantId into request for use in services
    request.tenantId = tenant.id;
    request.subscriptionStatus = tenant.subscriptionStatus;

    return true;
  }
}
