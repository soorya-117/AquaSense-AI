import React, { useState, useEffect, useCallback } from 'react';
import { api, API_BASE_URL } from '../api/client';
import { HealthResponse } from '../api/types';
import { KpiCard } from '../components/common/KpiCard';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import {
  Server,
  Database,
  Layers,
  Clock,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

export const SystemPage: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setIsLoading(true);
    const start = performance.now();
    try {
      const data = await api.getHealth();
      const end = performance.now();
      setLatencyMs(Math.round(end - start));
      setHealth(data);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to query backend health endpoint');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  if (isLoading && !health) {
    return <LoadingState message="Checking AquaSense system health..." />;
  }

  if (error && !health) {
    return (
      <ErrorState
        title="Backend Offline"
        message={error}
        onRetry={fetchHealth}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Health Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Backend Service Status"
          value={health?.status === 'healthy' ? 'Healthy' : 'Degraded'}
          subtitle="FastAPI Core Engine"
          accentColor={health?.status === 'healthy' ? 'emerald' : 'rose'}
          icon={<Server className="w-5 h-5" />}
          trendBadge={
            <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-semibold">
              <CheckCircle2 className="w-3 h-3" /> Online
            </span>
          }
        />

        <KpiCard
          title="Database State"
          value={health?.database === 'connected' ? 'Connected' : 'Error'}
          subtitle="SQLite (aquasense.db)"
          accentColor="cyan"
          icon={<Database className="w-5 h-5" />}
          trendBadge={
            <span className="font-mono text-[10px] text-slate-400">
              WAL / Local
            </span>
          }
        />

        <KpiCard
          title="Total Telemetry Rows"
          value={health?.total_records ?? 0}
          unit="rows"
          subtitle="sensor_readings table"
          accentColor="indigo"
          icon={<Layers className="w-5 h-5" />}
        />

        <KpiCard
          title="API Response Time"
          value={latencyMs !== null ? latencyMs : '--'}
          unit="ms"
          subtitle="Round-trip network latency"
          accentColor="emerald"
          icon={<Clock className="w-5 h-5" />}
        />
      </div>

      {/* System & Architecture Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hardware & Sensor Pipeline */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            Hardware Architecture Mapping
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Microcontroller</span>
              <span className="font-mono font-semibold text-slate-200">ESP32 (Wi-Fi 802.11 b/g/n)</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Sensor 1 (Upstream)</span>
              <span className="font-mono text-cyan-300">YF-S401 on GPIO 27</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Sensor 2 (Downstream)</span>
              <span className="font-mono text-indigo-300">YF-S401 on GPIO 26</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Actuation</span>
              <span className="font-mono text-slate-300">Manual Pump Switching</span>
            </div>
          </div>
        </div>

        {/* Software & API Configuration */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              API Connectivity & Rules
            </h3>
            <button
              onClick={fetchHealth}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-950 text-[11px] text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Check Health
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Configured API Base URL</span>
              <span className="font-mono text-cyan-300">{API_BASE_URL}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Telemetry Ingestion Endpoint</span>
              <span className="font-mono text-slate-200">POST /data (port 8000)</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Documentation Swagger UI</span>
              <a
                href={`${API_BASE_URL}/docs`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-cyan-400 hover:underline"
              >
                /docs ↗
              </a>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Server Health Timestamp</span>
              <span className="font-mono text-slate-400">
                {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '--'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
