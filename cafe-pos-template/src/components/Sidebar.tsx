import React from 'react';
import { 
  CreditCard, Smartphone, UserCheck, Utensils, 
  Layers, Table, Coffee, ShieldCheck, LogOut
} from 'lucide-react';
import type { TenantInfo, UserInfo } from '../types/auth';

export type ActiveTab = 'cashier' | 'customer' | 'waitstaff' | 'kitchen' | 'products' | 'tables' | 'saas_billing';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  tenant: TenantInfo | null;
  user: UserInfo | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, tenant, user, onLogout }) => {
  const navItems = [
    { id: 'cashier', label: 'Kasir', desc: 'Point of Sale', icon: CreditCard },
    { id: 'customer', label: 'Menu Pelanggan', desc: 'Self-Order Kiosk', icon: Smartphone },
    { id: 'waitstaff', label: 'Pramuniaga', desc: 'Waitstaff Order', icon: UserCheck },
    { id: 'kitchen', label: 'Struk & Kitchen', desc: 'Dapur (KDS)', icon: Utensils },
    { id: 'products', label: 'Kelola Produk', desc: 'Katalog & Harga', icon: Layers },
    { id: 'tables', label: 'Kelola Meja', desc: 'Denah & Status', icon: Table },
    { id: 'saas_billing', label: 'Langganan SaaS', desc: 'Billing & Lifecycle', icon: ShieldCheck },
  ];

  const tenantStatus = tenant?.status || 'active';

  return (
    <aside className="hidden md:flex flex-col w-64 bg-neutral-900 text-white border-r border-neutral-800 p-4 justify-between shrink-0">
      <div>
        <div className="flex items-center gap-3 px-2 py-3 mb-4 border-b border-neutral-800">
          <div className="w-10 h-10 rounded-2xl bg-amber-600 flex items-center justify-center font-bold text-white shadow-md shrink-0">
            <Coffee className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-xs tracking-tight text-white truncate">
              {tenant?.name || 'KOPI SENJA'}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                tenantStatus === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                tenantStatus === 'waiting_activation' ? 'bg-amber-500/20 text-amber-300' :
                tenantStatus === 'on_hold' ? 'bg-orange-500/20 text-orange-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {tenantStatus}
              </span>
              <span className="text-[10px] text-neutral-400 font-semibold truncate capitalize">
                {tenant?.plan || 'Starter'}
              </span>
            </div>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all group ${
                  isActive 
                    ? 'bg-amber-600 text-white font-bold shadow-md shadow-amber-600/30' 
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60 font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 transition-transform group-hover:scale-105 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs block leading-tight">{item.label}</span>
                  <span className={`text-[9px] block mt-0.5 truncate ${isActive ? 'text-amber-100' : 'text-neutral-500'}`}>
                    {item.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User info & Logout */}
      <div className="border-t border-neutral-800 pt-3 px-1 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-bold text-amber-500 shrink-0">
              {user?.username ? user.username.slice(0, 2).toUpperCase() : 'AD'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white leading-tight truncate">
                {user?.full_name || user?.username || 'Administrator'}
              </p>
              <p className="text-[10px] text-neutral-400 capitalize truncate">
                Role: {user?.role || 'admin'}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Keluar (Logout)"
            className="p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
