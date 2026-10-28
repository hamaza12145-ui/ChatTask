import { Module, forwardRef } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { RealtimeService } from './realtime.service';
import { ControlModule } from '../control/control.module';
import { ChatModule } from '../chat/chat.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    forwardRef(() => ControlModule),
    forwardRef(() => ChatModule),
    AuthModule,
  ],
  providers: [SocketGateway, RealtimeService],
  exports: [SocketGateway, RealtimeService],
})
export class RealtimeModule {}
