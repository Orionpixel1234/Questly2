import { Controller, Get, Param, Query } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Get('search')
  getUsersByName(@Query('name') name: string) {
    return this.usersService.getUsersByName(name);
  }

  @Get(':id')
  getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }
}
