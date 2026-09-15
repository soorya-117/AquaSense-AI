import React from 'react';
import { useLiveTelemetry } from '../hooks/useLiveTelemetry';
import { KpiCard } from '../components/common/KpiCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { LiveFlowChart } from '../components/charts/LiveFlowChart';
import {
  Gauge,
  Droplets,
  Scale,
  Percent,
  Clock,
  Radio,
  Cpu,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const {
    latestReading,
    history,
    currentStatus,
    hasData,
    isLoading,
    error,
    refresh,
  } = useLiveTelemetry(3500);

  if (isLoading && !latestReading) {
    return <LoadingState message="Connecting to AquaSense telemetry stream..." />;
  }

  if (error && !latestReading) {
    return (
      <ErrorState
        title="Telemetry Stream Disconnected"
        message={error}
        onRetry={refresh}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner if Anomaly or Possible Water Loss */}
      {latestReading && latestReading.status === 'POSSIBLE WATER LOSS' && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-4 text-amber-300 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 rounded-full bg-amber-400 animate-ping" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Notice: Possible Water Loss Detected
              </p>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Sensor 1 flow exceeds Sensor 2 by {latestReading.flow_difference.toFixed(3)} L/min.
                Water may be leaving the measured path (intermediate consumption or line variance).
              </p>
            </div>
          </div>
          <StatusBadge status="POSSIBLE WATER LOSS" />
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Upstream Flow (Sensor 1)"
          value={hasData && latestReading ? latestReading.sensor1_flow.toFixed(2) : '--'}
          unit="L/min"
          subtitle="GPIO27 • Upstream Inlet"
          accentColor="cyan"
          icon={<Gauge className="w-5 h-5" />}
          trendBadge={
            hasData && latestReading ? (
              <span className="font-mono text-[10px] text-slate-400">
                {latestReading.sensor1_pulses} pulses
              </span>
            ) : undefined
          }
        />

        <KpiCard
          title="Downstream Flow (Sensor 2)"
          value={hasData && latestReading ? latestReading.sensor2_flow.toFixed(2) : '--'}
          unit="L/min"
          subtitle="GPIO26 • Downstream Outlet"
          accentColor="indigo"
          icon={<Gauge className="w-5 h-5" />}
          trendBadge={
            hasData && latestReading ? (
              <span className="font-mono text-[10px] text-slate-400">
                {latestReading.sensor2_pulses} pulses
              </span>
            ) : undefined
          }
        />

        <KpiCard
          title="Flow Difference"
          value={hasData && latestReading ? Math.abs(latestReading.flow_difference).toFixed(2) : '--'}
          unit="L/min"
          subtitle="Sensor 1 Flow - Sensor 2 Flow"
          accentColor={
            hasData && latestReading && latestReading.flow_difference > 0.15
              ? 'amber'
              : 'slate'
          }
          icon={<Scale className="w-5 h-5" />}
          trendBadge={
            hasData && latestReading ? (
              <span
                className={`font-semibold text-[10px] ${
                  latestReading.flow_difference > 0.15
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {latestReading.flow_difference > 0.15 ? 'Loss gap' : 'Balanced'}
              </span>
            ) : undefined
          }
        />

        <KpiCard
          title="Flow Ratio"
          value={
            hasData && latestReading
              ? (latestReading.flow_ratio * 100).toFixed(1)
              : '--'
          }
          unit="%"
          subtitle="Downstream / Upstream Ratio"
          accentColor="emerald"
          icon={<Percent className="w-5 h-5" />}
          trendBadge={
            hasData && latestReading ? (
              <span className="text-[10px] text-slate-400 font-mono">
                {latestReading.flow_ratio.toFixed(3)}
              </span>
            ) : undefined
          }
        />
      </div>

      {/* Main Chart Section */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <Droplets className="w-4 h-4 text-cyan-400" />
              Live Flow Telemetry (Sensor 1 vs Sensor 2)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time comparative flow rate monitoring plotted over recent polling intervals
            </p>
          </div>
          {hasData && (
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
              {history.length} samples loaded
            </div>
          )}
        </div>

        {hasData ? (
          <LiveFlowChart data={history} height={320} />
        ) : (
          <EmptyState
            title="Waiting for sensor data"
            message="FastAPI is online and waiting for the physical ESP32 to publish pulses to POST /data."
          />
        )}
      </div>

      {/* Hardware & Diagnostic Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            Hardware Configuration
          </div>
          <div className="space-y-1 text-xs text-slate-400">
            <p>• Upstream Sensor: <span className="text-slate-200">YF-S401 on GPIO27</span></p>
            <p>• Downstream Sensor: <span className="text-slate-200">YF-S401 on GPIO26</span></p>
            <p>• Actuation: <span className="text-slate-200">Submersible Pump</span></p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
            <Radio className="w-4 h-4 text-indigo-400" />
            ESP32 Ingestion Status
          </div>
          <div className="space-y-1 text-xs text-slate-400">
            <p>• Contract: <code className="text-cyan-400">POST /data</code></p>
            <p>• Current Status: <span className="text-slate-200 font-semibold">{currentStatus}</span></p>
            <p>• Total Buffered Readings: <span className="text-slate-200">{history.length}</span></p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Latest Telemetry Stamp
          </div>
          <div className="space-y-1 text-xs text-slate-400 font-mono">
            {hasData && latestReading ? (
              <>
                <p className="text-white text-xs">{new Date(latestReading.timestamp).toLocaleString()}</p>
                <p className="text-[11px] text-slate-400">Record ID: #{latestReading.id}</p>
              </>
            ) : (
              <p className="text-slate-500 italic">No timestamps recorded yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
