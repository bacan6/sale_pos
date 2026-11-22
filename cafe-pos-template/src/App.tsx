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
import { SaaSBillingView } from './views/SaaSBillingView';
import { AuthModal } from './views/AuthModal';
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

  useEffect(() => {
    // If token exists, sync me profile in background
    if (getStoredToken()) {
      authApi.me().then(res => {
        if (res.user) setUser(res.user);
        if (res.tenant) setTenant(res.tenant);
      }).catch(() => {
        // token expired or invalid
        setShowAuthModal(true);
      });
    } else {
      setShowAuthModal(true);
    }
  }, []);

  const handleLoginSuccess = (loggedInUser: UserInfo, loggedInTenant: TenantInfo) => {
    setUser(loggedInUser);
    setTenant(loggedInTenant);
    setShowAuthModal(false);
  };

  const handleLogout = async () => {
    await authApi.logout();
    setUser(null);
    setTenant(null);
    setShowAuthModal(true);
  };

  const tenantStatus = tenant?.status || 'active';
  const isNonActive = tenantStatus !== 'active';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-900 font-sans">
      
      {/* Auth Modal for Login & Signup */}
      <AuthModal
        isOpen={showAuthModal}
        onSuccess={handleLoginSuccess}
        canClose={false}
      />

      {/* Desktop / Tablet Sidebar with Tenant & User info + Logout */}
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

        {/* Global Alert Bar if Tenant is Non-Active */}
        {isNonActive && (
          <div className="bg-red-600 text-white px-4 py-2 text-xs flex items-center justify-between shadow-sm z-10 shrink-0">
            <div className="flex items-center gap-2 font-bold">
              <ShieldAlert className="w-4 h-4 text-red-200 shrink-0" />
              <span>
                {tenantStatus === 'waiting_activation' && 'Akun cafe Anda sedang menunggu pembayaran aktivasi awal.'}
                {tenantStatus === 'on_hold' && 'Akun cafe Anda dalam status On-Hold karena pembayaran langganan tertunda.'}
                {tenantStatus === 'terminated' && 'Layanan akun cafe Anda telah diterminasi permanen.'}
              </span>
            </div>
            <button
              onClick={() => setActiveTab('saas_billing')}
              className="bg-white text-red-700 hover:bg-neutral-100 font-extrabold px-3 py-0.5 rounded-lg text-[11px] shadow-xs"
            >
              Simulasi Bayar Sekarang &rarr;
            </button>
          </div>
        )}

        {/* Viewport Frame with Simulated Device Dimensions */}
        <main className="flex-1 overflow-hidden flex items-center justify-center p-0 md:p-3 bg-neutral-200/80 pb-14 md:pb-3">
          <div className={`
            h-full overflow-hidden transition-all duration-300 bg-neutral-100 relative
            ${devicePreview === 'desktop' ? 'w-full shadow-none md:rounded-2xl border border-neutral-300' : ''}
            ${devicePreview === 'tablet' ? 'w-[820px] max-w-full shadow-2xl rounded-3xl border-8 border-neutral-800 my-auto' : ''}
            ${devicePreview === 'mobile' ? 'w-[420px] max-w-full shadow-2xl rounded-3xl border-8 border-neutral-800 my-auto' : ''}
          `}>
            {activeTab === 'cashier' && <CashierView />}
            {activeTab === 'customer' && <CustomerMenuView devicePreview={devicePreview} />}
            {activeTab === 'waitstaff' && <WaitstaffView />}
            {activeTab === 'kitchen' && <KitchenTicketView />}
            {activeTab === 'products' && <ProductManagementView />}
            {activeTab === 'tables' && <TableManagementView />}
            {activeTab === 'saas_billing' && (
              <SaaSBillingView 
                tenant={tenant} 
                onTenantUpdate={(updated) => setTenant(updated)} 
              />
            )}
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </div>
  );
}
