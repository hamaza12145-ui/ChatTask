import { Module, forwardRef } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { RealtimeService } from './realtime.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [SocketGateway, RealtimeService],
  exports: [SocketGateway, RealtimeService],
})
export class RealtimeModule {}
