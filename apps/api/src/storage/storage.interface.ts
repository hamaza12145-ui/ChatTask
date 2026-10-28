export interface PresignedUploadResult {
  upload_url: string;
  file_url: string;
  key: string;
  storage_driver: 'local' | 's3';
}

export interface IStorageDriver {
  getPresignedUploadUrl(
    filename: string,
    contentType: string,
  ): Promise<PresignedUploadResult>;

  saveFile(
    filename: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<{ file_url: string; key: string; size: number }>;

  deleteFile(key: string): Promise<void>;

  getFileStream(key: string): Promise<{ stream: any; contentType: string; size: number }>;
}
