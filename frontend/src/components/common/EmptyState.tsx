import React from 'react';
import { Activity, Radio } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Waiting for sensor data',
  message = 'The system is ready and listening for ESP32 flow sensor telemetry via POST /data.',
  icon,
  action,
  className = 'py-16',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 ${className}`}
    >
      <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/80 text-cyan-400 border border-slate-700">
        {icon || <Radio className="w-6 h-6 animate-pulse text-cyan-400" />}
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
        </span>
      </div>

      <h3 className="text-base font-semibold text-white tracking-wide">
        {title}
      </h3>

      <p className="mt-1.5 max-w-md text-xs text-slate-400 leading-relaxed">
        {message}
      </p>

      {action && <div className="mt-5">{action}</div>}

      <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-400">
        <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
        Contract: <code className="text-cyan-300">POST /data</code> on port 8000
      </div>
    </div>
  );
};
