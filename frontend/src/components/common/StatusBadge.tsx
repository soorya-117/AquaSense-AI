import React from 'react';
import { WaterStatus } from '../../api/types';
import { AlertTriangle, CheckCircle2, AlertOctagon, Clock } from 'lucide-react';

interface StatusBadgeProps {
  status: WaterStatus | string;
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  showIcon = true,
}) => {
  const normalized = (status || 'IDLE').toUpperCase();

  switch (normalized) {
    case 'NORMAL':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 ${className}`}
        >
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
          NORMAL
        </span>
      );

    case 'POSSIBLE WATER LOSS':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 ${className}`}
        >
          {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
          POSSIBLE WATER LOSS
        </span>
      );

    case 'SENSOR/CALIBRATION ANOMALY':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 ${className}`}
        >
          {showIcon && <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />}
          SENSOR/CALIBRATION ANOMALY
        </span>
      );

    case 'IDLE':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 ${className}`}
        >
          {showIcon && <Clock className="w-3.5 h-3.5 text-slate-400" />}
          {normalized}
        </span>
      );
  }
};
