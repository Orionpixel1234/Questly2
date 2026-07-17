import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  getAllUsers() {
    return this.prisma.user.findMany({ include: { role: true } });
  }

  getUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  }

  getUsersByName(name: string) {
    return this.prisma.user.findMany({
      where: { name: { contains: name, mode: 'insensitive' } },
      include: { role: true },
    });
  }
}
