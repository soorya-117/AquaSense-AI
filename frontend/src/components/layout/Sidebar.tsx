import React from 'react';
import {
  LayoutDashboard,
  Droplets,
  AlertTriangle,
  TrendingUp,
  CalendarDays,
  ServerCog,
  Waves,
} from 'lucide-react';

export type PageId =
  | 'dashboard'
  | 'water-usage'
  | 'anomaly-detection'
  | 'prediction'
  | 'water-planning'
  | 'system';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
}

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
}) => {
  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'water-usage',
      label: 'Water Usage',
      icon: <Droplets className="w-4 h-4" />,
    },
    {
      id: 'anomaly-detection',
      label: 'Anomaly Detection',
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    {
      id: 'prediction',
      label: 'Prediction',
      icon: <TrendingUp className="w-4 h-4" />,
      badge: 'ML Ready',
    },
    {
      id: 'water-planning',
      label: 'Water Planning',
      icon: <CalendarDays className="w-4 h-4" />,
      badge: 'Planning',
    },
    {
      id: 'system',
      label: 'System & Health',
      icon: <ServerCog className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-800/80 bg-slate-950 flex flex-col justify-between p-4">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-3 py-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20">
            <Waves className="w-5 h-5 font-bold" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">AquaSense AI</h1>
            <p className="text-[11px] font-medium text-cyan-400">Campus Water OS</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPage(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-cyan-400' : 'text-slate-500'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-800/80 pt-4 px-3">
        <div className="rounded-lg bg-slate-900/50 p-3 border border-slate-800/60 text-[11px] text-slate-400">
          <div className="flex items-center justify-between text-slate-300 mb-1">
            <span className="font-semibold">Hardware Link</span>
            <span className="text-emerald-400 font-mono text-[10px]">Active</span>
          </div>
          <p className="text-slate-500 text-[10px] leading-tight">
            ESP32 (GPIO 27 & 26) → FastAPI
          </p>
        </div>
      </div>
    </aside>
  );
};
