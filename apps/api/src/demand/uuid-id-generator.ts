import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { IdGeneratorPort } from '@gigahub/application-demand';

@Injectable()
export class UuidDemandIdGenerator implements IdGeneratorPort {
  generate(): string {
    return `dmd-${randomUUID()}`;
  }
}
