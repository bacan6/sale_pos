import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Scale,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react';
import { accountingApi } from '../services/api';
import type { IncomeStatementResponse, BalanceSheetResponse, JournalEntry } from '../types/accounting';

interface DashboardViewProps {
  onNavigateTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateTab }) => {
  const [incomeData, setIncomeData] = useState<IncomeStatementResponse | null>(null);
  const [balanceData, setBalanceData] = useState<BalanceSheetResponse | null>(null);
  const [recentJournals, setRecentJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [inc, bal, jrn] = await Promise.all([
        accountingApi.getIncomeStatement(),
        accountingApi.getBalanceSheet(),
        accountingApi.getJournals({ limit: 6 }),
      ]);
      setIncomeData(inc);
      setBalanceData(bal);
      setRecentJournals(jrn);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-neutral-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  const netIncome = incomeData?.net_income || 0;
  const isProfit = netIncome >= 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pendapatan Periode Ini</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-white">
            {formatRupiah(incomeData?.total_revenue || 0)}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-2 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>F&B Cafe & Kamar Hotel</span>
          </div>
        </div>

        {/* Total Expenses & COGS */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Beban & HPP Operasional</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-white">
            {formatRupiah((incomeData?.total_cogs || 0) + (incomeData?.total_expenses || 0))}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-2 font-semibold">
            <span>HPP: {formatRupiah(incomeData?.total_cogs || 0)}</span>
          </div>
        </div>

        {/* Net Income */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Laba Bersih (Net Profit)</span>
            <div className={`w-8 h-8 rounded-xl ${isProfit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'} flex items-center justify-center`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl font-black ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatRupiah(netIncome)}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-2 font-semibold">
            {isProfit ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />}
            <span>Margin: {incomeData?.total_revenue ? Math.round((netIncome / incomeData.total_revenue) * 100) : 0}%</span>
          </div>
        </div>

        {/* Total Assets */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Aset & Kas</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-white">
            {formatRupiah(balanceData?.total_assets || 0)}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-cyan-400 mt-2 font-semibold">
            <Scale className="w-3.5 h-3.5" />
            <span>Neraca Seimbang: {balanceData?.is_balanced ? 'Ya (OK)' : 'Selisih'}</span>
          </div>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/20 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            Integrasi Otomatis Tutup Shift POS & Night Audit Hotel
          </h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
            Sistem akuntansi back-office secara otomatis mencatat jurnal transaksi ringkasan saat kasir cafe melakukan penutupan shift dan saat front-desk hotel menjalankan night audit harian.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigateTab('journals')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Catat Jurnal Manual</span>
          </button>
          <button
            onClick={() => onNavigateTab('reports')}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-bold transition-all border border-neutral-700 cursor-pointer"
          >
            Laporan Keuangan
          </button>
        </div>
      </div>

      {/* Recent Journal Vouchers */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Jurnal Transaksi Terbaru</h3>
            <p className="text-xs text-neutral-400">Jurnal umum yang telah diposting ke buku besar</p>
          </div>
          <button
            onClick={() => onNavigateTab('journals')}
            className="text-xs text-emerald-400 hover:underline font-bold"
          >
            Lihat Semua Jurnal &rarr;
          </button>
        </div>

        {recentJournals.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-xs">
            Belum ada jurnal yang tercatat. Lakukan transaksi POS, night audit, atau buat jurnal manual.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 font-bold uppercase text-[10px]">
                  <th className="pb-3 px-3">No. Jurnal</th>
                  <th className="pb-3 px-3">Tanggal</th>
                  <th className="pb-3 px-3">Sumber / Referensi</th>
                  <th className="pb-3 px-3">Keterangan</th>
                  <th className="pb-3 px-3 text-right">Total Debit/Kredit</th>
                  <th className="pb-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {recentJournals.map((j) => (
                  <tr key={j.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                      {j.entry_number}
                    </td>
                    <td className="py-3 px-3 text-neutral-300">{j.entry_date}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        j.reference_type === 'pos_shift_close' ? 'bg-amber-500/20 text-amber-300' :
                        j.reference_type === 'hotel_night_audit' ? 'bg-indigo-500/20 text-indigo-300' :
                        'bg-neutral-800 text-neutral-300'
                      }`}>
                        {j.reference_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-neutral-300 max-w-xs truncate">{j.notes}</td>
                    <td className="py-3 px-3 text-right font-bold text-white">
                      {formatRupiah(j.total_amount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400">
                        {j.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
