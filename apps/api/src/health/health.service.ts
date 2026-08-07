import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { MinioStorageService } from '../storage/minio-storage.service';
import { HealthCheckResponse, HealthServiceStatus } from '@gigahub/shared/contracts';

@Injectable()
export class HealthService {
  private redisClient: Redis;

  constructor(
    @InjectConnection() private readonly mongoConnection: Connection,
    private readonly configService: ConfigService,
    private readonly minioStorageService: MinioStorageService,
  ) {
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.redisClient = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });
  }

  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async checkReadiness(): Promise<HealthCheckResponse> {
    const mongoStatus = await this.checkMongo();
    const redisStatus = await this.checkRedis();
    const minioStatus = await this.checkMinio();

    const isAllOk =
      mongoStatus.status === 'up' &&
      redisStatus.status === 'up' &&
      minioStatus.status === 'up';

    return {
      status: isAllOk ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      services: {
        mongodb: mongoStatus,
        redis: redisStatus,
        minio: minioStatus,
      },
    };
  }

  private async checkMongo(): Promise<HealthServiceStatus> {
    try {
      const isConnected = this.mongoConnection.readyState === 1;
      return {
        status: isConnected ? 'up' : 'down',
        details: { readyState: this.mongoConnection.readyState },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { status: 'down', details: message };
    }
  }

  private async checkRedis(): Promise<HealthServiceStatus> {
    try {
      if (this.redisClient.status !== 'ready') {
        await this.redisClient.connect();
      }
      const ping = await this.redisClient.ping();
      return {
        status: ping === 'PONG' ? 'up' : 'down',
        details: { ping },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { status: 'down', details: message };
    }
  }

  private async checkMinio(): Promise<HealthServiceStatus> {
    try {
      const bucket = this.configService.get<string>('MINIO_BUCKET', 'gigahub');
      const exists = await this.minioStorageService.bucketExists(bucket);
      return {
        status: 'up',
        details: { bucket, exists },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { status: 'down', details: message };
    }
  }
}
