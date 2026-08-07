import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { StoragePort } from './storage.port';

@Injectable()
export class MinioStorageService implements StoragePort, OnModuleInit {
  private readonly logger = new Logger(MinioStorageService.name);
  private client: S3Client;
  private endpoint: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.configService.get<number>('MINIO_PORT', 9000);
    const useSSL = this.configService.get<boolean>('MINIO_USE_SSL', false);
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin');

    const protocol = useSSL ? 'https' : 'http';
    this.endpoint = `${protocol}://${endpoint}:${port}`;

    this.client = new S3Client({
      endpoint: this.endpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true,
    });
  }

  onModuleInit() {
    this.logger.log(`Initialized MinIO S3 client pointing to ${this.endpoint}`);
  }

  async uploadFile(bucket: string, key: string, file: Buffer, contentType?: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file,
        ContentType: contentType || 'application/octet-stream',
      }),
    );
    return `${this.endpoint}/${bucket}/${key}`;
  }

  async getFileUrl(bucket: string, key: string): Promise<string> {
    return `${this.endpoint}/${bucket}/${key}`;
  }

  async deleteFile(bucket: string, key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  }

  async bucketExists(bucket: string): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: bucket }));
      return true;
    } catch {
      return false;
    }
  }
}
