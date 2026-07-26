import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BadgesService } from './badges.service';
import { BadgesController } from './badges.controller';
import { QrTokenService } from './qr-token.service';
import { BadgePdfGeneratorService } from './badge-pdf-generator.service';
import { ParticipantsRepository } from '../participants/repositories/participants.repository';

@Module({
  imports: [JwtModule.register({})],
  providers: [BadgesService, QrTokenService, BadgePdfGeneratorService, ParticipantsRepository],
  controllers: [BadgesController],
  exports: [QrTokenService, BadgesService],
})
export class BadgesModule {}
