import React, { useState, useEffect } from 'react';
import { 
  Plus, Printer, RefreshCw, 
  Utensils, Bed, Sparkles, DollarSign, FileText, ArrowLeft
} from 'lucide-react';
import { hotelApi } from '../../services/hotelApi';
import type { HotelFolio, HotelBooking } from '../../types/hotel';

interface GuestFolioViewProps {
  bookingId?: number | null;
  onBack?: () => void;
}

export const GuestFolioView: React.FC<GuestFolioViewProps> = ({ bookingId, onBack }) => {
  const [folio, setFolio] = useState<HotelFolio | null>(null);
  const [bookings, setBookings] = useState<HotelBooking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<number>(bookingId || 0);
  const [loading, setLoading] = useState<boolean>(true);

  // Add Item Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [itemCategory, setItemCategory] = useState<string>('laundry');
  const [itemDescription, setItemDescription] = useState<string>('');
  const [itemAmount, setItemAmount] = useState<number>(0);
  const [itemQty, setItemQty] = useState<number>(1);
  const [savingItem, setSavingItem] = useState<boolean>(false);

  // Settle Payment Modal
  const [showSettleModal, setShowSettleModal] = useState<boolean>(false);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleMethod, setSettleMethod] = useState<string>('cash');
  const [settleNotes, setSettleNotes] = useState<string>('');
  const [settling, setSettling] = useState<boolean>(false);

  const fetchActiveBookings = async () => {
    try {
      const data = await hotelApi.getBookings();
      setBookings(data);
      if (!selectedBookingId && data.length > 0) {
        setSelectedBookingId(data[0].id);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchFolioData = async (bId: number) => {
    if (!bId) return;
    try {
      setLoading(true);
      const data = await hotelApi.getFolio(bId);
      setFolio(data);
      setSettleAmount(data.balance > 0 ? data.balance : 0);
    } catch (err: any) {
      alert(err.message || 'Gagal memuat folio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveBookings();
  }, []);

  useEffect(() => {
    if (selectedBookingId) {
      fetchFolioData(selectedBookingId);
    }
  }, [selectedBookingId]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folio || !itemDescription || itemAmount <= 0) return;

    try {
      setSavingItem(true);
      await hotelApi.addFolioItem(folio.id, {
        category: itemCategory,
        description: itemDescription,
        amount: itemAmount,
        quantity: itemQty,
      });
      setShowAddModal(false);
      setItemDescription('');
      setItemAmount(0);
      setItemQty(1);
      await fetchFolioData(selectedBookingId);
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan tagihan');
    } finally {
      setSavingItem(false);
    }
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folio || settleAmount <= 0) return;

    try {
      setSettling(true);
      await hotelApi.settleFolio(folio.id, {
        amount: settleAmount,
        method: settleMethod,
        notes: settleNotes,
      });
      setShowSettleModal(false);
      setSettleNotes('');
      await fetchFolioData(selectedBookingId);
    } catch (err: any) {
      alert(err.message || 'Gagal memproses pembayaran');
    } finally {
      setSettling(false);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'pos_restaurant':
        return <Utensils className="w-3.5 h-3.5 text-amber-600" />;
      case 'room_charge':
        return <Bed className="w-3.5 h-3.5 text-blue-600" />;
      case 'payment':
        return <DollarSign className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-purple-600" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-100 overflow-hidden p-4 md:p-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-neutral-200 mb-4 shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-neutral-100 rounded-xl text-neutral-600 transition-all mr-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-amber-600/10 text-amber-700 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-neutral-900 leading-tight">Folio & Tagihan Tamu (Guest Ledger)</h1>
            <p className="text-xs text-neutral-500">Item tagihan sewa kamar, pesanan F&B cafe terintegrasi, dan pembayaran</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Booking selector */}
          <select
            value={selectedBookingId}
            onChange={(e) => setSelectedBookingId(Number(e.target.value))}
            className="bg-neutral-100 border border-neutral-200 text-xs font-bold text-neutral-800 rounded-xl px-3 py-2 outline-none cursor-pointer"
          >
            {bookings.map(b => (
              <option key={b.id} value={b.id}>
                Kamar #{b.room_number} - {b.guest_name} ({b.booking_number})
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchFolioData(selectedBookingId)}
            className="p-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl transition-all"
            title="Refresh Folio"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Folio Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center bg-white rounded-2xl border border-neutral-200 text-neutral-400 text-sm">
          Memuat rincian folio...
        </div>
      ) : !folio ? (
        <div className="flex-1 flex items-center justify-center bg-white rounded-2xl border border-neutral-200 text-neutral-400 text-sm">
          Pilih data reservasi untuk melihat rincian folio
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden min-h-0">
          
          {/* Left/Main: Folio Breakdown Table */}
          <div className="flex-1 bg-white rounded-2xl border border-neutral-200 shadow-xs flex flex-col overflow-hidden">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Nomor Folio</span>
                <h2 className="text-sm font-black text-neutral-900">{folio.folio_number}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Biaya Ekstra
                </button>
                <button
                  onClick={() => setShowSettleModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  <DollarSign className="w-3.5 h-3.5" /> Bayar / Settle
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 sticky top-0 font-bold text-neutral-600">
                  <tr>
                    <th className="py-2.5 px-4">Kategori</th>
                    <th className="py-2.5 px-4">Deskripsi Tagihan</th>
                    <th className="py-2.5 px-4 text-center">Qty</th>
                    <th className="py-2.5 px-4 text-right">Nominal (Rp)</th>
                    <th className="py-2.5 px-4 text-right">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium">
                  {folio.items && folio.items.length > 0 ? (
                    folio.items.map((item) => {
                      const isPayment = item.category === 'payment';
                      const isPos = item.category === 'pos_restaurant';

                      return (
                        <tr key={item.id} className="hover:bg-neutral-50/70 transition-all">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {getCategoryIcon(item.category)}
                              <span className="capitalize font-semibold text-neutral-700">
                                {isPos ? 'F&B Cafe (POS)' : item.category.replace('_', ' ')}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-neutral-900">
                            {item.description}
                            {isPos && (
                              <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                Charge to Room
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-neutral-600">
                            {item.quantity}
                          </td>
                          <td className={`py-3 px-4 text-right font-black whitespace-nowrap ${isPayment ? 'text-emerald-600' : 'text-neutral-900'}`}>
                            {isPayment ? '-' : ''}Rp {Math.abs(Number(item.amount)).toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-4 text-right text-[11px] text-neutral-400 whitespace-nowrap">
                            {item.created_at ? item.created_at.slice(0, 16) : '-'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-neutral-400">
                        Belum ada item tagihan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Summary Card */}
          <div className="w-full md:w-80 bg-white rounded-2xl border border-neutral-200 shadow-xs p-5 flex flex-col justify-between shrink-0">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Ringkasan Tagihan</span>
              <h3 className="text-lg font-black text-neutral-900 mb-1">Kamar #{folio.room_number}</h3>
              <p className="text-xs text-neutral-500 mb-4">{folio.guest_name} • {folio.room_type_name}</p>

              <div className="space-y-3 border-t border-neutral-100 pt-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Total Biaya / Charges:</span>
                  <span className="font-bold text-neutral-900">Rp {Number(folio.total_charges).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Total Pembayaran Masuk:</span>
                  <span className="font-bold text-emerald-600">Rp {Number(folio.total_payments).toLocaleString('id-ID')}</span>
                </div>

                <div className="border-t border-neutral-200 pt-3 flex justify-between items-baseline">
                  <span className="text-xs font-bold text-neutral-700">Sisa Tagihan (Saldo):</span>
                  <span className={`text-base font-black ${folio.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    Rp {Number(folio.balance).toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100 text-xs">
                  <div className="flex justify-between text-neutral-500 mb-1">
                    <span>Status Folio:</span>
                    <span className="font-bold uppercase text-neutral-800">{folio.status}</span>
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    {folio.balance <= 0 ? '✓ Semua tagihan sudah lunas' : 'Belum lunas, perlu diselesaikan saat check-out'}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-neutral-100">
              <button
                onClick={() => setShowSettleModal(true)}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <DollarSign className="w-4 h-4" /> Proses Pembayaran Masuk
              </button>
              <button
                onClick={() => window.print()}
                className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Cetak Lembar Folio / Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Extra Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-base font-black text-neutral-900 mb-3">Tambah Biaya Ekstra ke Kamar</h3>
            <form onSubmit={handleAddItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">Kategori Biaya</label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-semibold text-neutral-800"
                >
                  <option value="laundry">Laundry</option>
                  <option value="minibar">Mini Bar</option>
                  <option value="extra_bed">Extra Bed</option>
                  <option value="amenity">Tambahan Amenities</option>
                  <option value="damage">Ganti Rugi Kerusakan</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Deskripsi Item *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Cuci Kemeja 2 Pcs / Keripik Mini Bar"
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Harga Satuan (Rp) *</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    required
                    value={itemAmount}
                    onChange={(e) => setItemAmount(Number(e.target.value))}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Jumlah (Qty)</label>
                  <input
                    type="number"
                    min="1"
                    value={itemQty}
                    onChange={(e) => setItemQty(Number(e.target.value))}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingItem}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold"
                >
                  {savingItem ? 'Menyimpan...' : 'Tambahkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Payment Modal */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-base font-black text-neutral-900 mb-3">Catat Pembayaran Masuk</h3>
            <form onSubmit={handleSettle} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">Nominal Pembayaran (Rp) *</label>
                <input
                  type="number"
                  min="1000"
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(Number(e.target.value))}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-black text-base text-amber-700"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Metode Pembayaran</label>
                <select
                  value={settleMethod}
                  onChange={(e) => setSettleMethod(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-semibold text-neutral-800"
                >
                  <option value="cash">Tunai (Cash)</option>
                  <option value="card">Kartu Debit / Kredit</option>
                  <option value="qris">QRIS</option>
                  <option value="transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Catatan Pembayaran (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: No. Ref Kartu / Bukti Transfer"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={settling}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  {settling ? 'Memproses...' : 'Konfirmasi Bayar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
