import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadsService } from './uploads.service';

function sanitizeFileName(name: string): string {
  const base = name.replace(/[^A-Za-z0-9._-]/g, '-');
  return base.length > 140 ? base.slice(-140) : base;
}

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async uploadImage(
    @UploadedFile() file?: Express.Multer.File,
    @Body('prefix') prefix?: string,
  ) {
    if (!file) throw new BadRequestException('file is required');
    const original = file.originalname || 'upload.bin';
    const safeName = sanitizeFileName(original);
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    const ts = now.getTime();
    const dir = prefix ? `${prefix}`.replace(/^\/+|\/+$/g, '') : `uploads/${y}/${m}/${d}`;
    const key = `${dir}/${ts}-${safeName}`;

    const result = await this.uploads.uploadBuffer({ buffer: file.buffer, key, contentType: file.mimetype });
    return {
      key: result.key,
      url: result.url,
      contentType: file.mimetype,
      size: file.size,
      name: original,
    } as const;
  }
}


