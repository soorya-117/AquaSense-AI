import React, { useState, useEffect, useCallback } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import { api } from '../api/client';
import { AnomalyRecord } from '../api/types';
import { KpiCard } from '../components/common/KpiCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import {
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  ShieldCheck,
  Info,
  Filter,
} from 'lucide-react';

export const AnomalyDetection: React.FC = () => {
  const { analytics, history, isLoading, error, refresh: refreshAnalytics } = useAnalytics(100);
  const [anomalies, setAnomalies] = useState<AnomalyRecord[]>([]);

  const fetchAnomalies = useCallback(async () => {
    try {
      const data = await api.getAnomalies(100, 0);
      setAnomalies(data || []);
    } catch {
      // Graceful fallback to filtered history if needed
    }
  }, []);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  const refresh = () => {
    refreshAnalytics();
    fetchAnomalies();
  };

  if (isLoading && !analytics) {
    return <LoadingState message="Loading system anomaly telemetry..." />;
  }

  if (error && !analytics) {
    return (
      <ErrorState
        title="Error Fetching Anomaly Records"
        message={error}
        onRetry={refresh}
      />
    );
  }

  const statusCounts = analytics?.status_counts || {};
  const normalCount = statusCounts['NORMAL'] || 0;
  const lossCount = statusCounts['POSSIBLE WATER LOSS'] || 0;
  const anomalyCount = statusCounts['SENSOR/CALIBRATION ANOMALY'] || 0;
  const totalReadings = analytics?.total_readings || 0;

  // Prefer backend /api/anomalies endpoint, fallback to filtered history
  const flaggedReadings =
    anomalies.length > 0
      ? anomalies
      : history.filter(
          (r) =>
            r.status === 'POSSIBLE WATER LOSS' ||
            r.status === 'SENSOR/CALIBRATION ANOMALY'
        );

  return (
    <div className="space-y-6">
      {/* Important Disclaimer Notice */}
      <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4 text-cyan-200 backdrop-blur shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div className="text-xs space-y-1">
            <p className="font-semibold text-white">
              Engineering Status Notice & Prototype Boundaries
            </p>
            <p className="text-slate-300 leading-relaxed">
              In this physical prototype layout (<code>Pump → Sensor 1 → Potential Loss / Outlet → Sensor 2</code>),
              a difference in measured flow indicates that water may have departed the line between sensors.
              <span className="text-amber-300 font-semibold ml-1">
                A flow difference does NOT automatically prove a pipe leak
              </span>{' '}
              (e.g., intermediate consumer taps, bubbles, or sensor calibration variance).
              All alerts are formally classified as <strong>Possible Water Loss</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Status Distribution KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Normal State Readings"
          value={normalCount}
          subtitle={
            totalReadings > 0
              ? `${((normalCount / totalReadings) * 100).toFixed(1)}% of total telemetry`
              : 'Waiting for data'
          }
          accentColor="emerald"
          icon={<CheckCircle2 className="w-5 h-5" />}
          trendBadge={<StatusBadge status="NORMAL" />}
        />

        <KpiCard
          title="Possible Water Loss Events"
          value={lossCount}
          subtitle="Upstream flow > Downstream flow"
          accentColor="amber"
          icon={<AlertTriangle className="w-5 h-5" />}
          trendBadge={<StatusBadge status="POSSIBLE WATER LOSS" />}
        />

        <KpiCard
          title="Sensor/Calibration Anomalies"
          value={anomalyCount}
          subtitle="Downstream > Upstream or invalid pulses"
          accentColor="rose"
          icon={<AlertOctagon className="w-5 h-5" />}
          trendBadge={<StatusBadge status="SENSOR/CALIBRATION ANOMALY" />}
        />
      </div>

      {/* Status Criteria Reference Guide */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          Standardized Status Classification Criteria
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-400">NORMAL</span>
              <StatusBadge status="NORMAL" showIcon={false} />
            </div>
            <p className="text-slate-400 leading-relaxed">
              System is idle (zero flow on both sensors), or flow rate variance between Sensor 1 and Sensor 2 is within normal experimental tolerance (≤ 0.15 L/min).
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-400">POSSIBLE WATER LOSS</span>
              <StatusBadge status="POSSIBLE WATER LOSS" showIcon={false} />
            </div>
            <p className="text-slate-400 leading-relaxed">
              Sensor 1 (upstream) detects substantially more water than Sensor 2 (downstream) beyond the threshold (gap &gt; 0.15 L/min).
              Water is exiting the path between sensors.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-rose-400">SENSOR/CALIBRATION ANOMALY</span>
              <StatusBadge status="SENSOR/CALIBRATION ANOMALY" showIcon={false} />
            </div>
            <p className="text-slate-400 leading-relaxed">
              Sensor 2 measures greater flow than Sensor 1 beyond tolerance (+0.10 L/min), which is physically impossible without an extra inflow source, or negative pulse counts are transmitted.
            </p>
          </div>
        </div>
      </div>

      {/* Flagged Incidents Log */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-400" />
              Flagged Incidents Log
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical readings where status was not NORMAL (Possible Water Loss or Anomalies)
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {flaggedReadings.length} incidents detected
          </span>
        </div>

        {flaggedReadings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Incident ID</th>
                  <th className="px-4 py-3 font-semibold">Time</th>
                  <th className="px-4 py-3 font-semibold">Upstream Flow</th>
                  <th className="px-4 py-3 font-semibold">Downstream Flow</th>
                  <th className="px-4 py-3 font-semibold">Loss Gap</th>
                  <th className="px-4 py-3 font-semibold">Ratio</th>
                  <th className="px-4 py-3 font-semibold">Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {flaggedReadings.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-2.5 text-slate-400">#{item.id}</td>
                    <td className="px-4 py-2.5 text-slate-300">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-cyan-400">{(item.sensor1_flow ?? 0).toFixed(3)} L/min</td>
                    <td className="px-4 py-2.5 text-indigo-400">{(item.sensor2_flow ?? 0).toFixed(3)} L/min</td>
                    <td className="px-4 py-2.5 text-amber-400 font-semibold">
                      {(item.flow_difference ?? 0).toFixed(3)} L/min
                    </td>
                    <td className="px-4 py-2.5">{((item.flow_ratio ?? 0) * 100).toFixed(1)}%</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No Anomaly or Loss Events Recorded"
            message="All readings stored in SQLite are currently operating within NORMAL parameters (or waiting for sensor telemetry)."
            icon={<CheckCircle2 className="w-6 h-6 text-emerald-400" />}
          />
        )}
      </div>
    </div>
  );
};
