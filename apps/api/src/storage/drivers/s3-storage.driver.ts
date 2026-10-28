import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as path from 'path';
import { IStorageDriver, PresignedUploadResult } from '../storage.interface';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class S3StorageDriver implements IStorageDriver {
  private readonly logger = new Logger(S3StorageDriver.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly publicDomain: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET_NAME || 'team-saas-attachments';
    this.publicDomain = process.env.S3_PUBLIC_DOMAIN || '';

    this.s3Client = new S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      },
    });
  }

  async getPresignedUploadUrl(
    tenantId: string,
    filename: string,
    contentType: string,
  ): Promise<PresignedUploadResult> {
    const ext = path.extname(filename);
    const uniqueName = `${uuidv7()}${ext}`;
    const key = `${tenantId}/${uniqueName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const upload_url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    const file_url = this.publicDomain
      ? `${this.publicDomain}/${key}`
      : `https://${this.bucket}.r2.cloudflarestorage.com/${key}`;

    return {
      upload_url,
      file_url,
      key,
      storage_driver: 's3',
    };
  }

  async saveFile(
    tenantId: string,
    filename: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<{ file_url: string; key: string; size: number }> {
    const ext = path.extname(filename);
    const uniqueName = `${uuidv7()}${ext}`;
    const key = `${tenantId}/${uniqueName}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    const file_url = this.publicDomain
      ? `${this.publicDomain}/${key}`
      : `https://${this.bucket}.r2.cloudflarestorage.com/${key}`;

    return {
      file_url,
      key,
      size: buffer.length,
    };
  }

  async deleteFile(tenantId: string, key: string): Promise<void> {
    if (!key.startsWith(`${tenantId}/`)) {
      throw new Error('Tenant isolation violation: cannot delete file outside tenant namespace');
    }

    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async getFileStream(tenantId: string, key: string): Promise<{ stream: any; contentType: string; size: number }> {
    if (!key.startsWith(`${tenantId}/`)) {
      throw new Error('Tenant isolation violation: cannot access file outside tenant namespace');
    }

    const res = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    return {
      stream: res.Body,
      contentType: res.ContentType || 'application/octet-stream',
      size: res.ContentLength || 0,
    };
  }
}
