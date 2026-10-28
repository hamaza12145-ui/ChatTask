import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { LocalStorageDriver } from './drivers/local-storage.driver';
import { S3StorageDriver } from './drivers/s3-storage.driver';
import { ControlModule } from '../control/control.module';

@Module({
  imports: [ControlModule],
  controllers: [StorageController],
  providers: [StorageService, LocalStorageDriver, S3StorageDriver],
  exports: [StorageService],
})
export class StorageModule {}
