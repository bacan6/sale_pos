import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import type { ActiveTab } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { CashierView } from './views/CashierView';
import { CustomerMenuView } from './views/CustomerMenuView';
import { WaitstaffView } from './views/WaitstaffView';
import { KitchenTicketView } from './views/KitchenTicketView';
import { ProductManagementView } from './views/ProductManagementView';
import { TableManagementView } from './views/TableManagementView';
import { InventoryRecipeView } from './views/InventoryRecipeView';
import { ShiftManagementView } from './views/ShiftManagementView';
import { SaaSBillingView } from './views/SaaSBillingView';
import { AuthModal } from './views/AuthModal';
import { RoomRackView } from './views/hotel/RoomRackView';
import { HotelTimelineCalendarView } from './views/hotel/HotelTimelineCalendarView';
import { FrontDeskBookingView } from './views/hotel/FrontDeskBookingView';
import { GuestFolioView } from './views/hotel/GuestFolioView';
import { HotelServicesView } from './views/hotel/HotelServicesView';
import { GuestCrmView } from './views/hotel/GuestCrmView';
import { HousekeepingView } from './views/hotel/HousekeepingView';
import { LostFoundView } from './views/hotel/LostFoundView';
import { ShiftHandoverView } from './views/hotel/ShiftHandoverView';
import { NightAuditView } from './views/hotel/NightAuditView';
import { RoomTypeManagementView } from './views/hotel/RoomTypeManagementView';
import type { HotelRoom } from './types/hotel';
import { Monitor, Tablet, Smartphone, Coffee, AlertTriangle, ShieldAlert } from 'lucide-react';
import { authApi, getStoredToken, getStoredTenant, getStoredUser } from './services/api';
import type { TenantInfo, UserInfo } from './types/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('cashier');
  const [devicePreview, setDevicePreview] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  
  // Auth state
  const [user, setUser] = useState<UserInfo | null>(getStoredUser());
  const [tenant, setTenant] = useState<TenantInfo | null>(getStoredTenant());
  const [showAuthModal, setShowAuthModal] = useState<boolean>(!getStoredToken());

  // Hotel navigation state
  const [preSelectedRoom, setPreSelectedRoom] = useState<HotelRoom | null>(null);
  const [folioBookingId, setFolioBookingId] = useState<number | null>(null);

  useEffect(() => {
    // If token exists, sync me profile in background
    if (getStoredToken()) {
      authApi.me().then(res => {
        if (res.user) setUser(res.user);
        if (res.tenant) setTenant(res.tenant);
      }).catch(() => {
        // Token invalid
      });
    }
  }, []);

  const handleAuthSuccess = (loggedUser: UserInfo, loggedTenant: TenantInfo) => {
    setUser(loggedUser);
    setTenant(loggedTenant);
    setShowAuthModal(false);

    // If tenant is hotel-only, default to room rack
    const modules = (loggedTenant.modules || 'combo').toLowerCase();
    if (modules === 'hotel') {
      setActiveTab('hotel_rack');
    } else {
      setActiveTab('cashier');
    }
  };

  const handleLogout = () => {
    authApi.logout();
    setUser(null);
    setTenant(null);
    setShowAuthModal(true);
  };

  // SaaS Subscription Status Guard
  const tenantStatus = (tenant?.status || 'active') as string;
  const isSuspended = tenantStatus === 'suspended' || tenantStatus === 'terminated';
  const isGracePeriod = tenantStatus === 'grace_period';
  const isWaitingActivation = tenantStatus === 'waiting_activation';
  const isOnHold = tenantStatus === 'on_hold';
  const isNonActive = isSuspended || isGracePeriod || isWaitingActivation || isOnHold;

  // Responsive device container styling helper
  const getDeviceContainerClass = () => {
    switch (devicePreview) {
      case 'tablet':
        return 'max-w-[768px] my-auto h-[95vh] rounded-3xl shadow-2xl border-8 border-neutral-800 overflow-hidden bg-white';
      case 'mobile':
        return 'max-w-[390px] my-auto h-[90vh] rounded-3xl shadow-2xl border-8 border-neutral-800 overflow-hidden bg-white';
      default:
        return 'w-full h-full';
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-900 font-sans select-none antialiased">
      {/* Desktop Left Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        tenant={tenant}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-200">
        
        {/* Top Header with Screen Info & Device Preview Simulator */}
        <header className="h-14 bg-white border-b border-neutral-200 px-4 flex items-center justify-between shrink-0 shadow-xs z-10">
          <div className="flex items-center gap-2">
            <span className="md:hidden font-black text-xs text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <Coffee className="w-4 h-4" /> {tenant?.name || 'Kopi Senja'}
            </span>
            <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-neutral-500">
              <span className="text-neutral-900 font-extrabold capitalize">
                {activeTab === 'cashier' && 'Interface Kasir'}
                {activeTab === 'customer' && 'Menu Pemesanan Pelanggan (Self-Order Kiosk)'}
                {activeTab === 'waitstaff' && 'Menu Komputer & Handheld Pramuniaga'}
                {activeTab === 'kitchen' && 'Struk & Kitchen Display System'}
                {activeTab === 'products' && 'Pengelolaan Produk & Harga'}
                {activeTab === 'tables' && 'Master Data & Denah Meja'}
                {activeTab === 'hotel_rack' && 'Denah & Status Okupansi Kamar (Room Rack)'}
                {activeTab === 'hotel_timeline' && 'Timeline Kalender & Gantt Okupansi Kamar'}
                {activeTab === 'hotel_front_desk' && 'Front Desk & Manajemen Reservasi Tamu'}
                {activeTab === 'hotel_folio' && 'Folio Tagihan Tamu & Kasir Hotel'}
                {activeTab === 'hotel_services' && 'Katalog Layanan & Add-on Ekstra Hotel'}
                {activeTab === 'hotel_guests' && 'Guest CRM, VIP Tier & Proteksi Blacklist'}
                {activeTab === 'hotel_housekeeping' && 'Housekeeping & Penugasan Kebersihan'}
                {activeTab === 'hotel_lost_found' && 'Lost & Found (Barang Tamu Tertinggal)'}
                {activeTab === 'hotel_shifts' && 'Serah Terima & Shift Kasir Front Desk'}
                {activeTab === 'hotel_night_audit' && 'Night Audit & Rekapitulasi Finansial Harian'}
                {activeTab === 'hotel_rooms' && 'Master Data Tipe & Nomor Unit Kamar'}
                {activeTab === 'saas_billing' && 'Pusat Langganan SaaS & Simulasi Lifecycle'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* SaaS Status Warning Indicator */}
            {isNonActive && (
              <button
                onClick={() => setActiveTab('saas_billing')}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-100 text-red-800 border border-red-300 animate-pulse"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span>Status: {tenantStatus.toUpperCase()} (Klik untuk Aktivasi)</span>
              </button>
            )}

            {/* Device Simulator Toggle Pills */}
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl border border-neutral-200">
              <button
                onClick={() => setDevicePreview('desktop')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  devicePreview === 'desktop' ? 'bg-white shadow-xs text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
                }`}
                title="Tampilan Layar Desktop POS"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Desktop</span>
              </button>

              <button
                onClick={() => setDevicePreview('tablet')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  devicePreview === 'tablet' ? 'bg-white shadow-xs text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
                }`}
                title="Simulasi Tablet (iPad)"
              >
                <Tablet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Tablet</span>
              </button>

              <button
                onClick={() => setDevicePreview('mobile')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  devicePreview === 'mobile' ? 'bg-white shadow-xs text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
                }`}
                title="Simulasi Mobile Smartphone (iOS / Android)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Mobile</span>
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Workspace Container */}
        <main className={`flex-1 overflow-hidden flex justify-center items-center ${devicePreview !== 'desktop' ? 'p-4 bg-neutral-800/40' : ''}`}>
          <div className={`${getDeviceContainerClass()} flex flex-col transition-all duration-200 relative`}>
            
            {/* SaaS Block Warning Screen if Suspended & not on saas_billing tab */}
            {isSuspended && activeTab !== 'saas_billing' ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-neutral-900 text-white text-center">
                <ShieldAlert className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
                <h2 className="text-xl font-black mb-2">Layanan SaaS Ditangguhkan</h2>
                <p className="text-xs text-neutral-400 max-w-sm mb-6 leading-relaxed">
                  Langganan bisnis Anda saat ini berstatus <strong>SUSPENDED</strong> karena keterlambatan perpanjangan invoice. Semua fitur POS dan reservasi hotel dikunci sementara.
                </p>
                <button
                  onClick={() => setActiveTab('saas_billing')}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
                >
                  Buka Pengaturan SaaS & Bayar Tagihan
                </button>
              </div>
            ) : !user ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white text-neutral-500 text-center text-xs">
                <Coffee className="w-8 h-8 mb-2 opacity-50 text-amber-600" />
                <p className="font-bold text-neutral-600 text-sm">Autentikasi Diperlukan</p>
                <p>Silakan login atau registrasi akun melalui jendela autentikasi.</p>
              </div>
            ) : (
              <>
                {activeTab === 'cashier' && <CashierView />}
                {activeTab === 'customer' && <CustomerMenuView devicePreview={devicePreview} />}
                {activeTab === 'waitstaff' && <WaitstaffView />}
                {activeTab === 'kitchen' && <KitchenTicketView />}
                {activeTab === 'pos_inventory' && <InventoryRecipeView />}
                {activeTab === 'pos_shifts' && <ShiftManagementView />}
                {activeTab === 'products' && <ProductManagementView />}
                {activeTab === 'tables' && <TableManagementView />}
                {activeTab === 'hotel_rack' && (
                  <RoomRackView 
                    onOpenBookingModal={(room) => {
                      setPreSelectedRoom(room || null);
                      setActiveTab('hotel_front_desk');
                    }}
                    onOpenFolio={(bId) => {
                      setFolioBookingId(bId);
                      setActiveTab('hotel_folio');
                    }}
                  />
                )}
                {activeTab === 'hotel_timeline' && (
                  <HotelTimelineCalendarView 
                    onOpenBookingModal={(room) => {
                      setPreSelectedRoom(room || null);
                      setActiveTab('hotel_front_desk');
                    }}
                    onOpenFolio={(bId) => {
                      setFolioBookingId(bId);
                      setActiveTab('hotel_folio');
                    }}
                  />
                )}
                {activeTab === 'hotel_front_desk' && (
                  <FrontDeskBookingView 
                    preSelectedRoom={preSelectedRoom}
                    onOpenFolio={(bId) => {
                      setFolioBookingId(bId);
                      setActiveTab('hotel_folio');
                    }}
                  />
                )}
                {activeTab === 'hotel_folio' && (
                  <GuestFolioView 
                    bookingId={folioBookingId} 
                    onBack={() => setActiveTab('hotel_front_desk')}
                  />
                )}
                {activeTab === 'hotel_services' && <HotelServicesView />}
                {activeTab === 'hotel_guests' && <GuestCrmView />}
                {activeTab === 'hotel_housekeeping' && <HousekeepingView />}
                {activeTab === 'hotel_lost_found' && <LostFoundView />}
                {activeTab === 'hotel_shifts' && <ShiftHandoverView />}
                {activeTab === 'hotel_night_audit' && <NightAuditView />}
                {activeTab === 'hotel_rooms' && <RoomTypeManagementView />}
                {activeTab === 'saas_billing' && (
                  <SaaSBillingView 
                    tenant={tenant} 
                    onTenantUpdate={(updated) => setTenant(updated)} 
                  />
                )}
              </>
            )}
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Global Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onSuccess={handleAuthSuccess} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
}
