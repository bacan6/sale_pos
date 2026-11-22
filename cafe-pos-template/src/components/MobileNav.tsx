import React from 'react';
import { 
  CreditCard, Smartphone, UserCheck, Utensils, 
  Layers, Table 
} from 'lucide-react';
import type { ActiveTab } from './Sidebar';

interface MobileNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'cashier', label: 'Kasir', icon: CreditCard },
    { id: 'customer', label: 'Pelanggan', icon: Smartphone },
    { id: 'waitstaff', label: 'Waitstaff', icon: UserCheck },
    { id: 'kitchen', label: 'Dapur', icon: Utensils },
    { id: 'products', label: 'Produk', icon: Layers },
    { id: 'tables', label: 'Meja', icon: Table },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-neutral-900 border-t border-neutral-800 flex items-center justify-around px-1 z-40 shadow-2xl">
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as ActiveTab)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              isActive ? 'text-amber-500 font-bold' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'scale-110' : ''}`} />
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
