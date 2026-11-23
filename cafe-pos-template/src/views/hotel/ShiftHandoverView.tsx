import React, { useState, useEffect } from 'react';
import { 
  Clock, CheckCircle2, Plus, Sparkles, X
} from 'lucide-react';
import { hotelApi } from '../../services/hotelApi';
import type { HotelShiftHandover, ShiftSummary } from '../../types/hotel';

export const ShiftHandoverView: React.FC = () => {
  const [shifts, setShifts] = useState<HotelShiftHandover[]>([]);
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isOpenModalOpen, setIsOpenModalOpen] = useState<boolean>(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const [openForm, setOpenForm] = useState({
    shift_type: 'morning',
    cash_opening: 500000,
    handover_notes: '',
  });

  const [closeForm, setCloseForm] = useState({
    cash_closing: 0,
    cash_collected: 0,
    handover_notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [hist, summ] = await Promise.all([
        hotelApi.getShifts(),
        hotelApi.getShiftSummary(),
      ]);
      setShifts(hist);
      setSummary(summ);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat rekap shift front desk');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await hotelApi.openShift(openForm);
      setIsOpenModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Gagal membuka shift');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary?.active_shift) return;

    setSaving(true);
    try {
      await hotelApi.closeShift(summary.active_shift.id, closeForm);
      setIsCloseModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Gagal menutup shift');
    } finally {
      setSaving(false);
    }
  };

  const activeShift = summary?.active_shift;

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-100 overflow-hidden">
      {/* Top Header */}
      <div className="bg-white border-b border-neutral-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-700 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-neutral-900 leading-tight">Serah Terima & Shift Kasir Front Desk</h1>
            <p className="text-xs text-neutral-500 font-medium">Rekonsiliasi uang kas laci, jadwal kedatangan/keberangkatan, dan catatan pergantian shift</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeShift ? (
            <button
              onClick={() => {
                setCloseForm({
                  cash_closing: activeShift.cash_opening + (summary?.payments_collected_today || 0),
                  cash_collected: summary?.payments_collected_today || 0,
                  handover_notes: '',
                });
                setIsCloseModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Tutup Shift ({activeShift.shift_type.toUpperCase()})</span>
            </button>
          ) : (
            <button
              onClick={() => setIsOpenModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Buka Shift Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-5 space-y-5">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-neutral-500 gap-2 font-medium">
            <Sparkles className="w-5 h-5 animate-spin text-amber-600" />
            <span>Memuat data shift front desk...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm font-semibold">
            {error}
          </div>
        ) : (
          <>
            {/* Live Shift Metrics Card */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs">
                <div className="text-[10px] font-bold text-neutral-400 uppercase">Status Shift Saat Ini</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-3 h-3 rounded-full ${activeShift ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-300'}`}></span>
                  <span className="font-extrabold text-sm text-neutral-900 capitalize">
                    {activeShift ? `Shift ${activeShift.shift_type} (Aktif)` : 'Tidak Ada Shift Terbuka'}
                  </span>
                </div>
                {activeShift && (
                  <div className="text-[11px] text-neutral-500 mt-1 font-medium">
                    Dibuka sejak: {activeShift.created_at.split(' ')[1]?.substring(0, 5)}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs">
                <div className="text-[10px] font-bold text-neutral-400 uppercase">Pembayaran Folio Hari Ini</div>
                <div className="font-black text-amber-700 text-base mt-1">
                  Rp {(summary?.payments_collected_today || 0).toLocaleString('id-ID')}
                </div>
                <div className="text-[11px] text-neutral-500 mt-1">Total settlement & deposit masuk</div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs">
                <div className="text-[10px] font-bold text-neutral-400 uppercase">Tamu Check-in Tertunda</div>
                <div className="font-black text-blue-600 text-base mt-1">
                  {summary?.pending_arrivals || 0} Reservasi
                </div>
                <div className="text-[11px] text-neutral-500 mt-1">Jadwal tiba hari ini</div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs">
                <div className="text-[10px] font-bold text-neutral-400 uppercase">Tamu Check-out Tertunda</div>
                <div className="font-black text-neutral-900 text-base mt-1">
                  {summary?.pending_departures || 0} Kamar
                </div>
                <div className="text-[11px] text-neutral-500 mt-1">Perlu penyelesaian folio hari ini</div>
              </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-2xl shadow-xs border border-neutral-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-neutral-200 font-extrabold text-xs text-neutral-900 uppercase tracking-wider">
                Riwayat Rekonsiliasi & Serah Terima Shift
              </div>

              {shifts.length === 0 ? (
                <div className="p-8 text-center text-neutral-400 text-xs">
                  Belum ada log serah terima shift tersimpan.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs divide-y divide-neutral-200">
                    <thead className="bg-neutral-50 text-neutral-600 font-bold">
                      <tr>
                        <th className="p-3">Tanggal / Waktu</th>
                        <th className="p-3">Shift</th>
                        <th className="p-3">Resepsionis</th>
                        <th className="p-3 text-right">Kas Awal</th>
                        <th className="p-3 text-right">Pendapatan Masuk</th>
                        <th className="p-3 text-right">Kas Akhir</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Catatan Serah Terima</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {shifts.map((s) => (
                        <tr key={s.id} className="hover:bg-neutral-50/50">
                          <td className="p-3 font-semibold text-neutral-800">
                            {s.shift_date}
                          </td>
                          <td className="p-3 font-bold uppercase text-amber-800">
                            {s.shift_type}
                          </td>
                          <td className="p-3 text-neutral-700 font-medium">
                            {s.receptionist_name || 'Staff Front Desk'}
                          </td>
                          <td className="p-3 text-right font-medium text-neutral-600">
                            Rp {s.cash_opening.toLocaleString('id-ID')}
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-700">
                            Rp {s.cash_collected.toLocaleString('id-ID')}
                          </td>
                          <td className="p-3 text-right font-black text-neutral-900">
                            Rp {s.cash_closing.toLocaleString('id-ID')}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              s.status === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-700'
                            }`}>
                              {s.status === 'open' ? 'Berjalan' : 'Selesai'}
                            </span>
                          </td>
                          <td className="p-3 text-neutral-500 max-w-xs truncate">
                            {s.handover_notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal Buka Shift */}
      {isOpenModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between">
              <h3 className="text-sm font-black">Buka Shift Kasir Front Desk</h3>
              <button
                onClick={() => setIsOpenModalOpen(false)}
                className="p-1 rounded-lg hover:bg-emerald-800 text-emerald-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleOpenShift} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Pilihan Shift *</label>
                  <select
                    value={openForm.shift_type}
                    onChange={(e) => setOpenForm({ ...openForm, shift_type: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-neutral-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500 uppercase"
                  >
                    <option value="morning">Morning (Pagi: 07:00 - 15:00)</option>
                    <option value="evening">Evening (Sore: 15:00 - 23:00)</option>
                    <option value="night">Night (Malam: 23:00 - 07:00)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Kas Awal Laci (Rp) *</label>
                  <input
                    type="number"
                    min="0"
                    step="50000"
                    required
                    value={openForm.cash_opening}
                    onChange={(e) => setOpenForm({ ...openForm, cash_opening: Number(e.target.value) })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-neutral-800 font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Catatan Awal Shift</label>
                <textarea
                  rows={2}
                  placeholder="Kondisi uang kembalian, titipan kunci, dll..."
                  value={openForm.handover_notes}
                  onChange={(e) => setOpenForm({ ...openForm, handover_notes: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsOpenModalOpen(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-neutral-300 font-bold text-neutral-700 hover:bg-neutral-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
                >
                  {saving ? 'Membuka...' : 'Mulai Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tutup Shift */}
      {isCloseModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-red-700 text-white flex items-center justify-between">
              <h3 className="text-sm font-black">Tutup & Rekonsiliasi Kas Shift</h3>
              <button
                onClick={() => setIsCloseModalOpen(false)}
                className="p-1 rounded-lg hover:bg-red-800 text-red-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCloseShift} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Total Kas Dikumpulkan (Rp) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={closeForm.cash_collected}
                    onChange={(e) => setCloseForm({ ...closeForm, cash_collected: Number(e.target.value) })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-neutral-800 font-bold focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Kas Akhir Fisik di Laci (Rp) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={closeForm.cash_closing}
                    onChange={(e) => setCloseForm({ ...closeForm, cash_closing: Number(e.target.value) })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-neutral-800 font-bold focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Catatan Serah Terima ke Shift Berikutnya *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Tamu tertunda, kamar maintenance, atau pesan khusus..."
                  value={closeForm.handover_notes}
                  onChange={(e) => setCloseForm({ ...closeForm, handover_notes: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                ></textarea>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-neutral-300 font-bold text-neutral-700 hover:bg-neutral-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-50"
                >
                  {saving ? 'Menutup...' : 'Tutup & Serahkan Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
