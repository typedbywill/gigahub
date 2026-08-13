import React, { useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { HealthCheckResponse } from '@gigahub/shared/contracts';
import { useRealtimeStore } from '../shared/stores/realtime.store';

export const HomePage: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { isConnected, connect, socket, lastMessage } = useRealtimeStore();

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/ready');
      if (!res.ok) {
        throw new Error(`API returned HTTP ${res.status}`);
      }
      const data: HealthCheckResponse = await res.json();
      setHealthData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    connect();
  }, [connect]);

  const sendRealtimePing = () => {
    if (socket) {
      socket.emit('ping', { message: 'Hello from GigaHub Web!' });
    }
  };

  const statusTone = (up: boolean) =>
    up
      ? 'bg-success/10 text-success border-success/20'
      : 'bg-danger/10 text-danger border-danger/20';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
          System Status Dashboard
        </h1>
        <p className="mt-2 text-muted">
          Real-time service readiness and infrastructure monitoring for GigaHub.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium">Overall System Health:</div>
          {loading ? (
            <span className="animate-pulse rounded-full bg-default px-3 py-1 font-mono text-xs text-muted">
              Checking...
            </span>
          ) : error ? (
            <span className="rounded-full border border-danger/30 bg-danger/10 px-3 py-1 font-mono text-xs font-bold text-danger">
              Unreachable ({error})
            </span>
          ) : (
            <span
              className={`rounded-full border px-3 py-1 font-mono text-xs font-bold ${
                healthData?.status === 'ok'
                  ? 'border-success/30 bg-success/10 text-success'
                  : 'border-danger/30 bg-danger/10 text-danger'
              }`}
            >
              STATUS: {healthData?.status?.toUpperCase()}
            </span>
          )}
        </div>
        <Button size="sm" variant="primary" onPress={() => void fetchHealth()}>
          Refresh Status
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {(
          [
            {
              title: 'MongoDB',
              blurb: 'Database replica set (rs0) via Mongoose.',
              service: healthData?.services?.mongodb,
            },
            {
              title: 'Redis',
              blurb: 'Ephemeral cache and pub/sub engine.',
              service: healthData?.services?.redis,
            },
            {
              title: 'MinIO S3',
              blurb: 'Object storage bucket: gigahub.',
              service: healthData?.services?.minio,
            },
          ] as const
        ).map((card) => (
          <div
            key={card.title}
            className="space-y-4 rounded-xl border border-border bg-surface p-6"
          >
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold">{card.title}</div>
              <span
                className={`rounded border px-2.5 py-0.5 font-mono text-xs font-semibold ${statusTone(
                  card.service?.status === 'up',
                )}`}
              >
                {card.service?.status ?? 'down'}
              </span>
            </div>
            <p className="text-xs text-muted">{card.blurb}</p>
            <div className="overflow-x-auto rounded-lg bg-background p-3 font-mono text-xs text-muted">
              {JSON.stringify(card.service?.details ?? { state: 'unknown' }, null, 2)}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Realtime Gateway Test</h2>
          <Button
            size="sm"
            variant="secondary"
            isDisabled={!isConnected}
            onPress={sendRealtimePing}
          >
            Send Ping Event
          </Button>
        </div>
        <p className="text-xs text-muted">
          Connected to Socket.IO namespace{' '}
          <code className="font-mono text-accent">/realtime</code>.
        </p>
        {lastMessage != null && (
          <div className="rounded-lg border border-border bg-background p-4 font-mono text-xs text-success">
            Last Response: {JSON.stringify(lastMessage)}
          </div>
        )}
      </div>
    </div>
  );
};
