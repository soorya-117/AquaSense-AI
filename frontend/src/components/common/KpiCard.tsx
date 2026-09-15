import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  trendBadge?: React.ReactNode;
  accentColor?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate';
  isLoading?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon,
  trendBadge,
  accentColor = 'cyan',
  isLoading = false,
}) => {
  const accentClasses = {
    cyan: 'border-cyan-500/20 bg-cyan-950/10 text-cyan-400',
    emerald: 'border-emerald-500/20 bg-emerald-950/10 text-emerald-400',
    amber: 'border-amber-500/20 bg-amber-950/10 text-amber-400',
    rose: 'border-rose-500/20 bg-rose-950/10 text-rose-400',
    indigo: 'border-indigo-500/20 bg-indigo-950/10 text-indigo-400',
    slate: 'border-slate-800 bg-slate-900/40 text-slate-400',
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur shadow-sm hover:border-slate-700/80 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-1.5">
            {isLoading ? (
              <div className="h-8 w-24 animate-pulse rounded bg-slate-800" />
            ) : (
              <>
                <span className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
                  {value}
                </span>
                {unit && (
                  <span className="text-sm font-semibold text-slate-400">
                    {unit}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {icon && (
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl border ${accentClasses[accentColor]}`}
          >
            {icon}
          </div>
        )}
      </div>

      {(subtitle || trendBadge) && (
        <div className="mt-4 flex items-center justify-between border-t border-slate-800/60 pt-3 text-xs text-slate-400">
          {subtitle && <span>{subtitle}</span>}
          {trendBadge && <div>{trendBadge}</div>}
        </div>
      )}
    </div>
  );
};
