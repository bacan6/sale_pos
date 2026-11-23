import React, { useEffect, useState } from 'react';
import {
  CalendarCheck,
  Plus,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Calendar,
} from 'lucide-react';
import { accountingApi } from '../services/api';
import type { AccountingPeriod } from '../types/accounting';

export const PeriodClosingView: React.FC = () => {
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  // New Period Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [periodName, setPeriodName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadPeriods = async () => {
    setLoading(true);
    try {
      const data = await accountingApi.getPeriods();
      setPeriods(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeriods();
  }, []);

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      await accountingApi.createPeriod({
        period_name: periodName,
        start_date: startDate,
        end_date: endDate,
      });
      setIsModalOpen(false);
      setPeriodName('');
      setStartDate('');
      setEndDate('');
      loadPeriods();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membuat periode baru');
    } finally {
      setSaving(false);
    }
  };

  const handleClosePeriod = async (period: AccountingPeriod) => {
    if (
      !confirm(
        `PERINGATAN TUTUP BUKU:\n\nApakah Anda yakin ingin menutup buku periode "${period.period_name}" (${period.start_date} s/d ${period.end_date})?\n\nSetelah ditutup, semua jurnal pada rentang tanggal ini akan DIKUNCI PERMANEN dan tidak dapat diubah/ditambah.`
      )
    ) {
      return;
    }

    try {
      await accountingApi.closePeriod(period.id);
      loadPeriods();
      alert(`Periode ${period.period_name} berhasil ditutup buku.`);
    } catch (err: any) {
      alert(err.message || 'Gagal menutup buku periode');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white">Tutup Buku Periode Akuntansi</h3>
          <p className="text-xs text-neutral-400">
            Kunci transaksi per bulan untuk integritas laporan keuangan dan kepatuhan audit
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Buka Periode Baru</span>
        </button>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-neutral-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mx-auto mb-2" />
            <span className="text-xs">Memuat daftar periode...</span>
          </div>
        ) : periods.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 text-xs">
            Belum ada periode akuntansi terdaftar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-neutral-900/80 border-b border-neutral-800 text-neutral-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Nama Periode</th>
                  <th className="py-3 px-4">Tanggal Mulai</th>
                  <th className="py-3 px-4">Tanggal Selesai</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Ditutup Oleh</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {periods.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      {p.status === 'closed' ? (
                        <Lock className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span>{p.period_name}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-300">{p.start_date}</td>
                    <td className="py-3 px-4 font-mono text-neutral-300">{p.end_date}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          p.status === 'closed'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {p.status === 'closed' ? 'Terkunci (Closed)' : 'Terbuka (Open)'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-400 text-[11px]">
                      {p.closed_by_name ? (
                        <span>
                          {p.closed_by_name} ({p.closed_at?.slice(0, 10)})
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {p.status === 'open' && (
                        <button
                          onClick={() => handleClosePeriod(p)}
                          className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          Tutup Buku
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add Period */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Buka Periode Akuntansi Baru</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Tentukan rentang tanggal periode pembukuan baru
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreatePeriod} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">Nama Periode</label>
                <input
                  type="text"
                  value={periodName}
                  onChange={(e) => setPeriodName(e.target.value)}
                  required
                  placeholder="Contoh: Desember 2026"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1">Tanggal Akhir</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Buka Periode</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
