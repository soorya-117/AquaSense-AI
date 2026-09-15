import React from 'react';
import { PageId, Sidebar } from './Sidebar';
import { Header } from './Header';
import { WaterStatus } from '../../api/types';

interface LayoutProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  pageTitle: string;
  pageSubtitle?: string;
  status?: WaterStatus | string;
  lastUpdated?: string | null;
  isPolling?: boolean;
  onTogglePolling?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentPage,
  onSelectPage,
  pageTitle,
  pageSubtitle,
  status = 'IDLE',
  lastUpdated,
  isPolling = true,
  onTogglePolling,
  onRefresh,
  isLoading = false,
  children,
}) => {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar currentPage={currentPage} onSelectPage={onSelectPage} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          title={pageTitle}
          subtitle={pageSubtitle}
          status={status}
          lastUpdated={lastUpdated}
          isPolling={isPolling}
          onTogglePolling={onTogglePolling}
          onRefresh={onRefresh}
          isLoading={isLoading}
        />

        <main className="flex-1 overflow-y-auto p-6 bg-slate-950/40">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
};
