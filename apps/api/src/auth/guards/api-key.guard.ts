import { timingSafeEqual } from 'crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

// Separate from JwtAuthGuard on purpose: external services (e.g. a Zapier
// AI Agent) authenticate with one static shared secret, not a per-user
// login session. Never mix this with a route that also expects req.user —
// nothing sets it here.
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.header('x-api-key');
    const expected = process.env['AGENT_API_KEY'];

    if (!expected) {
      throw new UnauthorizedException('Agent integration is not configured');
    }
    if (!provided || !safeEqual(provided, expected)) {
      throw new UnauthorizedException('Invalid API key');
    }
    return true;
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // Lengths must match before timingSafeEqual (it throws otherwise) — the
  // length check itself doesn't leak the secret's content, only its length.
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}
