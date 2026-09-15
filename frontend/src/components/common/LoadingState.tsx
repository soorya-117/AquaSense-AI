import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data from AquaSense backend...',
  className = 'py-12',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-300">{message}</p>
      <p className="text-xs text-slate-500 mt-1">Polling FastAPI backend</p>
    </div>
  );
};
