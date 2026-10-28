import { Injectable, Logger } from '@nestjs/common';
import { IStorageDriver, PresignedUploadResult } from './storage.interface';
import { LocalStorageDriver } from './drivers/local-storage.driver';
import { S3StorageDriver } from './drivers/s3-storage.driver';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private driver: IStorageDriver;

  constructor(
    private readonly localDriver: LocalStorageDriver,
    private readonly s3Driver: S3StorageDriver,
  ) {
    const driverType = process.env.STORAGE_DRIVER || 'local';
    this.driver = driverType === 's3' ? this.s3Driver : this.localDriver;
    this.logger.log(`Initialized StorageService with [${driverType}] driver`);
  }

  async getPresignedUpload(
    filename: string,
    contentType: string,
    fileSize: number,
  ): Promise<PresignedUploadResult> {
    return this.driver.getPresignedUploadUrl(filename, contentType);
  }

  async handleDirectUpload(
    file: Express.Multer.File,
  ): Promise<{ file_url: string; key: string; size: number }> {
    return this.driver.saveFile(
      file.originalname,
      file.buffer,
      file.mimetype,
    );
  }

  async deleteFile(key: string): Promise<void> {
    await this.driver.deleteFile(key);
  }

  async getFileStream(key: string): Promise<{ stream: any; contentType: string; size: number }> {
    return this.driver.getFileStream(key);
  }
}
