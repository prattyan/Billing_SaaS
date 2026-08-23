import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { JwtPayload, AuthTokens } from '../types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ── Register new shop owner ──────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    // Generate URL-safe slug from shop name
    const baseSlug = dto.shopName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const slug = `${baseSlug}-${uuidv4().slice(0, 6)}`;

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create tenant + owner user in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.shopName,
          slug,
          planTier: 'STARTER',
          subscriptionStatus: 'ACTIVE',
          // Free STARTER tier gets 1 year by default
          subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      // Default shop settings
      await tx.shopSettings.create({
        data: {
          tenantId: tenant.id,
          billPrefix: slug.slice(0, 4).toUpperCase(),
          requireCustomerPhone: false,
          whatsappEnabled: true,
        },
      });

      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: dto.ownerName,
          phone: dto.phone,
          passwordHash,
          role: 'OWNER',
          tenantId: tenant.id,
        },
      });

      return { tenant, user };
    });

    this.logger.log(`New shop registered: ${result.tenant.name} (${result.tenant.id})`);

    const tokens = await this.generateTokens(result.user.id, result.user.email, 'OWNER', result.tenant.id);

    return {
      user: this.sanitizeUser(result.user),
      tenant: result.tenant,
      ...tokens,
    };
  }

  // ── Login ────────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    this.logger.log(`Attempting login for email: "${dto.email}"`);
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
      include: { tenant: true },
    });

    if (!user) {
      this.logger.warn(`User not found for email: "${dto.email}"`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      this.logger.warn(`User is inactive: "${dto.email}"`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      this.logger.warn(`Password mismatch for user: "${dto.email}"`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.tenantId);

    return {
      user: this.sanitizeUser(user),
      tenant: user.tenant,
      ...tokens,
    };
  }

  // ── Refresh tokens ───────────────────────────────────────────────────────────

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!stored.user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Rotate refresh token (delete old, issue new)
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const tokens = await this.generateTokens(
      stored.user.id,
      stored.user.email,
      stored.user.role,
      stored.user.tenantId,
    );

    return tokens;
  }

  // ── Logout ───────────────────────────────────────────────────────────────────

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
    return { message: 'Logged out successfully' };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    tenantId: string | null,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role: role as any,
      tenantId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiresIn', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn', '7d'),
      }),
    ]);

    // Persist refresh token (7 days)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: { userId, token: refreshToken, expiresAt },
    });

    return { accessToken, refreshToken, expiresIn: 900 }; // 15min in seconds
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
