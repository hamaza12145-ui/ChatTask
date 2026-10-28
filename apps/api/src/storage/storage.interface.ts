export interface PresignedUploadResult {
  upload_url: string;
  file_url: string;
  key: string;
  storage_driver: 'local' | 's3';
}

export interface IStorageDriver {
  getPresignedUploadUrl(
    tenantId: string,
    filename: string,
    contentType: string,
  ): Promise<PresignedUploadResult>;

  saveFile(
    tenantId: string,
    filename: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<{ file_url: string; key: string; size: number }>;

  deleteFile(tenantId: string, key: string): Promise<void>;

  getFileStream(tenantId: string, key: string): Promise<{ stream: any; contentType: string; size: number }>;
}
