import React from 'react';
import { RefreshCw, Radio, Pause, Play } from 'lucide-react';
import { WaterStatus } from '../../api/types';
import { StatusBadge } from '../common/StatusBadge';

interface HeaderProps {
  title: string;
  subtitle?: string;
  status?: WaterStatus | string;
  lastUpdated?: string | null;
  isPolling?: boolean;
  onTogglePolling?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  status = 'IDLE',
  lastUpdated,
  isPolling = true,
  onTogglePolling,
  onRefresh,
  isLoading = false,
}) => {
  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'Waiting for data';

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur px-6 py-4 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Status Badge */}
        <StatusBadge status={status} />

        {/* Polling indicator & toggle */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400">
          <Radio
            className={`w-3.5 h-3.5 ${
              isPolling ? 'text-emerald-400 animate-pulse' : 'text-slate-500'
            }`}
          />
          <span className="font-mono text-[11px]">
            {isPolling ? 'Live (3.5s)' : 'Paused'}
          </span>

          {onTogglePolling && (
            <button
              onClick={onTogglePolling}
              title={isPolling ? 'Pause Polling' : 'Resume Polling'}
              className="ml-1 text-slate-400 hover:text-white transition-colors"
            >
              {isPolling ? (
                <Pause className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3 text-cyan-400" />
              )}
            </button>
          )}
        </div>

        {/* Manual Refresh button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh now"
            className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`}
            />
          </button>
        )}

        {/* Last updated timestamp */}
        <div className="hidden sm:block text-right text-[11px] text-slate-500 font-mono">
          <span>Updated: </span>
          <span className="text-slate-300">{formattedTime}</span>
        </div>
      </div>
    </header>
  );
};
