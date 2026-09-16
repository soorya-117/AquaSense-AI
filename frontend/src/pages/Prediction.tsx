import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { WaterDemandPredictionResponse } from '../api/types';
import { KpiCard } from '../components/common/KpiCard';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import {
  TrendingUp,
  BrainCircuit,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Layers,
  Info,
} from 'lucide-react';

export const Prediction: React.FC = () => {
  const [prediction, setPrediction] = useState<WaterDemandPredictionResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrediction = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getPrediction();
      setPrediction(data);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to retrieve water demand prediction from backend.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrediction();
  }, [fetchPrediction]);

  if (isLoading && !prediction) {
    return <LoadingState message="Loading water demand forecasting telemetry..." />;
  }

  if (error && !prediction) {
    return (
      <ErrorState
        title="Prediction Service Error"
        message={error}
        onRetry={fetchPrediction}
      />
    );
  }

  const isAvailable = Boolean(prediction && prediction.is_available);

  return (
    <div className="space-y-6">
      {/* Status Notice Banner */}
      <div
        className={`rounded-xl border p-5 backdrop-blur shadow-sm transition-colors ${
          isAvailable
            ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200'
            : 'border-indigo-500/30 bg-indigo-950/20 text-indigo-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`p-2 rounded-xl mt-0.5 ${
                isAvailable
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-indigo-500/20 text-indigo-400'
              }`}
            >
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  AI Predictive Analytics & Water Demand Forecasting
                </h3>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    isAvailable
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  }`}
                >
                  {isAvailable ? 'Model Active' : 'Waiting for Telemetry'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
                {isAvailable
                  ? 'Interpretable Linear Regression forecasting upcoming campus water demand rates based on real historical flow sequence and trend features.'
                  : 'Predictive forecasting model requires real historical telemetry stored in SQLite. In accordance with project rules, zero fake readings are fabricated.'}
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-mono">
            <span
              className={`h-2 w-2 rounded-full ${
                isAvailable ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span>
              {isAvailable ? 'GET /api/prediction Ready' : 'Insufficient Historical Data'}
            </span>
          </div>
        </div>
      </div>

      {/* Module Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Predictive Horizon"
          value={
            isAvailable && prediction
              ? `${prediction.prediction_horizon_hours} hr`
              : '-- hrs'
          }
          subtitle="Forecast planning interval"
          accentColor="indigo"
          icon={<Clock className="w-5 h-5" />}
        />

        <KpiCard
          title="Predicted Campus Flow"
          value={
            isAvailable && prediction && prediction.predicted_flow_lmin !== null
              ? `${prediction.predicted_flow_lmin.toFixed(2)}`
              : '--'
          }
          unit={isAvailable ? 'L/min' : undefined}
          subtitle={
            isAvailable && prediction && prediction.predicted_demand_liters !== null
              ? `Projected volume: ${prediction.predicted_demand_liters.toFixed(2)} L`
              : 'Awaiting sufficient readings'
          }
          accentColor="cyan"
          icon={<TrendingUp className="w-5 h-5" />}
        />

        <KpiCard
          title="Model Confidence Score"
          value={
            isAvailable && prediction && prediction.confidence_score !== null
              ? `${prediction.confidence_score.toFixed(1)} %`
              : '-- %'
          }
          subtitle={
            isAvailable && prediction
              ? `From ${prediction.observations_used} real observations`
              : 'Statistical bounds'
          }
          accentColor="emerald"
          icon={<Sparkles className="w-5 h-5" />}
        />
      </div>

      {/* Main Content: Active Prediction Details OR Insufficient Data State */}
      {isAvailable && prediction ? (
        <div className="space-y-6">
          {/* Active Model Insights Card */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-6 shadow-sm">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Demand Forecast Specification & Model Diagnostics
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5 space-y-1">
                <span className="text-slate-400">Forecasting Algorithm</span>
                <p className="font-semibold text-white">{prediction.model_name || 'Linear Regression'}</p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5 space-y-1">
                <span className="text-slate-400">Observations Analyzed</span>
                <p className="font-semibold text-white">{prediction.observations_used} readings</p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5 space-y-1">
                <span className="text-slate-400">Projected Volumetric Demand</span>
                <p className="font-semibold text-cyan-400 font-mono">
                  {prediction.predicted_demand_liters?.toFixed(3)} Liters
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5 space-y-1">
                <span className="text-slate-400">Evaluation Timestamp</span>
                <p className="font-mono text-slate-300">
                  {new Date(prediction.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div className="mt-4 p-3.5 rounded-lg border border-slate-800 bg-slate-950/40 text-xs text-slate-300 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Model Note:</strong> {prediction.message} Predictions are derived from sequential trend analysis of real upstream sensor telemetry and are passed directly to the Water Supply Planner.
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Standby Container when insufficient data */
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-4">
            <BrainCircuit className="w-7 h-7" />
          </div>

          <h4 className="text-base font-semibold text-white">
            Insufficient Historical Data for Prediction
          </h4>
          <p className="mt-1.5 max-w-lg mx-auto text-xs text-slate-400 leading-relaxed">
            The machine learning engine requires real telemetry readings to train the linear trend model.
            Currently, <strong className="text-slate-200">{prediction?.observations_used ?? 0}</strong> observations are stored in SQLite (minimum 10 required).
            No synthetic data is fabricated.
          </p>

          {/* Integration Status Checklist */}
          <div className="mt-8 max-w-md mx-auto text-left rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs space-y-2.5 font-mono">
            <p className="text-[11px] font-sans font-bold uppercase tracking-wider text-slate-400 mb-2">
              Model Readiness Status
            </p>
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>FastAPI endpoint <code>GET /api/prediction</code> online</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>scikit-learn Linear Regression engine configured</span>
            </div>
            <div className="flex items-center gap-2 text-amber-300">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Awaiting {Math.max(0, 10 - (prediction?.observations_used ?? 0))} more readings from ESP32
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
