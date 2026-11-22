import React from 'react';
import { 
  CreditCard, UserCheck, Utensils, 
  Layers, Table, ShieldCheck, Grid, Sparkles, Moon
} from 'lucide-react';
import type { ActiveTab } from './Sidebar';

interface MobileNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  const isHotel = activeTab.startsWith('hotel_');

  const posNavItems = [
    { id: 'cashier', label: 'Kasir', icon: CreditCard },
    { id: 'waitstaff', label: 'Waiter', icon: UserCheck },
    { id: 'kitchen', label: 'Dapur', icon: Utensils },
    { id: 'products', label: 'Menu', icon: Layers },
    { id: 'tables', label: 'Meja', icon: Table },
    { id: 'saas_billing', label: 'SaaS', icon: ShieldCheck },
  ];

  const hotelNavItems = [
    { id: 'hotel_rack', label: 'Kamar', icon: Grid },
    { id: 'hotel_front_desk', label: 'Front Desk', icon: UserCheck },
    { id: 'hotel_folio', label: 'Folio', icon: CreditCard },
    { id: 'hotel_housekeeping', label: 'Cleaning', icon: Sparkles },
    { id: 'hotel_night_audit', label: 'Audit', icon: Moon },
    { id: 'saas_billing', label: 'SaaS', icon: ShieldCheck },
  ];

  const navItems = isHotel ? hotelNavItems : posNavItems;

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
            <span className="text-[9px] mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
