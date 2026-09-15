import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { KpiCard } from '../components/common/KpiCard';
import {
  CalendarDays,
  Building,
  Target,
  Zap,
} from 'lucide-react';

export const WaterPlanning: React.FC = () => {
  const [isApiAvailable, setIsApiAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  useEffect(() => {
    const checkSupplyEndpoint = async () => {
      try {
        await api.getSupply();
        setIsApiAvailable(true);
      } catch {
        // Expected: Account 4 will implement /api/supply
        setIsApiAvailable(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkSupplyEndpoint();
  }, []);

  return (
    <div className="space-y-6">
      {/* Status Notice Banner */}
      <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-5 text-cyan-200 backdrop-blur shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 mt-0.5">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Campus Water Supply & Allocation Planning
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Account 4 Responsibility
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
                Coordinates target tank capacity, building water schedules, and pump runtime allocation.
                In accordance with project rules, zero simulated numbers are generated.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-mono">
            <span
              className={`h-2 w-2 rounded-full ${
                isApiAvailable ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span>
              {isChecking
                ? 'Checking API...'
                : isApiAvailable
                ? 'GET /api/supply Active'
                : 'GET /api/supply Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Target Planning Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Daily Campus Target"
          value="-- L"
          subtitle="Awaiting schedule configuration"
          accentColor="cyan"
          icon={<Target className="w-5 h-5" />}
        />

        <KpiCard
          title="Monitored Campus Zones"
          value="2 Zones"
          subtitle="Zone 1 (Upstream) • Zone 2 (Downstream)"
          accentColor="indigo"
          icon={<Building className="w-5 h-5" />}
        />

        <KpiCard
          title="Allocated Pump Run-Time"
          value="-- mins"
          subtitle="Awaiting supply calculation"
          accentColor="emerald"
          icon={<Zap className="w-5 h-5" />}
        />
      </div>

      {/* Planning Form Placeholder Layout */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-6 shadow-sm">
        <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-cyan-400" />
          Supply Allocation Schedule Setup
        </h4>
        <p className="text-xs text-slate-400 mb-6">
          Schedule zone delivery times and reserve thresholds. These parameters will submit to{' '}
          <code className="text-cyan-300 font-mono">POST /api/supply</code> once activated by Account 4.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">
              Target Supply Volume (Liters / Day)
            </label>
            <input
              type="number"
              placeholder="e.g. 500"
              disabled
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1.5">
              Supply Window Start Time
            </label>
            <input
              type="time"
              disabled
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-400 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-4 text-center">
          <p className="text-xs text-slate-400">
            Form is currently in standby mode pending Account 4 implementation of{' '}
            <code className="text-cyan-300 font-mono">POST /api/supply</code>.
          </p>
        </div>
      </div>
    </div>
  );
};
