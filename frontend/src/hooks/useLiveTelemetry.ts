import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';
import { LiveStatusResponse, SensorReading } from '../api/types';

export const useLiveTelemetry = (pollingIntervalMs: number = 3500) => {
  const [live, setLive] = useState<LiveStatusResponse | null>(null);
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(true);
  const timerRef = useRef<number | null>(null);

  const fetchTelemetry = useCallback(async () => {
    try {
      // Fetch live status
      const liveRes = await api.getLive();
      setLive(liveRes);

      // Fetch recent history for live charts
      const historyRes = await api.getHistory(30, 0);
      setHistory(historyRes.readings || []);

      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to communicate with AquaSense FastAPI backend.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const togglePolling = useCallback(() => {
    setIsPolling((prev) => !prev);
  }, []);

  // Polling loop
  useEffect(() => {
    fetchTelemetry();

    if (isPolling) {
      timerRef.current = window.setInterval(() => {
        fetchTelemetry();
      }, pollingIntervalMs);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [fetchTelemetry, isPolling, pollingIntervalMs]);

  const latestReading = live?.reading || null;
  const currentStatus = live?.status || 'IDLE';
  const hasData = Boolean(latestReading);

  return {
    live,
    latestReading,
    history,
    currentStatus,
    hasData,
    isLoading,
    error,
    isPolling,
    togglePolling,
    refresh: fetchTelemetry,
  };
};
