import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { SupplyPlanResponse } from '../api/types';
import { KpiCard } from '../components/common/KpiCard';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import {
  CalendarDays,
  Target,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Send,
  Droplets,
  Info,
} from 'lucide-react';

export const WaterPlanning: React.FC = () => {
  const [supplyPlan, setSupplyPlan] = useState<SupplyPlanResponse | null>(null);
  const [availableInput, setAvailableInput] = useState<string>('500');
  const [horizonInput, setHorizonInput] = useState<string>('1.0');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSupplyPlan = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getSupply();
      setSupplyPlan(data);
      if (data && data.available_water_liters > 0) {
        setAvailableInput(String(data.available_water_liters));
      }
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch water supply planning data.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSupplyPlan();
  }, [fetchSupplyPlan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const availableVal = parseFloat(availableInput);
    const horizonVal = parseFloat(horizonInput) || 1.0;

    if (isNaN(availableVal) || availableVal < 0) {
      setError('Available water must be a non-negative number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await api.submitSupplyPlan({
        available_water_liters: availableVal,
        planning_horizon_hours: horizonVal,
      });
      setSupplyPlan(data);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to evaluate water supply allocation.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !supplyPlan) {
    return <LoadingState message="Loading campus water supply allocation telemetry..." />;
  }

  if (error && !supplyPlan) {
    return (
      <ErrorState
        title="Supply Planning Error"
        message={error}
        onRetry={fetchSupplyPlan}
      />
    );
  }

  const isPredictionAvailable = Boolean(supplyPlan && supplyPlan.prediction_available);
  const isSufficient = supplyPlan?.status === 'SUFFICIENT';
  const isShortage = supplyPlan?.status === 'POTENTIAL SHORTAGE';

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div
        className={`rounded-xl border p-5 backdrop-blur shadow-sm transition-colors ${
          isSufficient
            ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200'
            : isShortage
            ? 'border-amber-500/30 bg-amber-950/20 text-amber-200'
            : 'border-cyan-500/30 bg-cyan-950/20 text-cyan-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`p-2 rounded-xl mt-0.5 ${
                isSufficient
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : isShortage
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-cyan-500/20 text-cyan-400'
              }`}
            >
              {isSufficient ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : isShortage ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <CalendarDays className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Campus Water Supply & Allocation Planning
                </h3>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    isSufficient
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : isShortage
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  }`}
                >
                  {supplyPlan?.status || 'Awaiting Input'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
                {supplyPlan?.message ||
                  'Evaluates reservoir water availability against ML demand forecasts to detect potential shortages.'}
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-mono">
            <span
              className={`h-2 w-2 rounded-full ${
                isPredictionAvailable ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span>
              {isPredictionAvailable ? 'Demand Engine Connected' : 'Waiting for Telemetry'}
            </span>
          </div>
        </div>
      </div>

      {/* Target Planning KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Available Water Supply"
          value={
            supplyPlan
              ? `${supplyPlan.available_water_liters.toFixed(2)} L`
              : `${parseFloat(availableInput || '0').toFixed(2)} L`
          }
          subtitle="Allocated tank volume"
          accentColor="cyan"
          icon={<Droplets className="w-5 h-5" />}
        />

        <KpiCard
          title="Projected Demand"
          value={
            isPredictionAvailable && supplyPlan && supplyPlan.predicted_demand_liters !== null
              ? `${supplyPlan.predicted_demand_liters.toFixed(2)} L`
              : '-- L'
          }
          subtitle={
            isPredictionAvailable
              ? `Forecast horizon: ${supplyPlan?.planning_horizon_hours || 1.0} hr`
              : 'Awaiting sufficient telemetry'
          }
          accentColor="indigo"
          icon={<Target className="w-5 h-5" />}
        />

        <KpiCard
          title="Supply Surplus / Gap"
          value={
            isPredictionAvailable && supplyPlan && supplyPlan.surplus_liters !== null
              ? `${supplyPlan.surplus_liters >= 0 ? '+' : ''}${supplyPlan.surplus_liters.toFixed(2)} L`
              : '-- L'
          }
          subtitle={
            isPredictionAvailable && supplyPlan && supplyPlan.surplus_liters !== null
              ? supplyPlan.surplus_liters >= 0
                ? 'Adequate reserves'
                : 'Potential shortage gap'
              : 'Demand unavailable'
          }
          accentColor={
            isPredictionAvailable && supplyPlan && supplyPlan.surplus_liters !== null
              ? supplyPlan.surplus_liters >= 0
                ? 'emerald'
                : 'amber'
              : 'slate'
          }
          icon={<Scale className="w-5 h-5" />}
          trendBadge={
            supplyPlan?.planning_status ? (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  isSufficient ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {supplyPlan.planning_status}
              </span>
            ) : undefined
          }
        />
      </div>

      {/* Interactive Allocation Form */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-6 shadow-sm">
        <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-cyan-400" />
          Evaluate Water Supply Adequacy
        </h4>
        <p className="text-xs text-slate-400 mb-6">
          Enter available reservoir/tank volume and forecast duration to evaluate whether current supply is sufficient for anticipated campus water demand.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Available Water Supply (Liters)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                required
                value={availableInput}
                onChange={(e) => setAvailableInput(e.target.value)}
                placeholder="e.g. 500"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Planning Horizon Window (Hours)
              </label>
              <input
                type="number"
                min="0.1"
                max="72"
                step="0.5"
                required
                value={horizonInput}
                onChange={(e) => setHorizonInput(e.target.value)}
                placeholder="e.g. 1.0"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400">
              Submits payload to <code>POST /api/supply</code>
            </span>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-4 py-2 text-xs transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? 'Evaluating Supply...' : 'Evaluate Water Allocation'}
            </button>
          </div>
        </form>

        {!isPredictionAvailable && (
          <div className="mt-6 p-4 rounded-xl border border-slate-800 bg-slate-950/60 text-xs text-slate-400 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-200">
                Demand Prediction Telemetry Required
              </p>
              <p className="mt-0.5 leading-relaxed">
                Water supply allocation requires demand forecasts from the ML prediction engine. When sufficient real historical readings accumulate in SQLite (minimum 10 readings), projected demand and surplus/deficit metrics will populate automatically.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
