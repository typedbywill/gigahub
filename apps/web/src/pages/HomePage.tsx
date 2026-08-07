import React, { useEffect, useState } from 'react';
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">System Status Dashboard</h1>
        <p className="text-slate-400 mt-2">
          Real-time service readiness and infrastructure monitoring for GigaHub.
        </p>
      </div>

      <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium text-slate-300">Overall System Health:</div>
          {loading ? (
            <span className="px-3 py-1 text-xs rounded-full bg-slate-800 text-slate-400 animate-pulse font-mono">
              Checking...
            </span>
          ) : error ? (
            <span className="px-3 py-1 text-xs rounded-full bg-rose-950 text-rose-400 border border-rose-800 font-mono font-bold">
              Unreachable ({error})
            </span>
          ) : (
            <span
              className={`px-3 py-1 text-xs rounded-full font-mono font-bold border ${
                healthData?.status === 'ok'
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                  : 'bg-rose-950 text-rose-400 border-rose-800'
              }`}
            >
              STATUS: {healthData?.status?.toUpperCase()}
            </span>
          )}
        </div>
        <button
          onClick={fetchHealth}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
        >
          Refresh Status
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* MongoDB */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-bold text-lg text-slate-200">MongoDB</div>
            <span
              className={`px-2.5 py-0.5 text-xs rounded font-mono font-semibold ${
                healthData?.services?.mongodb?.status === 'up'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {healthData?.services?.mongodb?.status ?? 'down'}
            </span>
          </div>
          <p className="text-xs text-slate-400">Database replica set (rs0) via Mongoose.</p>
          <div className="text-xs font-mono bg-slate-950 p-3 rounded-lg text-slate-400 overflow-x-auto">
            {JSON.stringify(healthData?.services?.mongodb?.details ?? { state: 'unknown' }, null, 2)}
          </div>
        </div>

        {/* Redis */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-bold text-lg text-slate-200">Redis</div>
            <span
              className={`px-2.5 py-0.5 text-xs rounded font-mono font-semibold ${
                healthData?.services?.redis?.status === 'up'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {healthData?.services?.redis?.status ?? 'down'}
            </span>
          </div>
          <p className="text-xs text-slate-400">Ephemeral cache and pub/sub engine.</p>
          <div className="text-xs font-mono bg-slate-950 p-3 rounded-lg text-slate-400 overflow-x-auto">
            {JSON.stringify(healthData?.services?.redis?.details ?? { state: 'unknown' }, null, 2)}
          </div>
        </div>

        {/* MinIO */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-bold text-lg text-slate-200">MinIO S3</div>
            <span
              className={`px-2.5 py-0.5 text-xs rounded font-mono font-semibold ${
                healthData?.services?.minio?.status === 'up'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {healthData?.services?.minio?.status ?? 'down'}
            </span>
          </div>
          <p className="text-xs text-slate-400">Object storage bucket: gigahub.</p>
          <div className="text-xs font-mono bg-slate-950 p-3 rounded-lg text-slate-400 overflow-x-auto">
            {JSON.stringify(healthData?.services?.minio?.details ?? { state: 'unknown' }, null, 2)}
          </div>
        </div>
      </div>

      {/* Socket.IO Realtime tester */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Realtime Gateway Test</h2>
          <button
            onClick={sendRealtimePing}
            disabled={!isConnected}
            className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-indigo-300 transition-colors cursor-pointer"
          >
            Send Ping Event
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Connected to Socket.IO namespace <code className="text-indigo-300 font-mono">/realtime</code>.
        </p>
        {lastMessage != null && (
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs font-mono text-emerald-400">
            Last Response: {JSON.stringify(lastMessage)}
          </div>
        )}
      </div>
    </div>
  );
};
