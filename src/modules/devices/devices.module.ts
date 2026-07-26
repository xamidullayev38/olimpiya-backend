import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { DeviceRepository } from './repositories/devices.repository';
import { ZoneRepository } from '../zones/repositories/zones.repository';

@Module({
  imports: [JwtModule.register({})],
  providers: [DevicesService, DeviceRepository, ZoneRepository],
  controllers: [DevicesController],
  exports: [DevicesService, DeviceRepository],
})
export class DevicesModule {}
