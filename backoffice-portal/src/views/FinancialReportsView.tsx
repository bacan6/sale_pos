import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Calendar,
  FileSpreadsheet,
  Download,
  Printer,
  Loader2,
  TrendingUp,
  DollarSign,
  Scale,
} from 'lucide-react';
import { accountingApi } from '../services/api';
import type {
  IncomeStatementResponse,
  BalanceSheetResponse,
  CashFlowResponse,
} from '../types/accounting';

export const FinancialReportsView: React.FC = () => {
  const [reportType, setReportType] = useState<'income' | 'balance' | 'cashflow'>('income');
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));

  const [incomeData, setIncomeData] = useState<IncomeStatementResponse | null>(null);
  const [balanceData, setBalanceData] = useState<BalanceSheetResponse | null>(null);
  const [cashFlowData, setCashFlowData] = useState<CashFlowResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = async () => {
    setLoading(true);
    try {
      if (reportType === 'income') {
        const res = await accountingApi.getIncomeStatement(startDate, endDate);
        setIncomeData(res);
      } else if (reportType === 'balance') {
        const res = await accountingApi.getBalanceSheet(asOfDate);
        setBalanceData(res);
      } else if (reportType === 'cashflow') {
        const res = await accountingApi.getCashFlow(startDate, endDate);
        setCashFlowData(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportType, startDate, endDate, asOfDate]);

  const formatRupiah = (val?: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Report Switcher & Date Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Report Selector Pills */}
        <div className="p-1 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center text-xs font-bold">
          <button
            onClick={() => setReportType('income')}
            className={`py-2 px-3.5 rounded-lg transition-all ${
              reportType === 'income'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Laporan Laba Rugi
          </button>
          <button
            onClick={() => setReportType('balance')}
            className={`py-2 px-3.5 rounded-lg transition-all ${
              reportType === 'balance'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Neraca (Balance Sheet)
          </button>
          <button
            onClick={() => setReportType('cashflow')}
            className={`py-2 px-3.5 rounded-lg transition-all ${
              reportType === 'cashflow'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Arus Kas (Cash Flow)
          </button>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-3">
          {reportType === 'balance' ? (
            <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-neutral-500" />
              <span className="text-neutral-400">Per Tanggal:</span>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-neutral-500" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-white focus:outline-none"
              />
              <span className="text-neutral-600">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-white focus:outline-none"
              />
            </div>
          )}

          <button
            onClick={() => window.print()}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-all cursor-pointer"
            title="Cetak Laporan"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-neutral-400">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mx-auto mb-2" />
          <span className="text-xs">Menyiapkan Laporan Finansial...</span>
        </div>
      ) : reportType === 'income' && incomeData ? (
        /* Income Statement */
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xs max-w-4xl mx-auto space-y-6">
          <div className="text-center pb-4 border-b border-neutral-800">
            <h3 className="text-lg font-black text-white uppercase">LAPORAN LABA RUGI (INCOME STATEMENT)</h3>
            <p className="text-xs text-neutral-400">
              Periode: {incomeData.start_date} s/d {incomeData.end_date}
            </p>
          </div>

          {/* Revenue Section */}
          <div>
            <div className="flex items-center justify-between font-bold text-xs uppercase text-emerald-400 pb-2 border-b border-neutral-800">
              <span>PENDAPATAN USAHA (REVENUE)</span>
              <span>NOMINAL (RP)</span>
            </div>
            <div className="divide-y divide-neutral-800/40 text-xs py-2 font-mono">
              {incomeData.revenues.map((r) => (
                <div key={r.id} className="flex justify-between py-2 px-2 text-neutral-200">
                  <span className="font-sans">[{r.code}] {r.name}</span>
                  <span>{formatRupiah(r.amount)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold text-xs pt-2 border-t border-neutral-800 font-mono text-emerald-400">
              <span className="font-sans">TOTAL PENDAPATAN</span>
              <span>{formatRupiah(incomeData.total_revenue)}</span>
            </div>
          </div>

          {/* COGS Section */}
          <div>
            <div className="flex items-center justify-between font-bold text-xs uppercase text-orange-400 pb-2 border-b border-neutral-800">
              <span>BEBAN POKOK PENJUALAN (HPP / COGS)</span>
              <span>NOMINAL (RP)</span>
            </div>
            <div className="divide-y divide-neutral-800/40 text-xs py-2 font-mono">
              {incomeData.cogs.map((c) => (
                <div key={c.id} className="flex justify-between py-2 px-2 text-neutral-200">
                  <span className="font-sans">[{c.code}] {c.name}</span>
                  <span>{formatRupiah(c.amount)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold text-xs pt-2 border-t border-neutral-800 font-mono text-orange-400">
              <span className="font-sans">TOTAL BEBAN POKOK PENJUALAN</span>
              <span>{formatRupiah(incomeData.total_cogs)}</span>
            </div>
          </div>

          {/* Gross Profit Banner */}
          <div className="flex justify-between font-bold text-sm p-3 bg-neutral-800/60 rounded-xl font-mono text-white">
            <span className="font-sans uppercase">LABA KOTOR (GROSS PROFIT)</span>
            <span className="text-emerald-400">{formatRupiah(incomeData.gross_profit)}</span>
          </div>

          {/* Operating Expenses Section */}
          <div>
            <div className="flex items-center justify-between font-bold text-xs uppercase text-rose-400 pb-2 border-b border-neutral-800">
              <span>BEBAN OPERASIONAL (OPERATING EXPENSES)</span>
              <span>NOMINAL (RP)</span>
            </div>
            <div className="divide-y divide-neutral-800/40 text-xs py-2 font-mono">
              {incomeData.expenses.map((e) => (
                <div key={e.id} className="flex justify-between py-2 px-2 text-neutral-200">
                  <span className="font-sans">[{e.code}] {e.name}</span>
                  <span>{formatRupiah(e.amount)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold text-xs pt-2 border-t border-neutral-800 font-mono text-rose-400">
              <span className="font-sans">TOTAL BEBAN OPERASIONAL</span>
              <span>{formatRupiah(incomeData.total_expenses)}</span>
            </div>
          </div>

          {/* Net Income Banner */}
          <div className="flex justify-between font-black text-base p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl font-mono text-white">
            <span className="font-sans uppercase">LABA BERSIH BERJALAN (NET INCOME)</span>
            <span className={incomeData.net_income >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {formatRupiah(incomeData.net_income)}
            </span>
          </div>
        </div>
      ) : reportType === 'balance' && balanceData ? (
        /* Balance Sheet */
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xs max-w-4xl mx-auto space-y-6">
          <div className="text-center pb-4 border-b border-neutral-800">
            <h3 className="text-lg font-black text-white uppercase">NERACA KEUANGAN (BALANCE SHEET)</h3>
            <p className="text-xs text-neutral-400">Posisi Per: {balanceData.as_of_date}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: Assets */}
            <div className="space-y-4">
              <div className="flex items-center justify-between font-bold text-xs uppercase text-cyan-400 pb-2 border-b border-neutral-800">
                <span>AKTIVA / ASET (ASSETS)</span>
                <span>(RP)</span>
              </div>
              <div className="divide-y divide-neutral-800/40 text-xs font-mono">
                {balanceData.assets.map((a) => (
                  <div key={a.id} className="flex justify-between py-2 px-2 text-neutral-200">
                    <span className="font-sans">[{a.code}] {a.name}</span>
                    <span>{formatRupiah(a.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-sm pt-3 border-t-2 border-neutral-700 font-mono text-cyan-400">
                <span className="font-sans uppercase">TOTAL ASET</span>
                <span>{formatRupiah(balanceData.total_assets)}</span>
              </div>
            </div>

            {/* Right: Liabilities & Equity */}
            <div className="space-y-6">
              {/* Liabilities */}
              <div className="space-y-3">
                <div className="flex items-center justify-between font-bold text-xs uppercase text-amber-400 pb-2 border-b border-neutral-800">
                  <span>KEWAJIBAN / HUTANG (LIABILITIES)</span>
                  <span>(RP)</span>
                </div>
                <div className="divide-y divide-neutral-800/40 text-xs font-mono">
                  {balanceData.liabilities.map((l) => (
                    <div key={l.id} className="flex justify-between py-2 px-2 text-neutral-200">
                      <span className="font-sans">[{l.code}] {l.name}</span>
                      <span>{formatRupiah(l.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-bold text-xs pt-2 border-t border-neutral-800 font-mono text-amber-400">
                  <span className="font-sans">TOTAL KEWAJIBAN</span>
                  <span>{formatRupiah(balanceData.total_liabilities)}</span>
                </div>
              </div>

              {/* Equity */}
              <div className="space-y-3">
                <div className="flex items-center justify-between font-bold text-xs uppercase text-purple-400 pb-2 border-b border-neutral-800">
                  <span>EKUITAS / MODAL (EQUITY)</span>
                  <span>(RP)</span>
                </div>
                <div className="divide-y divide-neutral-800/40 text-xs font-mono">
                  {balanceData.equity.map((eq, i) => (
                    <div key={i} className="flex justify-between py-2 px-2 text-neutral-200">
                      <span className="font-sans">[{eq.code}] {eq.name}</span>
                      <span>{formatRupiah(eq.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-bold text-xs pt-2 border-t border-neutral-800 font-mono text-purple-400">
                  <span className="font-sans">TOTAL EKUITAS</span>
                  <span>{formatRupiah(balanceData.total_equity)}</span>
                </div>
              </div>

              <div className="flex justify-between font-bold text-sm pt-3 border-t-2 border-neutral-700 font-mono text-white">
                <span className="font-sans uppercase">TOTAL KEWAJIBAN & EKUITAS</span>
                <span className="text-emerald-400">{formatRupiah(balanceData.total_liabilities_and_equity)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : reportType === 'cashflow' && cashFlowData ? (
        /* Cash Flow */
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xs max-w-4xl mx-auto space-y-6">
          <div className="text-center pb-4 border-b border-neutral-800">
            <h3 className="text-lg font-black text-white uppercase">LAPORAN ARUS KAS (CASH FLOW STATEMENT)</h3>
            <p className="text-xs text-neutral-400">
              Periode: {cashFlowData.start_date} s/d {cashFlowData.end_date}
            </p>
          </div>

          <div className="divide-y divide-neutral-800 text-xs font-mono space-y-4">
            <div className="flex justify-between py-3 text-neutral-300">
              <span className="font-sans font-bold">1. Saldo Kas & Bank Awal Periode</span>
              <span className="text-white font-bold">{formatRupiah(cashFlowData.opening_cash)}</span>
            </div>

            <div className="py-3 space-y-2">
              <span className="font-sans font-bold text-emerald-400 block">2. Arus Kas Masuk (Penerimaan Operasional)</span>
              <div className="flex justify-between pl-4 text-neutral-200">
                <span className="font-sans">Penerimaan dari Penjualan POS & Pelunasan Kamar Tamu</span>
                <span className="text-emerald-400 font-bold">{formatRupiah(cashFlowData.cash_in)}</span>
              </div>
            </div>

            <div className="py-3 space-y-2">
              <span className="font-sans font-bold text-rose-400 block">3. Arus Kas Keluar (Pengeluaran Operasional)</span>
              <div className="flex justify-between pl-4 text-neutral-200">
                <span className="font-sans">Pengeluaran Biaya, Belanja & Pembayaran Beban</span>
                <span className="text-rose-400 font-bold">({formatRupiah(cashFlowData.cash_out)})</span>
              </div>
            </div>

            <div className="flex justify-between py-3 font-bold text-sm text-white">
              <span className="font-sans uppercase">Arus Kas Bersih (Net Cash Flow)</span>
              <span className={cashFlowData.net_cash_flow >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {formatRupiah(cashFlowData.net_cash_flow)}
              </span>
            </div>

            <div className="flex justify-between py-4 font-black text-base bg-emerald-950/40 p-4 rounded-xl border border-emerald-500/30 text-white">
              <span className="font-sans uppercase">Saldo Kas & Bank Akhir Periode</span>
              <span className="text-emerald-400">{formatRupiah(cashFlowData.closing_cash)}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
