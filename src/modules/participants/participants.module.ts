import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ParticipantsService } from './participants.service';
import { ParticipantsController } from './participants.controller';
import { ParticipantImportParserService } from './participant-import-parser.service';
import { ParticipantsRepository } from './repositories/participants.repository';
import { AccreditationTypeRepository } from '../accreditation-types/repositories/accreditation-types.repository';
import { AccessLogRepository } from '../access-logs/repositories/access-logs.repository';
import { MealLogRepository } from '../meal-logs/repositories/meal-logs.repository';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  providers: [
    ParticipantsService,
    ParticipantImportParserService,
    ParticipantsRepository,
    AccreditationTypeRepository,
    AccessLogRepository,
    MealLogRepository,
  ],
  controllers: [ParticipantsController],
  exports: [ParticipantsService, ParticipantsRepository],
})
export class ParticipantsModule {}
