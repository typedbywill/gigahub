import { Injectable, Logger } from '@nestjs/common';
import type { EventPublisherPort } from '@gigahub/application-demand';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class RealtimeDemandEventPublisher implements EventPublisherPort {
  private readonly logger = new Logger(RealtimeDemandEventPublisher.name);

  constructor(private readonly realtimeGateway: RealtimeGateway) {}

  async publish<T>(
    eventType: string,
    payload: T,
    actor?: { id: string; type: 'user' | 'system' },
  ): Promise<void> {
    try {
      if (this.realtimeGateway.server) {
        this.realtimeGateway.server.emit(eventType, {
          eventType,
          payload,
          actor,
          occurredAt: new Date().toISOString(),
        });
        this.realtimeGateway.server.emit('demand:invalidated', {
          eventType,
          payload,
        });
      }
    } catch (err) {
      this.logger.warn(`Failed to broadcast realtime event ${eventType}: ${String(err)}`);
    }
  }
}
