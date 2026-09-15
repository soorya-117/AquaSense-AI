import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Backend Communication Error',
  message,
  onRetry,
  className = 'my-6',
}) => {
  return (
    <div
      className={`rounded-xl border border-rose-500/30 bg-rose-950/20 p-5 text-rose-200 backdrop-blur ${className}`}
    >
      <div className="flex items-start gap-3.5">
        <div className="rounded-lg bg-rose-500/20 p-2 text-rose-400">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-rose-200">{title}</h4>
          <p className="mt-1 text-xs text-rose-300/90 leading-relaxed">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/30 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Connection
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
