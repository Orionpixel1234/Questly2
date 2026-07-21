import { randomBytes, createHash } from 'crypto';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RegisterDto } from './dto/register.dto';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface JwtPayload {
  sub: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}

const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const REFRESH_KEY_PREFIX = 'refresh:';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches)
      throw new UnauthorizedException('Invalid credentials');
    if (user.banned) throw new UnauthorizedException('This account is banned');

    return toAuthenticatedUser(user);
  }

  async register(dto: RegisterDto): Promise<TokenPair> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const role = await this.prisma.role.findUniqueOrThrow({
      where: { name: dto.role },
    });
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        roleId: role.id,
        subjects: dto.subjects ?? [],
        degreeTrack: dto.degreeTrack,
        goalType: dto.goalType,
        goals: dto.goals?.length
          ? {
              create: dto.goals.map((goal) => ({
                subject: goal.subject,
                target: goal.target,
              })),
            }
          : undefined,
      },
      include: { role: true },
    });

    return this.issueTokens(toAuthenticatedUser(user));
  }

  async issueTokens(user: AuthenticatedUser): Promise<TokenPair> {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    const refreshToken = await this.createRefreshToken(user.id);
    return {
      accessToken: this.jwt.sign(payload),
      refreshToken,
      user,
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair | null> {
    const key = REFRESH_KEY_PREFIX + hashToken(refreshToken);
    const userId = await this.redis.client.get(key);
    if (!userId) return null;
    await this.redis.client.del(key);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    // A banned user's refresh token was already deleted above (single-use),
    // so this cuts them off within one JWT_ACCESS_TTL window (15m default)
    // of being banned, without needing to check on every single request.
    if (!user || user.banned) return null;

    return this.issueTokens(toAuthenticatedUser(user));
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    await this.redis.client.del(REFRESH_KEY_PREFIX + hashToken(refreshToken));
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches)
      throw new UnauthorizedException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const key = REFRESH_KEY_PREFIX + hashToken(token);
    await this.redis.client.set(key, userId, 'EX', REFRESH_TTL_SECONDS);
    return token;
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function toAuthenticatedUser(user: {
  id: string;
  email: string;
  name: string;
  role: { name: string };
}): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role.name,
  };
}
