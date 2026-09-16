import React, { useState } from 'react';
import { Layout } from './components/layout/Layout';
import { PageId } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { WaterUsage } from './pages/WaterUsage';
import { AnomalyDetection } from './pages/AnomalyDetection';
import { Prediction } from './pages/Prediction';
import { WaterPlanning } from './pages/WaterPlanning';
import { SystemPage } from './pages/SystemPage';
import { useLiveTelemetry } from './hooks/useLiveTelemetry';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const { currentStatus, latestReading, isPolling, togglePolling, refresh, isLoading } =
    useLiveTelemetry(3500);

  const getPageMeta = (page: PageId) => {
    switch (page) {
      case 'dashboard':
        return {
          title: 'Campus Telemetry Dashboard',
          subtitle: 'Live flow rate differentials and real-time monitoring',
        };
      case 'water-usage':
        return {
          title: 'Historical Water Usage & Trends',
          subtitle: 'Cumulative volumetric records and telemetry history',
        };
      case 'anomaly-detection':
        return {
          title: 'Anomaly & Water Loss Diagnostics',
          subtitle: 'Standardized status classifications and incident logs',
        };
      case 'prediction':
        return {
          title: 'AI Predictive Forecasting',
          subtitle: 'Linear regression demand forecasting based on historical telemetry',
        };
      case 'water-planning':
        return {
          title: 'Water Supply & Allocation Planning',
          subtitle: 'Campus reservoir capacity and demand allocation planning',
        };
      case 'system':
        return {
          title: 'System Health & Engine Status',
          subtitle: 'FastAPI service diagnostics and database connectivity',
        };
      default:
        return {
          title: 'AquaSense AI',
          subtitle: 'Intelligent Campus Water Management',
        };
    }
  };

  const meta = getPageMeta(currentPage);

  return (
    <Layout
      currentPage={currentPage}
      onSelectPage={setCurrentPage}
      pageTitle={meta.title}
      pageSubtitle={meta.subtitle}
      status={currentStatus}
      lastUpdated={latestReading?.timestamp || null}
      isPolling={isPolling}
      onTogglePolling={togglePolling}
      onRefresh={refresh}
      isLoading={isLoading}
    >
      {currentPage === 'dashboard' && <Dashboard />}
      {currentPage === 'water-usage' && <WaterUsage />}
      {currentPage === 'anomaly-detection' && <AnomalyDetection />}
      {currentPage === 'prediction' && <Prediction />}
      {currentPage === 'water-planning' && <WaterPlanning />}
      {currentPage === 'system' && <SystemPage />}
    </Layout>
  );
};

export default App;
