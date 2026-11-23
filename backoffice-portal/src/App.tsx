import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import type { ActiveTab } from './components/Sidebar';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { DashboardView } from './views/DashboardView';
import { CoaManagementView } from './views/CoaManagementView';
import { JournalEntryView } from './views/JournalEntryView';
import { GeneralLedgerView } from './views/GeneralLedgerView';
import { TrialBalanceView } from './views/TrialBalanceView';
import { FinancialReportsView } from './views/FinancialReportsView';
import { AutoPostingSettingsView } from './views/AutoPostingSettingsView';
import { PeriodClosingView } from './views/PeriodClosingView';
import { authApi, getStoredToken, getStoredTenant, getStoredUser } from './services/api';
import type { TenantInfo, UserInfo } from './types/auth';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [user, setUser] = useState<UserInfo | null>(getStoredUser());
  const [tenant, setTenant] = useState<TenantInfo | null>(getStoredTenant());
  const [showAuthModal, setShowAuthModal] = useState<boolean>(!getStoredToken());

  useEffect(() => {
    if (getStoredToken()) {
      authApi.me().then((res: any) => {
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
  };

  const handleLogout = () => {
    authApi.logout();
    setUser(null);
    setTenant(null);
    setShowAuthModal(true);
  };

  const tenantStatus = (tenant?.status || 'active') as string;
  const isSuspended = tenantStatus === 'suspended' || tenantStatus === 'terminated';

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'Ringkasan Finansial', subtitle: 'Indikator Utama & Neraca Keuangan Back-Office' };
      case 'coa':
        return { title: 'Bagan Akun (Chart of Accounts)', subtitle: 'Struktur Akun Standar Perhotelan & Resto Indonesia' };
      case 'journals':
        return { title: 'Jurnal Umum (General Journal)', subtitle: 'Pencatatan Transaksi Double-Entry & Audit Trail' };
      case 'ledger':
        return { title: 'Buku Besar (General Ledger)', subtitle: 'Rincian Mutasi dan Saldo Berjalan Per Akun' };
      case 'trial_balance':
        return { title: 'Neraca Saldo (Trial Balance)', subtitle: 'Verifikasi Keseimbangan Debit vs Kredit' };
      case 'reports':
        return { title: 'Laporan Keuangan', subtitle: 'Laba Rugi, Neraca, dan Arus Kas Periode Berjalan' };
      case 'settings':
        return { title: 'Pemetaan Akun Otomatis', subtitle: 'Konfigurasi Jurnal Otomatis Shift POS & Hotel Night Audit' };
      case 'periods':
        return { title: 'Tutup Buku & Periode Akuntansi', subtitle: 'Manajemen Status Periode & Penguncian Jurnal' };
      default:
        return { title: 'Back-Office Portal', subtitle: 'Sistem Akuntansi Terintegrasi' };
    }
  };

  const { title, subtitle } = getTabTitle();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-950 font-sans antialiased text-neutral-100">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tenant={tenant}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-950">
        <Header
          title={title}
          subtitle={subtitle}
          tenant={tenant}
        />

        <main className="flex-1 overflow-hidden flex flex-col bg-neutral-950">
          {isSuspended ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-white">
              <ShieldAlert className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
              <h2 className="text-xl font-black mb-2">Layanan Ditangguhkan</h2>
              <p className="text-xs text-neutral-400 max-w-sm mb-6 leading-relaxed">
                Status tenant saat ini berstatus <strong>{tenantStatus.toUpperCase()}</strong>. Hubungi administrator platform untuk aktivasi tagihan.
              </p>
            </div>
          ) : !user ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-neutral-500 text-center text-xs">
              <p className="font-bold text-neutral-400 text-sm mb-1">Autentikasi Diperlukan</p>
              <p>Silakan masuk melalui jendela login untuk mengakses data pembukuan.</p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && <DashboardView onNavigateTab={setActiveTab} />}
              {activeTab === 'coa' && <CoaManagementView />}
              {activeTab === 'journals' && <JournalEntryView />}
              {activeTab === 'ledger' && <GeneralLedgerView />}
              {activeTab === 'trial_balance' && <TrialBalanceView />}
              {activeTab === 'reports' && <FinancialReportsView />}
              {activeTab === 'settings' && <AutoPostingSettingsView />}
              {activeTab === 'periods' && <PeriodClosingView />}
            </>
          )}
        </main>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
