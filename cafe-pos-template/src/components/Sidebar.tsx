import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Smartphone, UserCheck, Utensils, 
  Layers, Table, Coffee, ShieldCheck, LogOut,
  Building2, Grid, Sparkles, Moon, CalendarDays,
  ShoppingBag, Users, PackageSearch, Clock, Shirt,
  Car, Key, FileText
} from 'lucide-react';
import type { TenantInfo, UserInfo } from '../types/auth';

export type ActiveTab = 
  | 'cashier' | 'customer' | 'waitstaff' | 'kitchen' | 'products' | 'tables' | 'pos_inventory' | 'pos_shifts'
  | 'hotel_rack' | 'hotel_timeline' | 'hotel_front_desk' | 'hotel_folio' | 'hotel_services' | 'hotel_guests' | 'hotel_housekeeping' | 'hotel_lost_found' | 'hotel_shifts' | 'hotel_night_audit' | 'hotel_rooms'
  | 'laundry_cashier' | 'laundry_kanban' | 'laundry_racks' | 'laundry_services'
  | 'banquet_calendar' | 'banquet_bookings' | 'banquet_rooms'
  | 'parking_cashier' | 'smart_locks'
  | 'saas_billing';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  tenant: TenantInfo | null;
  user: UserInfo | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, tenant, user, onLogout }) => {
  const tenantModules = (tenant?.modules || 'combo').toLowerCase();
  const hasPos = tenantModules === 'combo' || tenantModules === 'pos' || tenantModules === 'all';
  const hasHotel = tenantModules === 'combo' || tenantModules === 'hotel' || tenantModules === 'all';
  const hasLaundry = tenantModules === 'combo' || tenantModules === 'all' || tenantModules.includes('laundry');
  const hasBanquet = tenantModules === 'all' || tenantModules.includes('banquet');
  const hasParking = tenantModules === 'all' || tenantModules.includes('parking');

  const [businessMode, setBusinessMode] = useState<'pos' | 'hotel' | 'laundry' | 'banquet' | 'parking'>(
    hasHotel && !hasPos && !hasLaundry && !hasBanquet && !hasParking ? 'hotel' :
    hasLaundry && !hasPos && !hasHotel && !hasBanquet && !hasParking ? 'laundry' :
    hasBanquet && !hasPos && !hasHotel && !hasLaundry && !hasParking ? 'banquet' :
    hasParking && !hasPos && !hasHotel && !hasLaundry && !hasBanquet ? 'parking' : 'pos'
  );

  useEffect(() => {
    if (activeTab.startsWith('hotel_')) {
      setBusinessMode('hotel');
    } else if (activeTab.startsWith('laundry_')) {
      setBusinessMode('laundry');
    } else if (activeTab.startsWith('banquet_')) {
      setBusinessMode('banquet');
    } else if (activeTab.startsWith('parking_') || activeTab === 'smart_locks') {
      setBusinessMode('parking');
    } else if (['cashier', 'customer', 'waitstaff', 'kitchen', 'products', 'tables', 'pos_inventory', 'pos_shifts'].includes(activeTab)) {
      setBusinessMode('pos');
    }
  }, [activeTab]);

  useEffect(() => {
    if (!hasPos && hasHotel && !hasLaundry && businessMode !== 'hotel') {
      setBusinessMode('hotel');
      setActiveTab('hotel_rack');
    } else if (!hasPos && !hasHotel && hasLaundry && businessMode !== 'laundry') {
      setBusinessMode('laundry');
      setActiveTab('laundry_cashier');
    } else if (!hasHotel && hasPos && businessMode !== 'pos') {
      setBusinessMode('pos');
      setActiveTab('cashier');
    }
  }, [hasPos, hasHotel, hasLaundry]);

  const posNavItems = [
    { id: 'cashier', label: 'Kasir', desc: 'Point of Sale', icon: CreditCard },
    { id: 'customer', label: 'Menu Pelanggan', desc: 'Self-Order Kiosk', icon: Smartphone },
    { id: 'waitstaff', label: 'Pramuniaga', desc: 'Waitstaff Order', icon: UserCheck },
    { id: 'kitchen', label: 'Struk & Kitchen', desc: 'Dapur (KDS)', icon: Utensils },
    { id: 'pos_inventory', label: 'Bahan & Resep', desc: 'BOM & Stok Bahan', icon: PackageSearch },
    { id: 'pos_shifts', label: 'Shift Kasir', desc: 'Modal & Kas Laci', icon: Clock },
    { id: 'products', label: 'Kelola Produk', desc: 'Katalog & Harga', icon: Layers },
    { id: 'tables', label: 'Kelola Meja', desc: 'Denah & Status', icon: Table },
  ];

  const hotelNavItems = [
    { id: 'hotel_rack', label: 'Denah Kamar', desc: 'Room Rack & Status', icon: Grid },
    { id: 'hotel_timeline', label: 'Timeline Kalender', desc: 'Gantt Chart Okupansi', icon: CalendarDays },
    { id: 'hotel_front_desk', label: 'Front Desk', desc: 'Reservasi & Pindah', icon: UserCheck },
    { id: 'hotel_folio', label: 'Folio & Kasir', desc: 'Tagihan & Settle', icon: CreditCard },
    { id: 'hotel_services', label: 'Layanan Hotel', desc: 'Katalog Add-on Ekstra', icon: ShoppingBag },
    { id: 'hotel_guests', label: 'Tamu & CRM', desc: 'VIP Tier & Blacklist', icon: Users },
    { id: 'hotel_housekeeping', label: 'Housekeeping', desc: 'Kebersihan & Tugas', icon: Sparkles },
    { id: 'hotel_lost_found', label: 'Lost & Found', desc: 'Barang Tertinggal', icon: PackageSearch },
    { id: 'hotel_shifts', label: 'Shift Kasir', desc: 'Serah Terima Kasir', icon: Clock },
    { id: 'hotel_night_audit', label: 'Night Audit', desc: 'Okupansi & Tutup Buku', icon: Moon },
    { id: 'hotel_rooms', label: 'Kelola Kamar', desc: 'Tipe & Master Unit', icon: Layers },
  ];

  const laundryNavItems = [
    { id: 'laundry_cashier', label: 'Kasir & Terima', desc: 'Order Baru & Timbang', icon: CreditCard },
    { id: 'laundry_kanban', label: 'Pipeline Cucian', desc: 'Cuci, Kering, Setrika', icon: Sparkles },
    { id: 'laundry_racks', label: 'Rak & Ambil', desc: 'Lokasi Rak & Serah', icon: PackageSearch },
    { id: 'laundry_services', label: 'Kelola Layanan', desc: 'Tarif Kiloan & Satuan', icon: Layers },
  ];

  const banquetNavItems = [
    { id: 'banquet_calendar', label: 'Denah & Kalender', desc: 'Timeline & Okupansi Ruang', icon: CalendarDays },
    { id: 'banquet_bookings', label: 'BEO & Reservasi', desc: 'Event Order & DP Status', icon: FileText },
    { id: 'banquet_rooms', label: 'Ruangan & Paket', desc: 'Kapasitas & Fasilitas', icon: Layers },
  ];

  const parkingNavItems = [
    { id: 'parking_cashier', label: 'Pos Parkir & Tiket', desc: 'Gerbang & Kasir Tiket', icon: Car },
    { id: 'smart_locks', label: 'Smart Lock & IoT', desc: 'Kunci Akses & Gate Relay', icon: Key },
  ];

  const activeNavItems = 
    businessMode === 'hotel' ? hotelNavItems : 
    businessMode === 'laundry' ? laundryNavItems : 
    businessMode === 'banquet' ? banquetNavItems :
    businessMode === 'parking' ? parkingNavItems : posNavItems;
  const tenantStatus = tenant?.status || 'active';

  return (
    <aside className="hidden md:flex flex-col w-64 bg-neutral-900 text-white border-r border-neutral-800 p-4 justify-between shrink-0 h-full">
      <div className="flex flex-col min-h-0 flex-1">
        {/* Brand & Tenant Info */}
        <div className="flex items-center gap-3 px-2 py-3 mb-3 border-b border-neutral-800 shrink-0">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-md shrink-0 ${
            businessMode === 'hotel' ? 'bg-amber-600' :
            businessMode === 'laundry' ? 'bg-cyan-600' :
            businessMode === 'banquet' ? 'bg-amber-600' :
            businessMode === 'parking' ? 'bg-cyan-600' : 'bg-amber-600'
          }`}>
            {businessMode === 'hotel' ? <Building2 className="w-5 h-5" /> :
             businessMode === 'laundry' ? <Shirt className="w-5 h-5" /> :
             businessMode === 'banquet' ? <CalendarDays className="w-5 h-5" /> :
             businessMode === 'parking' ? <Car className="w-5 h-5" /> :
             <Coffee className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-xs tracking-tight text-white truncate uppercase">
              {tenant?.name || 'SaaS Business'}
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
                {tenant?.plan ? tenant.plan.replace('_', ' ') : 'Combo Pro'}
              </span>
            </div>
          </div>
        </div>

        {/* Business Switcher Segmented Control (Multi-Business Selector) */}
        {((hasPos ? 1 : 0) + (hasHotel ? 1 : 0) + (hasLaundry ? 1 : 0) + (hasBanquet ? 1 : 0) + (hasParking ? 1 : 0)) > 1 && (
          <div className="mb-3 p-1 bg-neutral-800/80 rounded-xl flex flex-wrap items-center text-xs font-bold border border-neutral-700/60 shrink-0 gap-1">
            {hasPos && (
              <button
                onClick={() => {
                  setBusinessMode('pos');
                  setActiveTab('cashier');
                }}
                className={`flex-1 py-1 px-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  businessMode === 'pos'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Coffee className="w-3 h-3 shrink-0" />
                <span className="truncate text-[10px]">Cafe</span>
              </button>
            )}
            {hasHotel && (
              <button
                onClick={() => {
                  setBusinessMode('hotel');
                  setActiveTab('hotel_rack');
                }}
                className={`flex-1 py-1 px-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  businessMode === 'hotel'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Building2 className="w-3 h-3 shrink-0" />
                <span className="truncate text-[10px]">Hotel</span>
              </button>
            )}
            {hasLaundry && (
              <button
                onClick={() => {
                  setBusinessMode('laundry');
                  setActiveTab('laundry_cashier');
                }}
                className={`flex-1 py-1 px-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  businessMode === 'laundry'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Shirt className="w-3 h-3 shrink-0" />
                <span className="truncate text-[10px]">Laundry</span>
              </button>
            )}
            {hasBanquet && (
              <button
                onClick={() => {
                  setBusinessMode('banquet');
                  setActiveTab('banquet_calendar');
                }}
                className={`flex-1 py-1 px-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  businessMode === 'banquet'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <CalendarDays className="w-3 h-3 shrink-0" />
                <span className="truncate text-[10px]">Banquet</span>
              </button>
            )}
            {hasParking && (
              <button
                onClick={() => {
                  setBusinessMode('parking');
                  setActiveTab('parking_cashier');
                }}
                className={`flex-1 py-1 px-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  businessMode === 'parking'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Car className="w-3 h-3 shrink-0" />
                <span className="truncate text-[10px]">Parkir</span>
              </button>
            )}
          </div>
        )}

        {/* Module Label */}
        <div className="px-2 mb-1.5 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
            {businessMode === 'hotel' ? 'MODUL HOTEL & PMS' :
             businessMode === 'laundry' ? 'MODUL LAUNDRY POS' :
             businessMode === 'banquet' ? 'MODUL BANQUET & MEETING' :
             businessMode === 'parking' ? 'MODUL SMART PARKING' : 'MODUL CAFE & RESTO POS'}
          </span>
          <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.2 rounded">
            {businessMode === 'parking' ? 'IoT V1' : 'MODULAR'}
          </span>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1 overflow-y-auto flex-1 pr-1">
          {activeNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all group ${
                  isActive 
                    ? 'bg-amber-600 text-white font-bold shadow-md shadow-amber-600/30' 
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60 font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs block leading-tight truncate">{item.label}</span>
                  <span className={`text-[9px] block mt-0.5 truncate ${isActive ? 'text-amber-100' : 'text-neutral-500'}`}>
                    {item.desc}
                  </span>
                </div>
              </button>
            );
          })}

          {/* Shared SaaS Subscription Link */}
          <div className="pt-2 border-t border-neutral-800 mt-2">
            <button
              onClick={() => setActiveTab('saas_billing')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all group ${
                activeTab === 'saas_billing'
                  ? 'bg-amber-600 text-white font-bold shadow-md shadow-amber-600/30'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60 font-medium'
              }`}
            >
              <ShieldCheck className={`w-4 h-4 shrink-0 ${activeTab === 'saas_billing' ? 'text-white' : 'text-neutral-400'}`} />
              <div className="flex-1 min-w-0">
                <span className="text-xs block leading-tight truncate">Langganan SaaS</span>
                <span className={`text-[9px] block mt-0.5 truncate ${activeTab === 'saas_billing' ? 'text-amber-100' : 'text-neutral-500'}`}>
                  Paket POS, Hotel & Combo
                </span>
              </div>
            </button>
          </div>
        </nav>
      </div>

      {/* User info & Logout */}
      <div className="border-t border-neutral-800 pt-3 px-1 space-y-2 shrink-0">
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
