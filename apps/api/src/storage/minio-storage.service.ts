import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import type { EnvConfig } from '@gigahub/shared/config';
import { StoragePort } from './storage.port';

@Injectable()
export class MinioStorageService implements StoragePort, OnModuleInit {
  private readonly logger = new Logger(MinioStorageService.name);
  private client: S3Client;
  private endpoint: string;
  private defaultBucket: string;

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {
    const endpoint = this.configService.get('MINIO_ENDPOINT', { infer: true });
    const port = this.configService.get('MINIO_PORT', { infer: true });
    const useSSL = this.configService.get('MINIO_USE_SSL', { infer: true });
    const accessKey = this.configService.get('MINIO_ACCESS_KEY', { infer: true });
    const secretKey = this.configService.get('MINIO_SECRET_KEY', { infer: true });
    this.defaultBucket = this.configService.get('MINIO_BUCKET', { infer: true });

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

  async onModuleInit(): Promise<void> {
    this.logger.log(`Initialized MinIO S3 client pointing to ${this.endpoint}`);
    try {
      await this.ensureBucket(this.defaultBucket);
    } catch (error) {
      this.logger.warn(
        `Could not ensure MinIO bucket "${this.defaultBucket}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async uploadFile(
    bucket: string,
    key: string,
    file: Buffer,
    contentType?: string,
  ): Promise<string> {
    await this.ensureBucket(bucket);
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

  async ensureBucket(bucket: string): Promise<void> {
    if (await this.bucketExists(bucket)) {
      return;
    }
    await this.client.send(new CreateBucketCommand({ Bucket: bucket }));
    this.logger.log(`Created MinIO bucket "${bucket}"`);
  }
}
