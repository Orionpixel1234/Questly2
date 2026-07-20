import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

// Every read here omits passwordHash explicitly — it must never round-trip
// over the API even though it's a real column on the model.
const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: { select: { name: true } },
  subjects: true,
  degreeTrack: true,
  goalType: true,
  createdAt: true,
  updatedAt: true,
} as const;

type RawUser = {
  id: string;
  email: string;
  name: string;
  role: { name: string };
  subjects: string[];
  degreeTrack: string | null;
  goalType: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Flattens Prisma's nested `role: { name }` relation into a plain string —
// matches the AuthUser/UserProfile shape from @questly/shared-types that
// the frontend actually expects, instead of leaking the relation shape.
function toPublicUser(user: RawUser) {
  return { ...user, role: user.role.name };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      select: PUBLIC_USER_SELECT,
    });
    return users.map(toPublicUser);
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_USER_SELECT,
    });
    return user ? toPublicUser(user) : null;
  }

  async getUsersByName(name: string) {
    const users = await this.prisma.user.findMany({
      where: { name: { contains: name, mode: 'insensitive' } },
      select: PUBLIC_USER_SELECT,
    });
    return users.map(toPublicUser);
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: PUBLIC_USER_SELECT,
    });
    return toPublicUser(user);
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUniqueOrThrow({
      where: { name: dto.role },
    });
    const user = await this.prisma.user.update({
      where: { id },
      data: { roleId: role.id },
      select: PUBLIC_USER_SELECT,
    });
    return toPublicUser(user);
  }
}
