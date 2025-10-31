import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class UploadsService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicBase: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('R2_ENDPOINT') || this.config.get<string>('r2.endpoint');
    const region = this.config.get<string>('R2_REGION') || 'auto';
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucket = this.config.get<string>('R2_BUCKET') || 'app-assets';
    this.publicBase = this.config.get<string>('R2_PUBLIC_BASE') || '';

    this.s3 = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId: accessKeyId ?? '', secretAccessKey: secretAccessKey ?? '' },
    });
  }

  async uploadBuffer(params: { buffer: Buffer; key: string; contentType?: string }) {
    const { buffer, key, contentType } = params;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    const url = this.publicBase ? `${this.publicBase}/${encodeURIComponent(key)}` : undefined;
    return { key, url } as const;
  }
}


