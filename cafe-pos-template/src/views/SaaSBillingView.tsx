import React, { useState, useEffect } from 'react';
import { 
  CreditCard, ShieldCheck, AlertTriangle, CheckCircle, 
  Clock, XCircle, RefreshCw, Banknote, Calendar, Zap, AlertOctagon
} from 'lucide-react';
import { billingApi, getStoredTenant, setStoredTenant } from '../services/api';
import type { TenantInfo, SubscriptionInvoice } from '../types/auth';

interface SaaSBillingViewProps {
  tenant: TenantInfo | null;
  onTenantUpdate: (updated: TenantInfo) => void;
}

export const SaaSBillingView: React.FC<SaaSBillingViewProps> = ({ tenant, onTenantUpdate }) => {
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const currentStatus = tenant?.status || 'active';

  const loadInvoices = async () => {
    try {
      const res = await billingApi.getInvoices();
      if (res && res.data) {
        setInvoices(res.data);
      }
    } catch {}
  };

  useEffect(() => {
    loadInvoices();
  }, [tenant?.id]);

  const handleSimulateActivation = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      const res = await billingApi.simulateActivation(250000, 'simulation_qris');
      const updatedTenant: TenantInfo = {
        ...(tenant || getStoredTenant()!),
        status: 'active',
        subscription_expires_at: res.data?.subscription_expires_at,
      };
      setStoredTenant(updatedTenant);
      onTenantUpdate(updatedTenant);
      setActionMessage('✅ Pembayaran aktivasi Rp 250.000 berhasil disimulasikan! Status akun sekarang: AKTIF.');
      await loadInvoices();
    } catch (err: any) {
      setActionMessage('❌ ' + (err.message || 'Gagal simulasi aktivasi'));
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateRecurring = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      const res = await billingApi.simulateRecurring(150000, 30);
      const updatedTenant: TenantInfo = {
        ...(tenant || getStoredTenant()!),
        status: 'active',
        subscription_expires_at: res.data?.subscription_expires_at,
      };
      setStoredTenant(updatedTenant);
      onTenantUpdate(updatedTenant);
      setActionMessage('✅ Pembayaran langganan berkala (recurring) Rp 150.000 (+30 hari) berhasil disimulasikan! Status akun AKTIF.');
      await loadInvoices();
    } catch (err: any) {
      setActionMessage('❌ ' + (err.message || 'Gagal simulasi perpanjangan langganan'));
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePlan = async (planKey: string) => {
    setLoading(true);
    setActionMessage(null);
    try {
      const res = await billingApi.simulatePlanChange(planKey);
      const updatedTenant: TenantInfo = {
        ...(tenant || getStoredTenant()!),
        plan: res.data?.plan || planKey,
        modules: res.data?.modules || 'combo',
        max_devices: res.data?.max_devices || 3,
      };
      setStoredTenant(updatedTenant);
      onTenantUpdate(updatedTenant);
      setActionMessage(`🎉 Berhasil beralih ke paket: ${res.message || planKey.toUpperCase()}`);
    } catch (err: any) {
      setActionMessage('❌ ' + (err.message || 'Gagal ubah paket'));
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateStatus = async (newStatus: 'waiting_activation' | 'active' | 'on_hold' | 'terminated') => {
    setLoading(true);
    setActionMessage(null);
    try {
      await billingApi.simulateStatus(newStatus);
      const updatedTenant: TenantInfo = {
        ...(tenant || getStoredTenant()!),
        status: newStatus,
      };
      setStoredTenant(updatedTenant);
      onTenantUpdate(updatedTenant);
      setActionMessage(`⚠️ Status akun berhasil disimulasikan menjadi: ${newStatus.toUpperCase()}`);
    } catch (err: any) {
      setActionMessage('❌ ' + (err.message || 'Gagal ubah status akun'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-neutral-100 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
      <div className="max-w-5xl w-full mx-auto space-y-5">
        
        {/* Banner Title */}
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-neutral-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
                <CreditCard className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">
                Langganan SaaS & Simulasi Lifecycle Akun
              </h2>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Kelola status akun cafe, paket langganan, dan simulasikan status pembayaran aktivasi / recurring.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-500">Status Saat Ini:</span>
            {currentStatus === 'active' && (
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> ACTIVE (Beroperasi Normal)
              </span>
            )}
            {currentStatus === 'waiting_activation' && (
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> WAITING ACTIVATION
              </span>
            )}
            {currentStatus === 'on_hold' && (
              <span className="px-3 py-1 rounded-full text-xs font-black bg-orange-100 text-orange-800 border border-orange-200 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> ON-HOLD (Pembayaran Tertunda)
              </span>
            )}
            {currentStatus === 'terminated' && (
              <span className="px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> TERMINATED (Layanan Diputus)
              </span>
            )}
          </div>
        </div>

        {/* Action alert message */}
        {actionMessage && (
          <div className="p-3.5 rounded-2xl bg-neutral-900 text-white text-xs font-bold flex items-center justify-between shadow-md animate-in fade-in">
            <span>{actionMessage}</span>
            <button onClick={() => setActionMessage(null)} className="text-neutral-400 hover:text-white text-[11px]">✕</button>
          </div>
        )}

        {/* Current Tenant Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-neutral-200/70 shadow-xs">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Cafe Tenant</span>
            <h4 className="text-base font-black text-neutral-900 mt-1">{tenant?.name || 'Kopi Senja'}</h4>
            <span className="text-xs text-neutral-500 font-mono">slug: {tenant?.slug || 'kopi-senja'}</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-neutral-200/70 shadow-xs">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Paket Langganan</span>
            <h4 className="text-base font-black text-amber-700 uppercase mt-1">{tenant?.plan || 'Starter'} Plan</h4>
            <span className="text-xs text-neutral-500">Kuota Perangkat: {tenant?.max_devices || 3} Mesin POS</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-neutral-200/70 shadow-xs">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Masa Aktif</span>
            <h4 className="text-xs font-black text-neutral-800 mt-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>{tenant?.subscription_expires_at ? new Date(tenant.subscription_expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Aktif (30 Hari)'}</span>
            </h4>
            <span className="text-[10px] text-emerald-600 font-semibold">Perpanjangan otomatis aktif</span>
          </div>
        </div>

        {/* MODULAR BUSINESS PACKAGES */}
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-neutral-200/70 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-black text-neutral-900">Pilihan Paket Modular (POS vs Hotel vs Combo)</h3>
            </div>
            <span className="text-[11px] font-bold text-neutral-400">1 Tenant • Multi-Bisnis</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* POS Solo */}
            <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
              tenant?.plan === 'pos_starter' ? 'border-amber-600 bg-amber-50/30 ring-2 ring-amber-600/20' : 'border-neutral-200 bg-neutral-50/50'
            }`}>
              <div>
                <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-block mb-1">
                  Khusus F&B / Cafe
                </span>
                <h4 className="text-base font-black text-neutral-900">Cafe POS Solo</h4>
                <p className="text-xs text-neutral-500 mt-0.5">Modul Kasir POS, Waitstaff, Kiosk, Kitchen Ticket & Meja</p>
                <div className="my-3 text-lg font-black text-amber-800">
                  Rp 150.000 <span className="text-xs text-neutral-400 font-normal">/ bln</span>
                </div>
                <ul className="text-xs space-y-1 text-neutral-600 mb-4 font-medium">
                  <li>✓ Point of Sale Kasir</li>
                  <li>✓ Kitchen Display System</li>
                  <li>✓ 3 Perangkat Kasir/Tablet</li>
                  <li className="text-neutral-400">✗ Modul Hotel PMS (Nonaktif)</li>
                </ul>
              </div>
              <button
                disabled={loading || tenant?.plan === 'pos_starter'}
                onClick={() => handleSimulatePlan('pos_starter')}
                className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-500 text-white transition-all shadow-xs"
              >
                {tenant?.plan === 'pos_starter' ? '✓ Paket Aktif' : 'Pilih Paket POS'}
              </button>
            </div>

            {/* Hotel Solo */}
            <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
              tenant?.plan === 'hotel_starter' ? 'border-blue-600 bg-blue-50/30 ring-2 ring-blue-600/20' : 'border-neutral-200 bg-neutral-50/50'
            }`}>
              <div>
                <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full inline-block mb-1">
                  Khusus Penginapan
                </span>
                <h4 className="text-base font-black text-neutral-900">Hotel PMS Solo</h4>
                <p className="text-xs text-neutral-500 mt-0.5">Room Rack, Front Desk, Guest Folio, Housekeeping & Night Audit</p>
                <div className="my-3 text-lg font-black text-blue-800">
                  Rp 350.000 <span className="text-xs text-neutral-400 font-normal">/ bln</span>
                </div>
                <ul className="text-xs space-y-1 text-neutral-600 mb-4 font-medium">
                  <li>✓ Visual Room Rack & Status</li>
                  <li>✓ Front Desk Check-in/out</li>
                  <li>✓ Housekeeping & Night Audit</li>
                  <li className="text-neutral-400">✗ Modul Kasir Cafe POS (Nonaktif)</li>
                </ul>
              </div>
              <button
                disabled={loading || tenant?.plan === 'hotel_starter'}
                onClick={() => handleSimulatePlan('hotel_starter')}
                className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-500 text-white transition-all shadow-xs"
              >
                {tenant?.plan === 'hotel_starter' ? '✓ Paket Aktif' : 'Pilih Paket Hotel'}
              </button>
            </div>

            {/* All-in-One Combo */}
            <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
              tenant?.plan === 'combo_pro' ? 'border-amber-600 bg-amber-500/10 ring-2 ring-amber-600/30' : 'border-neutral-200 bg-neutral-50/50'
            }`}>
              <div>
                <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full inline-block mb-1">
                  ⭐ Paling Lengkap (All-in-One)
                </span>
                <h4 className="text-base font-black text-neutral-900">Combo Pro (Hotel + POS)</h4>
                <p className="text-xs text-neutral-500 mt-0.5">Semua fitur Hotel PMS + Cafe POS + Integrasi Charge to Room</p>
                <div className="my-3 text-lg font-black text-amber-700">
                  Rp 500.000 <span className="text-xs text-neutral-400 font-normal">/ bln</span>
                </div>
                <ul className="text-xs space-y-1 text-neutral-700 mb-4 font-medium">
                  <li className="text-emerald-700 font-bold">✓ Modul Cafe POS Lengkap</li>
                  <li className="text-blue-700 font-bold">✓ Modul Hotel PMS Lengkap</li>
                  <li className="text-amber-800 font-black">✓ Integrasi Tagih ke Kamar (Room Folio)</li>
                  <li>✓ 15 Perangkat POS & Tablet Front Desk</li>
                </ul>
              </div>
              <button
                disabled={loading || tenant?.plan === 'combo_pro'}
                onClick={() => handleSimulatePlan('combo_pro')}
                className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 disabled:bg-neutral-200 disabled:text-neutral-500 text-white transition-all shadow-sm"
              >
                {tenant?.plan === 'combo_pro' ? '✓ Paket Aktif (Lengkap)' : 'Aktifkan Combo Pro'}
              </button>
            </div>
          </div>
        </div>

        {/* SIMULATION CONTROLS */}
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-neutral-200/70 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
            <Zap className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-black text-neutral-900">Panel Kontrol Simulasi Pembayaran & Status SaaS</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            
            {/* Box 1: Payments */}
            <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/60 space-y-3">
              <div>
                <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-amber-700" />
                  Simulasi Pembayaran (Payment Trigger)
                </h4>
                <p className="text-[11px] text-neutral-600 mt-0.5">
                  Simulasikan transaksi sukses dari payment gateway untuk aktivasi atau perpanjangan tagihan bulanan.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  disabled={loading}
                  onClick={handleSimulateActivation}
                  className="flex-1 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Bayar Aktivasi (Rp 250k)</span>
                </button>

                <button
                  disabled={loading}
                  onClick={handleSimulateRecurring}
                  className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bayar Recurring (+30 Hari)</span>
                </button>
              </div>
            </div>

            {/* Box 2: State Transitions */}
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/70 space-y-3">
              <div>
                <h4 className="text-xs font-black text-neutral-900 flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4 text-neutral-700" />
                  Simulasi Status Lifecycle Akun
                </h4>
                <p className="text-[11px] text-neutral-600 mt-0.5">
                  Pindah status akun secara instan untuk menguji pencegahan transaksi kasir pada status non-aktif.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  disabled={loading}
                  onClick={() => handleSimulateStatus('waiting_activation')}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Set Waiting Act</span>
                </button>

                <button
                  disabled={loading}
                  onClick={() => handleSimulateStatus('on_hold')}
                  className="bg-orange-100 hover:bg-orange-200 text-orange-900 font-bold text-xs py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-700" />
                  <span>Set On-Hold</span>
                </button>

                <button
                  disabled={loading}
                  onClick={() => handleSimulateStatus('terminated')}
                  className="bg-red-100 hover:bg-red-200 text-red-900 font-bold text-xs py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5 text-red-700" />
                  <span>Set Terminated</span>
                </button>

                <button
                  disabled={loading}
                  onClick={() => handleSimulateStatus('active')}
                  className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Set Active Normal</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* INVOICES HISTORY */}
        <div className="bg-white rounded-3xl shadow-xs border border-neutral-200/70 overflow-hidden">
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
            <h4 className="text-xs font-black text-neutral-900 uppercase tracking-wider">
              Riwayat Faktur Tagihan (Subscription Invoices)
            </h4>
            <button 
              onClick={loadInvoices}
              className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  <th className="py-2.5 px-4">No. Invoice</th>
                  <th className="py-2.5 px-4">Tipe Tagihan</th>
                  <th className="py-2.5 px-4">Nominal</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Waktu Bayar</th>
                  <th className="py-2.5 px-4">Periode Layanan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-400 text-xs">
                      Belum ada riwayat tagihan. Klik simulasi pembayaran di atas untuk membuat faktur.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-neutral-50/50">
                      <td className="py-2.5 px-4 font-mono font-bold text-neutral-900">{inv.invoice_number}</td>
                      <td className="py-2.5 px-4">
                        <span className="capitalize font-semibold text-neutral-700">{inv.type}</span>
                      </td>
                      <td className="py-2.5 px-4 font-black text-neutral-900">
                        Rp {Number(inv.amount).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-neutral-500 font-mono text-[11px]">
                        {inv.paid_at || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-neutral-500 text-[11px]">
                        {inv.period_start ? new Date(inv.period_start).toLocaleDateString('id-ID') : ''} s/d {inv.period_end ? new Date(inv.period_end).toLocaleDateString('id-ID') : ''}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
