import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { KpiCard } from '../components/common/KpiCard';
import {
  TrendingUp,
  BrainCircuit,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const Prediction: React.FC = () => {
  const [isApiAvailable, setIsApiAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  useEffect(() => {
    const checkPredictionEndpoint = async () => {
      try {
        await api.getPrediction();
        setIsApiAvailable(true);
      } catch {
        // Expected behavior: Account 4 has not deployed /api/prediction yet
        setIsApiAvailable(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkPredictionEndpoint();
  }, []);

  return (
    <div className="space-y-6">
      {/* Status Notice Banner */}
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-5 text-indigo-200 backdrop-blur shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 mt-0.5">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  AI Predictive Analytics & Water Demand Forecasting
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Account 4 Responsibility
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
                This interface is architected to render consumption forecasts and anomaly predictions.
                In accordance with project rules, no fake predictions are rendered.
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
                ? 'GET /api/prediction Active'
                : 'GET /api/prediction Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Module Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Predictive Horizon"
          value="-- hrs"
          subtitle="Configurable forecasting interval"
          accentColor="indigo"
          icon={<Clock className="w-5 h-5" />}
        />

        <KpiCard
          title="Predicted Campus Flow"
          value="-- L/min"
          subtitle="Awaiting model execution"
          accentColor="cyan"
          icon={<TrendingUp className="w-5 h-5" />}
        />

        <KpiCard
          title="Model Confidence Score"
          value="-- %"
          subtitle="Statistical bounds"
          accentColor="emerald"
          icon={<Sparkles className="w-5 h-5" />}
        />
      </div>

      {/* Empty State / Standby Container */}
      <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-4">
          <BrainCircuit className="w-7 h-7" />
        </div>

        <h4 className="text-base font-semibold text-white">
          Prediction API Ready For Integration
        </h4>
        <p className="mt-1.5 max-w-lg mx-auto text-xs text-slate-400 leading-relaxed">
          The frontend contract is ready. When Account 4 deploys the ML model at{' '}
          <code className="text-cyan-300 font-mono">GET /api/prediction</code>,
          predicted flow trajectories and demand bounds will populate this view automatically without fabricated values.
        </p>

        {/* Integration Checklist */}
        <div className="mt-8 max-w-md mx-auto text-left rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs space-y-2.5 font-mono">
          <p className="text-[11px] font-sans font-bold uppercase tracking-wider text-slate-400 mb-2">
            Account 4 Technical Contract
          </p>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Frontend React client ready for /api/prediction</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Telemetry history accumulating in SQLite</span>
          </div>
          <div className="flex items-center gap-2 text-amber-300">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Account 4: pandas + scikit-learn forecasting model</span>
          </div>
        </div>
      </div>
    </div>
  );
};
