import React, { useState, useEffect } from 'react';
import { 
  Clock, Plus, ArrowDownRight, ArrowUpRight, 
  AlertCircle, RefreshCw, X
} from 'lucide-react';
import { posApi } from '../services/posApi';
import type { CashierShift } from '../types/posV2';

export const ShiftManagementView: React.FC = () => {
  const [currentShift, setCurrentShift] = useState<CashierShift | null>(null);
  const [hasActiveShift, setHasActiveShift] = useState<boolean>(false);
  const [shiftsHistory, setShiftsHistory] = useState<CashierShift[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Modals
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);

  // Form states
  const [openFloat, setOpenFloat] = useState<number>(200000);
  const [openNotes, setOpenNotes] = useState<string>('');

  const [movementType, setMovementType] = useState<'cash_in' | 'cash_out'>('cash_out');
  const [movementAmount, setMovementAmount] = useState<number>(10000);
  const [movementReason, setMovementReason] = useState<string>('');

  const [closingPhysicalCash, setClosingPhysicalCash] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const curRes = await posApi.getCurrentShift();
      setHasActiveShift(curRes.has_active_shift);
      setCurrentShift(curRes.shift);
      if (curRes.shift) {
        setClosingPhysicalCash(curRes.shift.expected_cash_drawer || 0);
      }

      const history = await posApi.getShifts();
      setShiftsHistory(history);
    } catch (e) {
      console.error('Failed to load shift data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await posApi.openShift({
        opening_cash: openFloat,
        notes: openNotes,
      });
      setShowOpenModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal membuka shift kasir');
    }
  };

  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementReason.trim() || movementAmount <= 0) return;
    try {
      await posApi.recordCashMovement({
        shift_id: currentShift?.id,
        type: movementType,
        amount: movementAmount,
        reason: movementReason,
      });
      setShowMovementModal(false);
      setMovementReason('');
      setMovementAmount(10000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal mencatat mutasi kas');
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await posApi.closeShift({
        shift_id: currentShift?.id,
        closing_cash_actual: closingPhysicalCash,
        notes: closeNotes,
      });
      setShowCloseModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menutup shift');
    }
  };

  const discrepancy = (closingPhysicalCash || 0) - (currentShift?.expected_cash_drawer || 0);

  return (
    <div className="h-full w-full bg-neutral-100 overflow-y-auto p-4 md:p-6 flex flex-col pb-24 md:pb-6">
      <div className="max-w-6xl w-full mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-neutral-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">Shift Kasir & Saldo Kas Laci</h2>
              <p className="text-xs text-neutral-500 mt-0.5">Kontrol modal awal kasir, mutasi kas masuk/keluar harian, dan rekonsiliasi tutup buku.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-600 transition-colors"
              title="Refresh Shift"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-500' : ''}`} />
            </button>
            {!hasActiveShift ? (
              <button
                onClick={() => setShowOpenModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4 text-emerald-200" />
                <span>Buka Shift Baru</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMovementModal(true)}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs py-2.5 px-3.5 rounded-xl transition-all"
                >
                  ± Catat Kas Masuk/Keluar
                </button>
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-sm"
                >
                  Tutup Shift & Settle
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Current Shift Summary Card */}
        {hasActiveShift && currentShift ? (
          <div className="bg-white p-5 rounded-3xl border border-neutral-200/60 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                  Shift Aktif: {currentShift.user_name}
                </span>
                <span className="text-xs text-neutral-400 font-medium">Dibuka sejak {currentShift.opened_at}</span>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-neutral-400 font-bold uppercase">Estimasi Saldo Laci Kasir Saat Ini</p>
                <p className="text-xl font-black text-neutral-900">
                  Rp {(currentShift.expected_cash_drawer || 0).toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/60">
                <p className="text-[10px] uppercase font-bold text-neutral-400">Modal Awal Kas</p>
                <p className="text-sm font-black text-neutral-800 mt-1">
                  Rp {(currentShift.opening_cash || 0).toLocaleString('id-ID')}
                </p>
              </div>

              <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/60">
                <p className="text-[10px] uppercase font-bold text-emerald-600">Penjualan Tunai (+)</p>
                <p className="text-sm font-black text-emerald-700 mt-1">
                  Rp {(currentShift.live_cash_sales || 0).toLocaleString('id-ID')}
                </p>
              </div>

              <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/60">
                <p className="text-[10px] uppercase font-bold text-blue-600">Non-Tunai (QRIS/Kartu)</p>
                <p className="text-sm font-black text-blue-700 mt-1">
                  Rp {(currentShift.live_non_cash_sales || 0).toLocaleString('id-ID')}
                </p>
              </div>

              <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/60">
                <p className="text-[10px] uppercase font-bold text-purple-600">Kas Masuk (+)</p>
                <p className="text-sm font-black text-purple-700 mt-1">
                  Rp {(currentShift.total_cash_in || 0).toLocaleString('id-ID')}
                </p>
              </div>

              <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/60">
                <p className="text-[10px] uppercase font-bold text-red-600">Kas Keluar (-)</p>
                <p className="text-sm font-black text-red-700 mt-1">
                  Rp {(currentShift.total_cash_out || 0).toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            {/* Shift Movements List */}
            {currentShift.movements && currentShift.movements.length > 0 && (
              <div className="mt-4 pt-4 border-t border-neutral-100">
                <h4 className="text-xs font-black text-neutral-800 uppercase tracking-wider mb-2">
                  Daftar Mutasi Kas Pada Shift Ini
                </h4>
                <div className="divide-y divide-neutral-100 border border-neutral-200/60 rounded-2xl overflow-hidden text-xs">
                  {currentShift.movements.map(m => (
                    <div key={m.id} className="p-3 flex items-center justify-between hover:bg-neutral-50/50">
                      <div className="flex items-center gap-2.5">
                        <span className={`p-1.5 rounded-lg ${m.type === 'cash_in' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'}`}>
                          {m.type === 'cash_in' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        </span>
                        <div>
                          <p className="font-bold text-neutral-900">{m.reason}</p>
                          <p className="text-[10px] text-neutral-400 font-mono">{m.created_at}</p>
                        </div>
                      </div>
                      <p className={`font-black ${m.type === 'cash_in' ? 'text-purple-700' : 'text-red-700'}`}>
                        {m.type === 'cash_in' ? '+' : '-'} Rp {m.amount.toLocaleString('id-ID')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-3xl p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-neutral-900">Belum Ada Shift Kasir yang Terbuka</h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                Buka shift kasir terlebih dahulu dengan memasukkan nominal modal awal kas laci untuk mulai melacak kas fisik dan transaksi.
              </p>
            </div>
            <button
              onClick={() => setShowOpenModal(true)}
              className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-xs transition-all"
            >
              Buka Shift Kasir Sekarang
            </button>
          </div>
        )}

        {/* Historical Shifts Archive */}
        <div className="bg-white rounded-3xl border border-neutral-200/60 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
            <h3 className="font-black text-sm text-neutral-900">Riwayat Tutup Shift Sebelumnya</h3>
            <span className="text-xs text-neutral-400 font-semibold">{shiftsHistory.length} Shift Terdata</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 font-bold uppercase text-[10px] border-b border-neutral-200/60">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Kasir</th>
                  <th className="p-3">Waktu Buka / Tutup</th>
                  <th className="p-3">Modal Awal</th>
                  <th className="p-3">Total Tunai</th>
                  <th className="p-3">Total Non-Tunai</th>
                  <th className="p-3">Fisik Kasir</th>
                  <th className="p-3">Selisih</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium">
                {shiftsHistory.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-neutral-400">Belum ada riwayat shift</td>
                  </tr>
                ) : (
                  shiftsHistory.map(s => {
                    const isClosed = s.status === 'closed';
                    const disc = s.cash_discrepancy || 0;
                    return (
                      <tr key={s.id} className="hover:bg-neutral-50/50">
                        <td className="p-3 font-mono text-[11px] font-bold text-neutral-500">#{s.id}</td>
                        <td className="p-3 font-bold text-neutral-900">{s.user_name}</td>
                        <td className="p-3 text-neutral-500 text-[11px]">
                          <div>Buka: {s.opened_at}</div>
                          <div>Tutup: {s.closed_at || '-'}</div>
                        </td>
                        <td className="p-3 font-semibold text-neutral-700">Rp {(s.opening_cash || 0).toLocaleString('id-ID')}</td>
                        <td className="p-3 font-bold text-emerald-600">Rp {(s.total_cash_sales || 0).toLocaleString('id-ID')}</td>
                        <td className="p-3 font-semibold text-blue-600">Rp {(s.total_non_cash_sales || 0).toLocaleString('id-ID')}</td>
                        <td className="p-3 font-bold text-neutral-900">
                          {isClosed ? `Rp ${(s.closing_cash_actual || 0).toLocaleString('id-ID')}` : '-'}
                        </td>
                        <td className="p-3">
                          {isClosed ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              disc === 0 ? 'bg-neutral-100 text-neutral-700' :
                              disc > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {disc === 0 ? 'Pas' : disc > 0 ? `+Rp ${disc.toLocaleString('id-ID')}` : `-Rp ${Math.abs(disc).toLocaleString('id-ID')}`}
                            </span>
                          ) : (
                            <span className="text-neutral-400">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isClosed ? 'bg-neutral-100 text-neutral-600' : 'bg-emerald-100 text-emerald-700 animate-pulse'
                          }`}>
                            {isClosed ? 'Closed' : 'Open'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL: BUKA SHIFT */}
        {showOpenModal && (
          <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-100 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="font-black text-sm text-neutral-900">Buka Shift Kasir Baru</h3>
                <button onClick={() => setShowOpenModal(false)} className="text-neutral-400 hover:text-neutral-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleOpenShift} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-neutral-600 block mb-1">Modal Awal Kas (Laci Kasir) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-neutral-400">Rp</span>
                    <input
                      type="number"
                      required
                      min={0}
                      step={1000}
                      value={openFloat}
                      onChange={(e) => setOpenFloat(parseInt(e.target.value) || 0)}
                      className="w-full text-sm font-black pl-9 pr-3 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 focus:bg-white"
                    />
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">Uang kembalian yang dimasukkan ke laci saat buka shift.</p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-600 block mb-1">Catatan Shift</label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Kasir shift pagi"
                    value={openNotes}
                    onChange={(e) => setOpenNotes(e.target.value)}
                    className="w-full text-xs border border-neutral-200 rounded-xl p-2.5 bg-neutral-50 focus:bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setShowOpenModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Buka Shift
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: MUTASI KAS */}
        {showMovementModal && (
          <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-100 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="font-black text-sm text-neutral-900">Catat Mutasi Kas Masuk / Keluar</h3>
                <button onClick={() => setShowMovementModal(false)} className="text-neutral-400 hover:text-neutral-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRecordMovement} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementType('cash_out')}
                    className={`p-2.5 rounded-xl border text-xs font-black transition-all ${
                      movementType === 'cash_out' ? 'bg-red-50 border-red-500 text-red-700' : 'border-neutral-200 text-neutral-600'
                    }`}
                  >
                    Kas Keluar (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType('cash_in')}
                    className={`p-2.5 rounded-xl border text-xs font-black transition-all ${
                      movementType === 'cash_in' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-neutral-200 text-neutral-600'
                    }`}
                  >
                    Kas Masuk (+)
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-600 block mb-1">Nominal (Rp) *</label>
                  <input
                    type="number"
                    required
                    min={100}
                    value={movementAmount}
                    onChange={(e) => setMovementAmount(parseInt(e.target.value) || 0)}
                    className="w-full text-sm font-black p-2.5 border border-neutral-200 rounded-xl bg-neutral-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-600 block mb-1">Alasan / Kebutuhan *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Beli es batu kristal, beli galon air, tambah modal"
                    value={movementReason}
                    onChange={(e) => setMovementReason(e.target.value)}
                    className="w-full text-xs p-2.5 border border-neutral-200 rounded-xl bg-neutral-50 focus:bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setShowMovementModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white"
                  >
                    Simpan Mutasi
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: TUTUP SHIFT */}
        {showCloseModal && currentShift && (
          <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-100 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div>
                  <h3 className="font-black text-sm text-neutral-900">Tutup Shift & Rekonsiliasi Kasir</h3>
                  <p className="text-xs text-neutral-500">Hitung uang fisik di laci dan cocokkan dengan sistem.</p>
                </div>
                <button onClick={() => setShowCloseModal(false)} className="text-neutral-400 hover:text-neutral-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCloseShift} className="space-y-3">
                <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/60 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500 font-medium">Modal Awal:</span>
                    <span className="font-bold">Rp {(currentShift.opening_cash || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 font-medium">Total Penjualan Tunai:</span>
                    <span className="font-bold text-emerald-600">+Rp {(currentShift.live_cash_sales || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 font-medium">Mutasi Bersih (In - Out):</span>
                    <span className="font-bold">
                      {((currentShift.total_cash_in || 0) - (currentShift.total_cash_out || 0)) >= 0 ? '+' : ''}
                      Rp {((currentShift.total_cash_in || 0) - (currentShift.total_cash_out || 0)).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-neutral-200 font-black text-sm">
                    <span className="text-neutral-900">Ekspektasi Kas Laci Sistem:</span>
                    <span className="text-neutral-900">Rp {(currentShift.expected_cash_drawer || 0).toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-600 block mb-1">
                    Hitung Fisik Kas Laci (Actual) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-neutral-400">Rp</span>
                    <input
                      type="number"
                      required
                      min={0}
                      step={100}
                      value={closingPhysicalCash}
                      onChange={(e) => setClosingPhysicalCash(parseInt(e.target.value) || 0)}
                      className="w-full text-base font-black pl-9 pr-3 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Live Discrepancy Alert */}
                <div className={`p-3 rounded-2xl flex items-center justify-between text-xs font-black ${
                  discrepancy === 0 ? 'bg-neutral-100 text-neutral-700' :
                  discrepancy > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  <span>Selisih Rekonsiliasi:</span>
                  <span>
                    {discrepancy === 0 ? 'Tepat Sesuai (Rp 0)' :
                     discrepancy > 0 ? `Lebih Rp ${discrepancy.toLocaleString('id-ID')}` :
                     `Kurang Rp ${Math.abs(discrepancy).toLocaleString('id-ID')}`}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-600 block mb-1">Catatan Penutupan</label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Uang fisik pas, laci sudah diserahkan ke kasir shift berikutnya"
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    className="w-full text-xs border border-neutral-200 rounded-xl p-2.5 bg-neutral-50 focus:bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setShowCloseModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white"
                  >
                    Konfirmasi Tutup Shift
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
