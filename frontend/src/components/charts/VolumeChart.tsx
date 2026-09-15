import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { SensorReading } from '../../api/types';
import { EmptyState } from '../common/EmptyState';

interface VolumeChartProps {
  data: SensorReading[];
  height?: number;
}

export const VolumeChart: React.FC<VolumeChartProps> = ({
  data,
  height = 300,
}) => {
  if (!data || data.length === 0) {
    return <EmptyState message="No volume data recorded yet. Waiting for sensor readings to plot volume chart." />;
  }

  const chartData = [...data].reverse().map((item) => {
    const date = new Date(item.timestamp);
    const timeLabel = isNaN(date.getTime())
      ? item.timestamp
      : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return {
      time: timeLabel,
      volume1: item.sensor1_volume,
      volume2: item.sensor2_volume,
      loss: Math.max(0, item.sensor1_volume - item.sensor2_volume),
    };
  });

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="vol1Grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="vol2Grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="time"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
          />
          <YAxis
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
            unit=" L"
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const cur = payload[0].payload;
                return (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/95 p-3.5 shadow-xl backdrop-blur text-xs">
                    <p className="font-medium text-slate-400 mb-2">{label}</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-cyan-400">Upstream Volume (S1):</span>
                        <span className="font-semibold text-white">
                          {cur.volume1.toFixed(4)} L
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-indigo-400">Downstream Volume (S2):</span>
                        <span className="font-semibold text-white">
                          {cur.volume2.toFixed(4)} L
                        </span>
                      </div>
                      {cur.loss > 0 && (
                        <div className="flex items-center justify-between gap-4 border-t border-slate-800 pt-1.5 text-amber-400">
                          <span>Unaccounted Segment Volume:</span>
                          <span className="font-semibold">
                            {cur.loss.toFixed(4)} L
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
          />
          <Area
            type="monotone"
            dataKey="volume1"
            name="Sensor 1 Volume (Upstream)"
            stroke="#06b6d4"
            fillOpacity={1}
            fill="url(#vol1Grad)"
          />
          <Area
            type="monotone"
            dataKey="volume2"
            name="Sensor 2 Volume (Downstream)"
            stroke="#6366f1"
            fillOpacity={1}
            fill="url(#vol2Grad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
