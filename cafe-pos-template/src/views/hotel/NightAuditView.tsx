import React, { useState, useEffect } from 'react';
import { 
  Moon, RefreshCw, 
  ShieldCheck
} from 'lucide-react';
import { hotelApi } from '../../services/hotelApi';
import type { NightAuditMetrics, NightAuditRecord } from '../../types/hotel';

export const NightAuditView: React.FC = () => {
  const [metrics, setMetrics] = useState<NightAuditMetrics | null>(null);
  const [history, setHistory] = useState<NightAuditRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [running, setRunning] = useState<boolean>(false);
  const [auditDate, setAuditDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await hotelApi.getNightAudit();
      setMetrics(res.metrics);
      setHistory(res.recent_audits || []);
    } catch (err: any) {
      alert(err.message || 'Gagal memuat data night audit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunAudit = async () => {
    if (!confirm(`Jalankan audit malam untuk tanggal ${auditDate}? Rekapitulasi pendapatan dan statistik okupansi harian akan ditutup buku.`)) {
      return;
    }

    try {
      setRunning(true);
      await hotelApi.runNightAudit(auditDate);
      alert(`Night audit untuk tanggal ${auditDate} berhasil diproses.`);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal memproses night audit');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-100 overflow-hidden p-4 md:p-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-neutral-200 mb-4 shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-amber-600/10 text-amber-700 flex items-center justify-center font-bold">
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-neutral-900 leading-tight">Night Audit & Rekapitulasi Harian</h1>
            <p className="text-xs text-neutral-500">Statistik performa hotel modern: Okupansi, ADR, RevPAR, dan rekonsiliasi pendapatan POS</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={auditDate}
            onChange={(e) => setAuditDate(e.target.value)}
            className="bg-neutral-100 border border-neutral-200 text-xs font-bold text-neutral-800 rounded-xl px-3 py-2 outline-none"
          />
          <button
            onClick={handleRunAudit}
            disabled={running}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <ShieldCheck className="w-4 h-4" /> {running ? 'Memproses Audit...' : 'Tutup Buku / Run Night Audit'}
          </button>
          <button
            onClick={fetchData}
            className="p-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4 shrink-0 text-xs">
        <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Occupancy Rate</span>
          <p className="text-2xl font-black text-amber-700">{metrics?.occupancy_rate || 0}%</p>
          <span className="text-[11px] text-neutral-500 font-medium">
            {metrics?.occupied_rooms || 0} / {metrics?.total_rooms || 0} Kamar Terisi
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">ADR (Avg Daily Rate)</span>
          <p className="text-xl font-black text-neutral-900 truncate">
            Rp {Number(metrics?.adr || 0).toLocaleString('id-ID')}
          </p>
          <span className="text-[11px] text-neutral-500 font-medium">Rata-rata per kamar terjual</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">RevPAR</span>
          <p className="text-xl font-black text-neutral-900 truncate">
            Rp {Number(metrics?.revpar || 0).toLocaleString('id-ID')}
          </p>
          <span className="text-[11px] text-neutral-500 font-medium">Pendapatan per kamar tersedia</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Pendapatan Kamar</span>
          <p className="text-xl font-black text-blue-700 truncate">
            Rp {Number(metrics?.room_revenue || 0).toLocaleString('id-ID')}
          </p>
          <span className="text-[11px] text-neutral-500 font-medium">Dari sewa malam hari ini</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Restoran / Cafe POS</span>
          <p className="text-xl font-black text-emerald-700 truncate">
            Rp {Number(metrics?.pos_revenue || 0).toLocaleString('id-ID')}
          </p>
          <span className="text-[11px] text-neutral-500 font-medium">Charge to Room dari Cafe</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Total Pendapatan</span>
          <p className="text-xl font-black text-amber-700 truncate">
            Rp {Number(metrics?.total_revenue || 0).toLocaleString('id-ID')}
          </p>
          <span className="text-[11px] text-neutral-500 font-medium">Kamar + F&B + Ekstra</span>
        </div>
      </div>

      {/* Historical Night Audits */}
      <div className="flex-1 bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden flex flex-col min-h-0">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-xs font-black text-neutral-900">Riwayat Audit Malam & Rekap Penutupan Harian</h2>
          <span className="text-[11px] font-bold text-neutral-400">Arsip Laporan Keuangan</span>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 sticky top-0 font-bold text-neutral-600">
              <tr>
                <th className="py-3 px-4">Tanggal Audit</th>
                <th className="py-3 px-4">Okupansi (%)</th>
                <th className="py-3 px-4">Kamar Terisi</th>
                <th className="py-3 px-4">Pendapatan Kamar</th>
                <th className="py-3 px-4">Pendapatan Cafe POS</th>
                <th className="py-3 px-4">Total Pendapatan</th>
                <th className="py-3 px-4">ADR</th>
                <th className="py-3 px-4">RevPAR</th>
                <th className="py-3 px-4 text-right">Auditor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-neutral-400">
                    Belum ada riwayat night audit. Klik tombol "Tutup Buku / Run Night Audit" di atas.
                  </td>
                </tr>
              ) : (
                history.map((rec) => (
                  <tr key={rec.id} className="hover:bg-neutral-50/70 transition-all">
                    <td className="py-3 px-4 font-bold text-neutral-900 whitespace-nowrap">
                      {rec.audit_date}
                    </td>
                    <td className="py-3 px-4 font-black text-amber-700 whitespace-nowrap">
                      {rec.occupancy_rate}%
                    </td>
                    <td className="py-3 px-4 font-semibold text-neutral-700 whitespace-nowrap">
                      {rec.occupied_rooms} / {rec.total_rooms} Kamar
                    </td>
                    <td className="py-3 px-4 font-semibold text-neutral-800 whitespace-nowrap">
                      Rp {Number(rec.room_revenue).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-700 whitespace-nowrap">
                      Rp {Number(rec.pos_revenue).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 font-black text-neutral-900 whitespace-nowrap">
                      Rp {Number(rec.total_revenue).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-neutral-700 whitespace-nowrap">
                      Rp {Number(rec.adr).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-neutral-700 whitespace-nowrap">
                      Rp {Number(rec.revpar).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-right text-neutral-500 whitespace-nowrap">
                      {rec.auditor_name || 'System / Admin'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
