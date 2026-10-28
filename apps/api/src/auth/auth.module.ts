import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TenancyModule } from '../tenancy/tenancy.module';
import { ControlModule } from '../control/control.module';

@Module({
  imports: [
    TenancyModule,
    forwardRef(() => ControlModule),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'chat-task-jwt-access-secret-32-chars-long-secure',
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
