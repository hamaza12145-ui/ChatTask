import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { IStorageDriver, PresignedUploadResult } from './storage.interface';
import { LocalStorageDriver } from './drivers/local-storage.driver';
import { S3StorageDriver } from './drivers/s3-storage.driver';
import { ControlService } from '../control/control.service';
import { Tenant } from '../control/entities/tenant.entity';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private driver: IStorageDriver;

  constructor(
    private readonly cls: ClsService,
    private readonly controlService: ControlService,
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
    const tenantId = this.cls.get<string>('tenantId');
    const tenant = this.cls.get<Tenant>('tenant');

    if (!tenantId || !tenant) {
      throw new ForbiddenException('Tenant context missing for file upload');
    }

    // Storage Quota Enforcement
    await this.checkStorageQuota(tenant, fileSize);

    return this.driver.getPresignedUploadUrl(tenantId, filename, contentType);
  }

  async handleDirectUpload(
    file: Express.Multer.File,
  ): Promise<{ file_url: string; key: string; size: number }> {
    const tenantId = this.cls.get<string>('tenantId');
    const tenant = this.cls.get<Tenant>('tenant');

    if (!tenantId || !tenant) {
      throw new ForbiddenException('Tenant context missing for file upload');
    }

    await this.checkStorageQuota(tenant, file.size);

    const result = await this.driver.saveFile(
      tenantId,
      file.originalname,
      file.buffer,
      file.mimetype,
    );

    // Track tenant storage usage
    await this.controlService.updateTenantStorage(tenantId, file.size);

    return result;
  }

  async deleteFile(key: string, fileSizeEstimate: number = 0): Promise<void> {
    const tenantId = this.cls.get<string>('tenantId');
    if (!tenantId) {
      throw new ForbiddenException('Tenant context missing');
    }

    await this.driver.deleteFile(tenantId, key);

    if (fileSizeEstimate > 0) {
      await this.controlService.updateTenantStorage(tenantId, -fileSizeEstimate);
    }
  }

  private async checkStorageQuota(tenant: Tenant, incomingBytes: number): Promise<void> {
    const plan = await this.controlService.getPlan(tenant.plan);
    const limitBytes = plan?.storage_limit_bytes || 10 * 1024 * 1024 * 1024; // Default 10 GB

    const currentUsage = Number(tenant.storage_used_bytes || 0);
    if (currentUsage + incomingBytes > limitBytes) {
      throw new BadRequestException(
        `Storage quota exceeded for plan '${tenant.plan}'. Used: ${(currentUsage / 1e6).toFixed(1)} MB, Limit: ${(limitBytes / 1e6).toFixed(1)} MB.`,
      );
    }
  }
}
