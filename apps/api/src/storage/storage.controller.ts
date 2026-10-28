import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { RequestUploadUrlDto, UploadUrlResponseDto } from '@saas/shared';

@Controller('api/storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('presign')
  async getPresignedUrl(@Body() dto: RequestUploadUrlDto): Promise<UploadUrlResponseDto> {
    if (!dto.filename || !dto.content_type) {
      throw new BadRequestException('filename and content_type are required');
    }
    return this.storageService.getPresignedUpload(
      dto.filename,
      dto.content_type,
      dto.file_size || 0,
    );
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.storageService.handleDirectUpload(file);
  }
}
