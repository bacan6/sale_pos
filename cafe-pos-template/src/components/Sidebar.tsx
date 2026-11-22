import React from 'react';
import { 
  CreditCard, Smartphone, UserCheck, Utensils, 
  Layers, Table, Coffee
} from 'lucide-react';

export type ActiveTab = 'cashier' | 'customer' | 'waitstaff' | 'kitchen' | 'products' | 'tables';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'cashier', label: 'Kasir', desc: 'Point of Sale', icon: CreditCard },
    { id: 'customer', label: 'Menu Pelanggan', desc: 'Self-Order Kiosk', icon: Smartphone },
    { id: 'waitstaff', label: 'Pramuniaga', desc: 'Waitstaff Order', icon: UserCheck },
    { id: 'kitchen', label: 'Struk & Kitchen', desc: 'Dapur (KDS)', icon: Utensils },
    { id: 'products', label: 'Kelola Produk', desc: 'Katalog & Harga', icon: Layers },
    { id: 'tables', label: 'Kelola Meja', desc: 'Denah & Status', icon: Table },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-neutral-900 text-white border-r border-neutral-800 p-4 justify-between shrink-0">
      <div>
        <div className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-neutral-800">
          <div className="w-10 h-10 rounded-2xl bg-amber-600 flex items-center justify-center font-bold text-white shadow-md">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-black text-sm tracking-tight text-white">KOPI SENJA</h1>
            <p className="text-[11px] font-semibold text-amber-500">POS & Cafe Template</p>
          </div>
        </div>

        <nav className="space-y-1.5">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left transition-all group ${
                  isActive 
                    ? 'bg-amber-600 text-white font-bold shadow-md shadow-amber-600/30' 
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60 font-medium'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform group-hover:scale-105 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                <div className="flex-1">
                  <span className="text-xs block leading-tight">{item.label}</span>
                  <span className={`text-[10px] block mt-0.5 ${isActive ? 'text-amber-100' : 'text-neutral-500'}`}>
                    {item.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-neutral-800 pt-4 px-2 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-bold text-amber-500">
            KS
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-white leading-tight">Kasir Shift 01</p>
            <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Online
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
