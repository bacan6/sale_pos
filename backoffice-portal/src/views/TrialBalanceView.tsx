import React, { useEffect, useState } from 'react';
import {
  Scale,
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
  Printer,
  Download,
} from 'lucide-react';
import { accountingApi } from '../services/api';
import type { TrialBalanceResponse } from '../types/accounting';

export const TrialBalanceView: React.FC = () => {
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<TrialBalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await accountingApi.getTrialBalance(asOfDate);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [asOfDate]);

  const formatRupiah = (val?: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
            <span className="text-neutral-400">Posisi Per Tanggal:</span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {data?.is_balanced ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              <CheckCircle className="w-4 h-4" />
              <span>Neraca Saldo SEIMBANG</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
              <AlertCircle className="w-4 h-4" />
              <span>SELISIH: {formatRupiah(data?.difference)}</span>
            </div>
          )}

          <button
            onClick={() => window.print()}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-all"
            title="Cetak Neraca Saldo"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Trial Balance Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-neutral-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mx-auto mb-2" />
            <span className="text-xs">Menyusun Neraca Saldo...</span>
          </div>
        ) : !data || data.accounts.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 text-xs">
            Tidak ada akun terdaftar dalam sistem.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-neutral-900/80 border-b border-neutral-800 text-neutral-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Kode</th>
                  <th className="py-3 px-4">Nama Akun</th>
                  <th className="py-3 px-4">Tipe</th>
                  <th className="py-3 px-4 text-center">Saldo Normal</th>
                  <th className="py-3 px-4 text-right">Debit (Rp)</th>
                  <th className="py-3 px-4 text-right">Kredit (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 font-mono">
                {data.accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-emerald-400">{acc.code}</td>
                    <td className="py-3 px-4 font-sans font-semibold text-white">{acc.name}</td>
                    <td className="py-3 px-4 font-sans text-neutral-400 uppercase text-[10px]">
                      {acc.type}
                    </td>
                    <td className="py-3 px-4 text-center text-neutral-400 uppercase text-[10px]">
                      {acc.normal_balance}
                    </td>
                    <td className="py-3 px-4 text-right text-white">
                      {acc.ending_debit > 0 ? formatRupiah(acc.ending_debit) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-white">
                      {acc.ending_credit > 0 ? formatRupiah(acc.ending_credit) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-neutral-950 border-t-2 border-neutral-700 font-mono font-bold text-sm text-white">
                  <td colSpan={4} className="py-3.5 px-4 font-sans uppercase">
                    TOTAL KESELURUHAN (TRIAL BALANCE)
                  </td>
                  <td className="py-3.5 px-4 text-right text-emerald-400">
                    {formatRupiah(data.total_debit)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-emerald-400">
                    {formatRupiah(data.total_credit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
