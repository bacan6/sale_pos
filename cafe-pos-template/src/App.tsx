import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import type { ActiveTab } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { CashierView } from './views/CashierView';
import { CustomerMenuView } from './views/CustomerMenuView';
import { WaitstaffView } from './views/WaitstaffView';
import { KitchenTicketView } from './views/KitchenTicketView';
import { ProductManagementView } from './views/ProductManagementView';
import { TableManagementView } from './views/TableManagementView';
import { Monitor, Tablet, Smartphone, Coffee } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('cashier');
  const [devicePreview, setDevicePreview] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-900 font-sans">
      {/* Desktop / Tablet Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-200">
        
        {/* Top Header with Screen Info & Device Preview Simulator */}
        <header className="h-14 bg-white border-b border-neutral-200 px-4 flex items-center justify-between shrink-0 shadow-xs z-10">
          <div className="flex items-center gap-2">
            <span className="md:hidden font-black text-xs text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <Coffee className="w-4 h-4" /> Kopi Senja
            </span>
            <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-neutral-500">
              <span className="text-neutral-900 font-extrabold capitalize">
                {activeTab === 'cashier' && 'Interface Kasir'}
                {activeTab === 'customer' && 'Menu Pemesanan Pelanggan (Self-Order Kiosk)'}
                {activeTab === 'waitstaff' && 'Menu Komputer & Handheld Pramuniaga'}
                {activeTab === 'kitchen' && 'Struk & Kitchen Display System'}
                {activeTab === 'products' && 'Pengelolaan Produk & Harga'}
                {activeTab === 'tables' && 'Master Data & Denah Meja'}
              </span>
            </div>
          </div>

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
        </header>

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
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </div>
  );
}
