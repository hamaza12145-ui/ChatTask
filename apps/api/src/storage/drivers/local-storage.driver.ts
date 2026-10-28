import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { IStorageDriver, PresignedUploadResult } from '../storage.interface';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class LocalStorageDriver implements IStorageDriver {
  private readonly logger = new Logger(LocalStorageDriver.name);
  private readonly basePath: string;

  constructor() {
    this.basePath = path.resolve(process.cwd(), process.env.LOCAL_STORAGE_PATH || './uploads');
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  async getPresignedUploadUrl(
    tenantId: string,
    filename: string,
    contentType: string,
  ): Promise<PresignedUploadResult> {
    const ext = path.extname(filename);
    const uniqueName = `${uuidv7()}${ext}`;
    const key = `${tenantId}/${uniqueName}`;
    const apiUrl = process.env.API_URL || 'http://localhost:4000';

    return {
      upload_url: `${apiUrl}/api/storage/upload?key=${encodeURIComponent(key)}`,
      file_url: `${apiUrl}/uploads/${key}`,
      key,
      storage_driver: 'local',
    };
  }

  async saveFile(
    tenantId: string,
    filename: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<{ file_url: string; key: string; size: number }> {
    const tenantDir = path.join(this.basePath, tenantId);
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }

    const ext = path.extname(filename);
    const uniqueName = `${uuidv7()}${ext}`;
    const fullPath = path.join(tenantDir, uniqueName);
    const key = `${tenantId}/${uniqueName}`;

    await fs.promises.writeFile(fullPath, buffer);
    const apiUrl = process.env.API_URL || 'http://localhost:4000';

    return {
      file_url: `${apiUrl}/uploads/${key}`,
      key,
      size: buffer.length,
    };
  }

  async deleteFile(tenantId: string, key: string): Promise<void> {
    if (!key.startsWith(`${tenantId}/`)) {
      throw new Error('Tenant isolation violation: cannot delete file outside tenant folder');
    }
    const fullPath = path.join(this.basePath, key);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }

  async getFileStream(tenantId: string, key: string): Promise<{ stream: any; contentType: string; size: number }> {
    if (!key.startsWith(`${tenantId}/`)) {
      throw new Error('Tenant isolation violation: cannot access file outside tenant folder');
    }
    const fullPath = path.join(this.basePath, key);
    if (!fs.existsSync(fullPath)) {
      throw new Error('File not found');
    }
    const stat = await fs.promises.stat(fullPath);
    return {
      stream: fs.createReadStream(fullPath),
      contentType: 'application/octet-stream',
      size: stat.size,
    };
  }
}
