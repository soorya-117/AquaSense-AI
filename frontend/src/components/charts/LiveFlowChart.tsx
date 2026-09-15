import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { SensorReading } from '../../api/types';
import { EmptyState } from '../common/EmptyState';

interface LiveFlowChartProps {
  data: SensorReading[];
  height?: number;
}

export const LiveFlowChart: React.FC<LiveFlowChartProps> = ({
  data,
  height = 320,
}) => {
  if (!data || data.length === 0) {
    return <EmptyState message="No flow data recorded yet. Waiting for sensor readings to plot live chart." />;
  }

  // Reverse so chronological order (oldest to newest) is left to right
  const chartData = [...data].reverse().map((item) => {
    const date = new Date(item.timestamp);
    const timeLabel = isNaN(date.getTime())
      ? item.timestamp
      : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return {
      time: timeLabel,
      fullTime: item.timestamp,
      sensor1: item.sensor1_flow,
      sensor2: item.sensor2_flow,
      difference: item.flow_difference,
      status: item.status,
    };
  });

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
        >
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
            unit=" L/m"
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const current = payload[0].payload;
                return (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/95 p-3.5 shadow-xl backdrop-blur text-xs">
                    <p className="font-medium text-slate-400 mb-2">{label}</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-cyan-400">
                          <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
                          Sensor 1 (Upstream):
                        </span>
                        <span className="font-semibold text-white">
                          {current.sensor1} L/min
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-indigo-400">
                          <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
                          Sensor 2 (Downstream):
                        </span>
                        <span className="font-semibold text-white">
                          {current.sensor2} L/min
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-t border-slate-800 pt-1.5">
                        <span className="flex items-center gap-1.5 text-amber-400">
                          <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                          Flow Difference:
                        </span>
                        <span className="font-semibold text-amber-300">
                          {current.difference} L/min
                        </span>
                      </div>
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
          <Line
            type="monotone"
            dataKey="sensor1"
            name="Sensor 1 Flow (Upstream)"
            stroke="#06b6d4"
            strokeWidth={2.5}
            dot={{ r: 2, fill: '#06b6d4' }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="sensor2"
            name="Sensor 2 Flow (Downstream)"
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={{ r: 2, fill: '#6366f1' }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="difference"
            name="Flow Difference (Loss Indicator)"
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
