import React, { useEffect, useState } from 'react';
import {
  Settings,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  Coffee,
  Building2,
  DollarSign,
  Shirt,
} from 'lucide-react';
import { accountingApi } from '../services/api';
import type { AccountingAccount, AccountingSettings } from '../types/accounting';

export const AutoPostingSettingsView: React.FC = () => {
  const [settings, setSettings] = useState<AccountingSettings | null>(null);
  const [accounts, setAccounts] = useState<AccountingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form mappings
  const [cashAcc, setCashAcc] = useState<string>('');
  const [bankAcc, setBankAcc] = useState<string>('');
  const [posRevAcc, setPosRevAcc] = useState<string>('');
  const [hotelRoomRevAcc, setHotelRoomRevAcc] = useState<string>('');
  const [hotelServiceRevAcc, setHotelServiceRevAcc] = useState<string>('');
  const [guestLedgerAcc, setGuestLedgerAcc] = useState<string>('');
  const [serviceChargeAcc, setServiceChargeAcc] = useState<string>('');
  const [taxPayableAcc, setTaxPayableAcc] = useState<string>('');
  const [cashOverAcc, setCashOverAcc] = useState<string>('');
  const [cashShortAcc, setCashShortAcc] = useState<string>('');
  const [cogsAcc, setCogsAcc] = useState<string>('');
  const [laundryRevAcc, setLaundryRevAcc] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [st, accs] = await Promise.all([
        accountingApi.getSettings(),
        accountingApi.getAccounts(),
      ]);
      setSettings(st);
      setAccounts(accs);

      setCashAcc(st.cash_account_id ? String(st.cash_account_id) : '');
      setBankAcc(st.bank_account_id ? String(st.bank_account_id) : '');
      setPosRevAcc(st.pos_revenue_account_id ? String(st.pos_revenue_account_id) : '');
      setHotelRoomRevAcc(st.hotel_room_revenue_account_id ? String(st.hotel_room_revenue_account_id) : '');
      setHotelServiceRevAcc(st.hotel_service_revenue_account_id ? String(st.hotel_service_revenue_account_id) : '');
      setGuestLedgerAcc(st.guest_ledger_account_id ? String(st.guest_ledger_account_id) : '');
      setServiceChargeAcc(st.service_charge_account_id ? String(st.service_charge_account_id) : '');
      setTaxPayableAcc(st.tax_payable_account_id ? String(st.tax_payable_account_id) : '');
      setCashOverAcc(st.cash_over_account_id ? String(st.cash_over_account_id) : '');
      setCashShortAcc(st.cash_short_account_id ? String(st.cash_short_account_id) : '');
      setCogsAcc(st.cogs_account_id ? String(st.cogs_account_id) : '');
      setLaundryRevAcc(st.laundry_revenue_account_id ? String(st.laundry_revenue_account_id) : '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await accountingApi.updateSettings({
        cash_account_id: cashAcc ? Number(cashAcc) : null,
        bank_account_id: bankAcc ? Number(bankAcc) : null,
        pos_revenue_account_id: posRevAcc ? Number(posRevAcc) : null,
        hotel_room_revenue_account_id: hotelRoomRevAcc ? Number(hotelRoomRevAcc) : null,
        hotel_service_revenue_account_id: hotelServiceRevAcc ? Number(hotelServiceRevAcc) : null,
        guest_ledger_account_id: guestLedgerAcc ? Number(guestLedgerAcc) : null,
        service_charge_account_id: serviceChargeAcc ? Number(serviceChargeAcc) : null,
        tax_payable_account_id: taxPayableAcc ? Number(taxPayableAcc) : null,
        cash_over_account_id: cashOverAcc ? Number(cashOverAcc) : null,
        cash_short_account_id: cashShortAcc ? Number(cashShortAcc) : null,
        cogs_account_id: cogsAcc ? Number(cogsAcc) : null,
        laundry_revenue_account_id: laundryRevAcc ? Number(laundryRevAcc) : null,
      });
      setSuccessMsg('Pengaturan pemetaan akun berhasil disimpan');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-neutral-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h3 className="text-base font-bold text-white">Pemetaan Akun Otomatis (Auto-Posting Rules)</h3>
          <p className="text-xs text-neutral-400">
            Tentukan kode akun buku besar yang akan otomatis menerima posting jurnal saat kasir cafe menutup shift dan front desk hotel menjalankan night audit harian.
          </p>
        </div>

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* POS Cafe Settings */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-neutral-800 text-amber-500">
              <Coffee className="w-5 h-5" />
              <h4 className="text-sm font-bold text-white">Integrasi Penutupan Shift Cafe POS</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">
                  Akun Kas Fisik / Laci Kasir (Debit)
                </label>
                <select
                  value={cashAcc}
                  onChange={(e) => setCashAcc(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">-- Pilih Akun Kas --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.code}] {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">
                  Akun Bank / QRIS / EDC Card (Debit)
                </label>
                <select
                  value={bankAcc}
                  onChange={(e) => setBankAcc(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">-- Pilih Akun Bank/QRIS --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.code}] {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">
                  Akun Pendapatan Penjualan Cafe & Resto (Credit)
                </label>
                <select
                  value={posRevAcc}
                  onChange={(e) => setPosRevAcc(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">-- Pilih Akun Pendapatan POS --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.code}] {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">
                  Akun HPP / COGS Makanan & Minuman
                </label>
                <select
                  value={cogsAcc}
                  onChange={(e) => setCogsAcc(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">-- Pilih Akun HPP --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.code}] {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">
                  Akun Selisih Kas Kurang (Beban / Shortage)
                </label>
                <select
                  value={cashShortAcc}
                  onChange={(e) => setCashShortAcc(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">-- Pilih Akun Selisih Kurang --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.code}] {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">
                  Akun Selisih Kas Lebih (Pendapatan / Overage)
                </label>
                <select
                  value={cashOverAcc}
                  onChange={(e) => setCashOverAcc(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">-- Pilih Akun Selisih Lebih --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.code}] {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Hotel PMS Settings */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-neutral-800 text-indigo-400">
              <Building2 className="w-5 h-5" />
              <h4 className="text-sm font-bold text-white">Integrasi Night Audit & Folio Hotel PMS</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">
                  Akun Piutang Tamu / Guest Ledger (Debit)
                </label>
                <select
                  value={guestLedgerAcc}
                  onChange={(e) => setGuestLedgerAcc(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">-- Pilih Akun Guest Ledger --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.code}] {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">
                  Akun Pendapatan Kamar Hotel (Room Revenue - Credit)
                </label>
                <select
                  value={hotelRoomRevAcc}
                  onChange={(e) => setHotelRoomRevAcc(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">-- Pilih Akun Pendapatan Kamar --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.code}] {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">
                  Akun Pendapatan Layanan Hotel Tambahan (Credit)
                </label>
                <select
                  value={hotelServiceRevAcc}
                  onChange={(e) => setHotelServiceRevAcc(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">-- Pilih Akun Layanan Hotel --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.code}] {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">
                  Akun Hutang Pajak Restoran & Hotel (PB1 10% - Credit)
                </label>
                <select
                  value={taxPayableAcc}
                  onChange={(e) => setTaxPayableAcc(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">-- Pilih Akun Pajak PB1 --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.code}] {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">
                  Akun Hutang Service Charge Hotel (Credit)
                </label>
                <select
                  value={serviceChargeAcc}
                  onChange={(e) => setServiceChargeAcc(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">-- Pilih Akun Service Charge --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.code}] {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Laundry POS Settings */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-neutral-800 text-cyan-400">
              <Shirt className="w-5 h-5" />
              <h4 className="text-sm font-bold text-white">Integrasi Operasional Laundry POS</h4>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-1">
                Akun Pendapatan Jasa Laundry (Laundry Revenue - Credit)
              </label>
              <select
                value={laundryRevAcc}
                onChange={(e) => setLaundryRevAcc(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="">-- Pilih Akun Pendapatan Laundry --</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.code}] {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Simpan Pemetaan Akun</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
