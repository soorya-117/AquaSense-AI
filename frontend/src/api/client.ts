/**
 * Clean, configurable API client for AquaSense AI FastAPI backend.
 */

import {
  AnalyticsSummaryResponse,
  AnomalyRecord,
  DailyAnalyticsItem,
  HealthResponse,
  HistoryResponse,
  HourlyAnalyticsItem,
  LiveStatusResponse,
} from './types';

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(
          `API Error: ${response.status} ${response.statusText} (${endpoint})`
        );
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error(`Unknown network error requesting ${endpoint}`);
    }
  }

  /**
   * GET /api/live - Returns the latest sensor reading and system status.
   */
  async getLive(): Promise<LiveStatusResponse> {
    return this.request<LiveStatusResponse>('/api/live');
  }

  /**
   * GET /api/history - Returns paginated historical sensor readings.
   */
  async getHistory(limit: number = 50, offset: number = 0): Promise<HistoryResponse> {
    return this.request<HistoryResponse>(
      `/api/history?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`
    );
  }

  /**
   * GET /api/analytics/summary - Returns aggregated water usage analytics.
   */
  async getAnalytics(): Promise<AnalyticsSummaryResponse> {
    return this.request<AnalyticsSummaryResponse>('/api/analytics/summary');
  }

  /**
   * GET /api/analytics/hourly - Returns hourly aggregated water flow and volume telemetry.
   */
  async getHourlyAnalytics(): Promise<HourlyAnalyticsItem[]> {
    return this.request<HourlyAnalyticsItem[]>('/api/analytics/hourly');
  }

  /**
   * GET /api/analytics/daily - Returns daily aggregated water flow and volume telemetry.
   */
  async getDailyAnalytics(): Promise<DailyAnalyticsItem[]> {
    return this.request<DailyAnalyticsItem[]>('/api/analytics/daily');
  }

  /**
   * GET /api/anomalies - Returns detected water loss and sensor anomaly incidents.
   */
  async getAnomalies(
    limit: number = 100,
    offset: number = 0,
    status?: string
  ): Promise<AnomalyRecord[]> {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    if (status) {
      params.set('status', status);
    }
    return this.request<AnomalyRecord[]>(`/api/anomalies?${params.toString()}`);
  }

  /**
   * GET /api/health - Returns system health, database status, and record count.
   */
  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/api/health');
  }

  /**
   * GET /api/prediction - Placeholder ready for Account 4.
   */
  async getPrediction(): Promise<unknown> {
    return this.request<unknown>('/api/prediction');
  }

  /**
   * GET /api/supply - Placeholder ready for Account 4.
   */
  async getSupply(): Promise<unknown> {
    return this.request<unknown>('/api/supply');
  }
}

export const api = new ApiClient(API_BASE_URL);
