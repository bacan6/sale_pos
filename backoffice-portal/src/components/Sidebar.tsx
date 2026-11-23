import React from 'react';
import {
  LayoutDashboard,
  FolderTree,
  BookOpen,
  FileSpreadsheet,
  Scale,
  LineChart,
  Settings,
  CalendarCheck,
  Building2,
  LogOut,
  Layers,
} from 'lucide-react';
import type { TenantInfo, UserInfo } from '../types/auth';

export type ActiveTab =
  | 'dashboard'
  | 'coa'
  | 'journals'
  | 'ledger'
  | 'trial_balance'
  | 'reports'
  | 'settings'
  | 'periods';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  tenant: TenantInfo | null;
  user: UserInfo | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  tenant,
  user,
  onLogout,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Ringkasan Keuangan', desc: 'Financial KPI & Ratios', icon: LayoutDashboard },
    { id: 'coa', label: 'Bagan Akun (COA)', desc: 'Chart of Accounts', icon: FolderTree },
    { id: 'journals', label: 'Jurnal Umum (JV)', desc: 'General Journal Entries', icon: BookOpen },
    { id: 'ledger', label: 'Buku Besar', desc: 'Account General Ledger', icon: FileSpreadsheet },
    { id: 'trial_balance', label: 'Neraca Saldo', desc: 'Trial Balance Verification', icon: Scale },
    { id: 'reports', label: 'Laporan Keuangan', desc: 'Laba Rugi, Neraca, Arus Kas', icon: LineChart },
    { id: 'settings', label: 'Pemetaan Akun', desc: 'POS & Hotel Auto-Posting', icon: Settings },
    { id: 'periods', label: 'Tutup Buku Periode', desc: 'Monthly Closing & Lock', icon: CalendarCheck },
  ];

  return (
    <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col justify-between shrink-0 h-full p-4 select-none">
      <div className="flex flex-col min-h-0 flex-1">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2 py-3 mb-4 border-b border-neutral-800 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center font-bold text-white shadow-lg shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-xs tracking-tight text-white truncate uppercase">
              {tenant?.name || 'Back-Office Portal'}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400">
                Akuntansi
              </span>
              <span className="text-[10px] text-neutral-400 font-semibold truncate capitalize">
                {tenant?.plan ? tenant.plan.replace('_', ' ') : 'SaaS Integrated'}
              </span>
            </div>
          </div>
        </div>

        {/* Module Label */}
        <div className="px-2 mb-2 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
            MODUL BACK-OFFICE
          </span>
          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
            <Layers className="w-3 h-3" /> GL V1
          </span>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1 overflow-y-auto flex-1 pr-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all group ${
                  isActive
                    ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/70 font-medium'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                    isActive ? 'text-white' : 'text-neutral-400'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs block leading-tight truncate">{item.label}</span>
                  <span
                    className={`text-[9px] block mt-0.5 truncate ${
                      isActive ? 'text-emerald-100' : 'text-neutral-500'
                    }`}
                  >
                    {item.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User profile & Logout */}
      <div className="border-t border-neutral-800 pt-3 px-1 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
              {user?.username ? user.username.slice(0, 2).toUpperCase() : 'BO'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white leading-tight truncate">
                {user?.full_name || user?.username || 'Finance Officer'}
              </p>
              <p className="text-[10px] text-neutral-400 capitalize truncate">
                Role: {user?.role || 'accountant'}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Keluar (Logout)"
            className="p-2 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
