import React, { useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  Search,
  Calendar,
  Loader2,
  ArrowRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { accountingApi } from '../services/api';
import type { AccountingAccount, AccountLedgerResponse } from '../types/accounting';

export const GeneralLedgerView: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountingAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number>(0);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [ledgerData, setLedgerData] = useState<AccountLedgerResponse | null>(null);
  const [allAccountsSummary, setAllAccountsSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAccounts = async () => {
    try {
      const list = await accountingApi.getAccounts();
      setAccounts(list);
      if (list.length > 0 && selectedAccountId === 0) {
        setSelectedAccountId(list[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadLedger = async () => {
    setLoading(true);
    try {
      const res: any = await accountingApi.getGeneralLedger({
        account_id: selectedAccountId || undefined,
        start_date: startDate,
        end_date: endDate,
      });

      if (selectedAccountId > 0) {
        setLedgerData(res);
        setAllAccountsSummary([]);
      } else {
        setAllAccountsSummary(res.accounts || []);
        setLedgerData(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    loadLedger();
  }, [selectedAccountId, startDate, endDate]);

  const formatRupiah = (val?: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Account Selector */}
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(Number(e.target.value))}
            className="px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-200 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer min-w-[240px]"
          >
            <option value={0}>-- Ringkasan Semua Akun --</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                [{a.code}] {a.name}
              </option>
            ))}
          </select>

          {/* Date Picker */}
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
        </div>
      </div>

      {/* Ledger Content */}
      {loading ? (
        <div className="p-12 text-center text-neutral-400">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mx-auto mb-2" />
          <span className="text-xs">Menghitung mutasi buku besar...</span>
        </div>
      ) : selectedAccountId > 0 && ledgerData ? (
        <div className="space-y-4">
          {/* Account Header Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
                [{ledgerData.account.code}] {ledgerData.account.type} - Saldo Normal: {ledgerData.account.normal_balance}
              </span>
              <h3 className="text-lg font-black text-white">{ledgerData.account.name}</h3>
            </div>
            <div className="flex items-center gap-6 font-mono text-xs">
              <div>
                <span className="text-neutral-500 block text-[10px]">SALDO AWAL</span>
                <span className="font-bold text-neutral-200">{formatRupiah(ledgerData.opening_balance)}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">TOTAL DEBIT</span>
                <span className="font-bold text-emerald-400">{formatRupiah(ledgerData.total_debit)}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">TOTAL KREDIT</span>
                <span className="font-bold text-rose-400">{formatRupiah(ledgerData.total_credit)}</span>
              </div>
              <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <span className="text-emerald-400 block text-[10px] font-bold">SALDO AKHIR</span>
                <span className="font-black text-white text-sm">{formatRupiah(ledgerData.ending_balance)}</span>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
            {ledgerData.transactions.length === 0 ? (
              <div className="p-12 text-center text-neutral-500 text-xs">
                Tidak ada mutasi transaksi untuk akun ini pada periode yang dipilih.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-neutral-900/80 border-b border-neutral-800 text-neutral-400 font-bold uppercase text-[10px]">
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">No. Jurnal</th>
                      <th className="py-3 px-4">Keterangan / Memo</th>
                      <th className="py-3 px-4 text-right">Debit (Rp)</th>
                      <th className="py-3 px-4 text-right">Kredit (Rp)</th>
                      <th className="py-3 px-4 text-right">Saldo Berjalan (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 font-mono">
                    <tr className="bg-neutral-800/20 text-neutral-400 font-bold italic">
                      <td className="py-2.5 px-4">{ledgerData.start_date}</td>
                      <td className="py-2.5 px-4">-</td>
                      <td className="py-2.5 px-4 font-sans">Saldo Awal Sebelum Periode</td>
                      <td className="py-2.5 px-4 text-right">-</td>
                      <td className="py-2.5 px-4 text-right">-</td>
                      <td className="py-2.5 px-4 text-right text-white">{formatRupiah(ledgerData.opening_balance)}</td>
                    </tr>
                    {ledgerData.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-neutral-800/40 transition-colors">
                        <td className="py-3 px-4 text-neutral-300">{tx.entry_date}</td>
                        <td className="py-3 px-4 font-bold text-emerald-400">{tx.entry_number}</td>
                        <td className="py-3 px-4 font-sans text-neutral-300">{tx.memo || tx.notes}</td>
                        <td className="py-3 px-4 text-right text-white">
                          {tx.debit > 0 ? formatRupiah(tx.debit) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right text-white">
                          {tx.credit > 0 ? formatRupiah(tx.credit) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400">
                          {formatRupiah(tx.running_balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* All Accounts Summary Table */
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-neutral-900/80 border-b border-neutral-800 text-neutral-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Kode</th>
                  <th className="py-3 px-4">Nama Akun</th>
                  <th className="py-3 px-4">Tipe</th>
                  <th className="py-3 px-4 text-right">Saldo Awal</th>
                  <th className="py-3 px-4 text-right">Debit Periode</th>
                  <th className="py-3 px-4 text-right">Kredit Periode</th>
                  <th className="py-3 px-4 text-right">Saldo Akhir</th>
                  <th className="py-3 px-4 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 font-mono">
                {allAccountsSummary.map((acc) => (
                  <tr key={acc.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-emerald-400">{acc.code}</td>
                    <td className="py-3 px-4 font-sans font-semibold text-white">{acc.name}</td>
                    <td className="py-3 px-4 font-sans text-neutral-400 uppercase text-[10px]">{acc.type}</td>
                    <td className="py-3 px-4 text-right text-neutral-300">{formatRupiah(acc.opening_balance)}</td>
                    <td className="py-3 px-4 text-right text-emerald-400">{formatRupiah(acc.period_debit)}</td>
                    <td className="py-3 px-4 text-right text-rose-400">{formatRupiah(acc.period_credit)}</td>
                    <td className="py-3 px-4 text-right font-bold text-white">{formatRupiah(acc.ending_balance)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedAccountId(acc.id)}
                        className="text-xs text-emerald-400 hover:underline font-bold flex items-center justify-end gap-1"
                      >
                        <span>Buka</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
