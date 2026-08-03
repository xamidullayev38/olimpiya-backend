import {
  ConnectedSocket,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { DashboardService } from './dashboard.service';

/**
 * Real-time dashboard uchun WebSocket kanal. Ulanish paytida staff JWT access token
 * majburiy (query param yoki auth handshake orqali) - anonim ulanishlarga ruxsat yo'q.
 */
@WebSocketGateway({
  namespace: 'dashboard',
  path: '/api/v1/socket.io',
  cors: { origin: true, credentials: true },
})
export class DashboardGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private dashboardService: DashboardService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string);
      if (!token) throw new UnauthorizedException();

      await this.jwtService.verifyAsync(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      client.disconnect(true);
      return;
    }

    const stats = await this.dashboardService.getLiveStats();
    client.emit('stats', stats);
  }

  @SubscribeMessage('requestStats')
  async onRequestStats(@ConnectedSocket() client: Socket) {
    const stats = await this.dashboardService.getLiveStats();
    client.emit('stats', stats);
  }

  // Har bir muvaffaqiyatli skandan keyin ScanService tomonidan chaqirilishi mumkin (event-driven push)
  async broadcastStats() {
    const stats = await this.dashboardService.getLiveStats();
    this.server.emit('stats', stats);
  }
}
