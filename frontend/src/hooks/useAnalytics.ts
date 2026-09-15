import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { AnalyticsSummaryResponse, SensorReading } from '../api/types';

export const useAnalytics = (historyLimit: number = 100) => {
  const [analytics, setAnalytics] = useState<AnalyticsSummaryResponse | null>(null);
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [summaryRes, historyRes] = await Promise.all([
        api.getAnalytics(),
        api.getHistory(historyLimit, 0),
      ]);
      setAnalytics(summaryRes);
      setHistory(historyRes.readings || []);
      setTotalRecords(historyRes.total || 0);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch analytics from AquaSense backend.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [historyLimit]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  return {
    analytics,
    history,
    totalRecords,
    isLoading,
    error,
    refresh: fetchAnalyticsData,
  };
};
