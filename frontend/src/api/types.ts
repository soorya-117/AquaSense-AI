/**
 * TypeScript interfaces matching FastAPI backend schemas exactly.
 */

export type WaterStatus = 'NORMAL' | 'POSSIBLE WATER LOSS' | 'SENSOR/CALIBRATION ANOMALY' | 'IDLE';

export interface SensorReading {
  id: number;
  timestamp: string;
  sensor1_pulses: number;
  sensor2_pulses: number;
  sensor1_flow: number;
  sensor2_flow: number;
  sensor1_volume: number;
  sensor2_volume: number;
  flow_difference: number;
  flow_ratio: number;
  status: WaterStatus | string;
}

export interface LiveStatusResponse {
  status: WaterStatus | string;
  timestamp: string;
  reading: SensorReading | null;
  message?: string | null;
}

export interface HistoryResponse {
  total: number;
  limit: number;
  offset: number;
  readings: SensorReading[];
}

export interface AnalyticsSummaryResponse {
  total_readings: number;
  total_pulses_sensor1: number;
  total_pulses_sensor2: number;
  total_volume_sensor1_liters: number;
  total_volume_sensor2_liters: number;
  average_flow_sensor1_lmin: number;
  average_flow_sensor2_lmin: number;
  flow_difference?: number;
  flow_ratio?: number;
  estimated_water_loss_liters: number;
  estimated_water_loss?: number;
  cumulative_upstream_volume_liters?: number;
  cumulative_downstream_volume_liters?: number;
  status_counts: {
    NORMAL?: number;
    'POSSIBLE WATER LOSS'?: number;
    'SENSOR/CALIBRATION ANOMALY'?: number;
    [key: string]: number | undefined;
  };
  latest_status: string | null;
}

export interface HourlyAnalyticsItem {
  hour: string;
  timestamp: string;
  upstream_volume_liters: number;
  downstream_volume_liters: number;
  upstream_volume?: number;
  downstream_volume?: number;
  average_flow_sensor1_lmin: number;
  average_flow_sensor2_lmin: number;
  flow_difference: number;
  flow_ratio: number;
  estimated_water_loss_liters: number;
  estimated_water_loss?: number;
  reading_count: number;
}

export interface DailyAnalyticsItem {
  date: string;
  upstream_volume_liters: number;
  downstream_volume_liters: number;
  upstream_volume?: number;
  downstream_volume?: number;
  estimated_water_loss_liters: number;
  estimated_water_loss?: number;
  average_flow_sensor1_lmin: number;
  average_upstream_flow?: number;
  average_flow_sensor2_lmin: number;
  average_downstream_flow?: number;
  flow_difference: number;
  flow_ratio: number;
  reading_count: number;
}

export interface AnomalyRecord {
  id: number;
  timestamp: string;
  sensor1_pulses: number;
  sensor2_pulses: number;
  sensor1_flow: number;
  sensor2_flow: number;
  sensor1_volume: number;
  sensor2_volume: number;
  flow_difference: number;
  flow_ratio: number;
  status: WaterStatus | string;
  anomaly_type: string;
  details: string;
}

export interface HealthResponse {
  status: string;
  database: string;
  total_records: number;
  timestamp: string;
}
