import React, { useState } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import { KpiCard } from '../components/common/KpiCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { VolumeChart } from '../components/charts/VolumeChart';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import {
  Droplets,
  TrendingDown,
  Activity,
  Calendar,
  Layers,
} from 'lucide-react';

export const WaterUsage: React.FC = () => {
  const [pageLimit] = useState<number>(50);
  const { analytics, history, totalRecords, isLoading, error, refresh } =
    useAnalytics(pageLimit);

  if (isLoading && !analytics) {
    return <LoadingState message="Loading historical water usage analytics..." />;
  }

  if (error && !analytics) {
    return (
      <ErrorState
        title="Failed to Load Usage Data"
        message={error}
        onRetry={refresh}
      />
    );
  }

  const hasData = Boolean(analytics && analytics.total_readings > 0);

  return (
    <div className="space-y-6">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Upstream Volume"
          value={hasData && analytics ? analytics.total_volume_sensor1_liters.toFixed(3) : '--'}
          unit="Liters"
          subtitle="Cumulative through Sensor 1"
          accentColor="cyan"
          icon={<Droplets className="w-5 h-5" />}
          trendBadge={
            hasData && analytics ? (
              <span className="font-mono text-[10px] text-slate-400">
                {analytics.total_pulses_sensor1} pulses
              </span>
            ) : undefined
          }
        />

        <KpiCard
          title="Total Downstream Volume"
          value={hasData && analytics ? analytics.total_volume_sensor2_liters.toFixed(3) : '--'}
          unit="Liters"
          subtitle="Cumulative through Sensor 2"
          accentColor="indigo"
          icon={<Droplets className="w-5 h-5" />}
          trendBadge={
            hasData && analytics ? (
              <span className="font-mono text-[10px] text-slate-400">
                {analytics.total_pulses_sensor2} pulses
              </span>
            ) : undefined
          }
        />

        <KpiCard
          title="Estimated Water Loss"
          value={hasData && analytics ? analytics.estimated_water_loss_liters.toFixed(3) : '--'}
          unit="Liters"
          subtitle="Total volume gap during loss status"
          accentColor={
            hasData && analytics && analytics.estimated_water_loss_liters > 0
              ? 'amber'
              : 'slate'
          }
          icon={<TrendingDown className="w-5 h-5" />}
          trendBadge={
            hasData && analytics ? (
              <span className="text-[10px] text-amber-400 font-semibold">
                Unaccounted
              </span>
            ) : undefined
          }
        />

        <KpiCard
          title="Avg Upstream Flow"
          value={hasData && analytics ? analytics.average_flow_sensor1_lmin.toFixed(2) : '--'}
          unit="L/min"
          subtitle={`Over ${totalRecords} logged readings`}
          accentColor="emerald"
          icon={<Activity className="w-5 h-5" />}
        />
      </div>

      {/* Consumption Trend Chart */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Volume Distribution Trend
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Incremental volumetric measurement per telemetry sample (Sensor 1 vs Sensor 2)
            </p>
          </div>
          {hasData && (
            <div className="text-xs text-slate-400 font-mono">
              Database: <span className="text-slate-200">{totalRecords} total records</span>
            </div>
          )}
        </div>

        {hasData ? (
          <VolumeChart data={history} height={300} />
        ) : (
          <EmptyState
            title="Waiting for sensor data"
            message="No historical volume readings have been recorded in SQLite yet."
          />
        )}
      </div>

      {/* Historical Telemetry Readings Table */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              Historical Sensor Readings
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Raw sensor pulse counts, flow rates, and calculated metrics from SQLite
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Showing latest {history.length} records
          </span>
        </div>

        {hasData ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Timestamp</th>
                  <th className="px-4 py-3 font-semibold">Sensor 1 Pulses</th>
                  <th className="px-4 py-3 font-semibold">Sensor 2 Pulses</th>
                  <th className="px-4 py-3 font-semibold">S1 Flow (L/min)</th>
                  <th className="px-4 py-3 font-semibold">S2 Flow (L/min)</th>
                  <th className="px-4 py-3 font-semibold">Flow Diff</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {history.map((reading) => (
                  <tr
                    key={reading.id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-slate-400">#{reading.id}</td>
                    <td className="px-4 py-2.5 text-slate-300">
                      {new Date(reading.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-cyan-400 font-semibold">
                      {reading.sensor1_pulses}
                    </td>
                    <td className="px-4 py-2.5 text-indigo-400 font-semibold">
                      {reading.sensor2_pulses}
                    </td>
                    <td className="px-4 py-2.5">{reading.sensor1_flow.toFixed(3)}</td>
                    <td className="px-4 py-2.5">{reading.sensor2_flow.toFixed(3)}</td>
                    <td
                      className={`px-4 py-2.5 font-semibold ${
                        reading.flow_difference > 0.15
                          ? 'text-amber-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {reading.flow_difference.toFixed(3)}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={reading.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Waiting for sensor data"
            message="Readings received from the ESP32 will be chronologically cataloged here."
          />
        )}
      </div>
    </div>
  );
};
