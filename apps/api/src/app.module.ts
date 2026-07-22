import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { LessonsModule } from './lessons/lessons.module';
import { ClassesModule } from './classes/classes.module';
import { ProgressModule } from './progress/progress.module';
import { CalendarModule } from './calendar/calendar.module';
import { MetricsModule } from './metrics/metrics.module';
import { AiModule } from './ai/ai.module';
import { GameModule } from './game/game.module';
import { AgentModule } from './agent/agent.module';
import { OutpostModule } from './outpost/outpost.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    UsersModule,
    AuthModule,
    LessonsModule,
    ClassesModule,
    ProgressModule,
    CalendarModule,
    MetricsModule,
    AiModule,
    GameModule,
    AgentModule,
    OutpostModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
