import { SetMetadata } from '@nestjs/common';
import { Role } from '@billing-saas/types';

export const ROLES_KEY = 'roles';

/** Decorator to restrict a route to specific roles */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
