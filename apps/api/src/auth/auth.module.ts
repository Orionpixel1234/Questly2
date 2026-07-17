import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

// Passport strategies (local + JWT) and guards land here in Phase 1.
@Module({
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
