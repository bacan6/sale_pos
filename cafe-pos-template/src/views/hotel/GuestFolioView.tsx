import React, { useState, useEffect } from 'react';
import { 
  Plus, Printer, RefreshCw, 
  Utensils, Bed, Sparkles, DollarSign, FileText, ArrowLeft, X,
  ShoppingBag, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { hotelApi } from '../../services/hotelApi';
import { getStoredTenant, getStoredUser } from '../../services/api';
import type { HotelFolio, HotelBooking, HotelService } from '../../types/hotel';

interface GuestFolioViewProps {
  bookingId?: number | null;
  onBack?: () => void;
}

export const GuestFolioView: React.FC<GuestFolioViewProps> = ({ bookingId, onBack }) => {
  const [folio, setFolio] = useState<HotelFolio | null>(null);
  const [bookings, setBookings] = useState<HotelBooking[]>([]);
  const [services, setServices] = useState<HotelService[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<number>(bookingId || 0);
  const [loading, setLoading] = useState<boolean>(true);

  // Manual Add Item Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [itemCategory, setItemCategory] = useState<string>('laundry');
  const [itemDescription, setItemDescription] = useState<string>('');
  const [itemAmount, setItemAmount] = useState<number>(0);
  const [itemQty, setItemQty] = useState<number>(1);
  const [savingItem, setSavingItem] = useState<boolean>(false);

  // Service Catalog Picker Modal
  const [showServicePicker, setShowServicePicker] = useState<boolean>(false);
  const [selectedService, setSelectedService] = useState<HotelService | null>(null);
  const [serviceQty, setServiceQty] = useState<number>(1);
  const [serviceNotes, setServiceNotes] = useState<string>('');
  const [addingService, setAddingService] = useState<boolean>(false);

  // Settle Payment Modal
  const [showSettleModal, setShowSettleModal] = useState<boolean>(false);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleMethod, setSettleMethod] = useState<string>('cash');
  const [settleNotes, setSettleNotes] = useState<string>('');
  const [settling, setSettling] = useState<boolean>(false);

  // Deposit Refund State
  const [refunding, setRefunding] = useState<boolean>(false);

  // Invoice / Folio Print Preview Modal
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal'>('a4');

  const tenant = getStoredTenant();
  const user = getStoredUser();

  const fetchActiveBookings = async () => {
    try {
      const [bookingData, serviceList] = await Promise.all([
        hotelApi.getBookings(),
        hotelApi.getServices(),
      ]);
      setBookings(bookingData);
      setServices(serviceList.filter((s) => s.is_active));
      if (!selectedBookingId && bookingData.length > 0) {
        setSelectedBookingId(bookingData[0].id);
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

  const handleAddServiceToFolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folio || !selectedService) return;

    setAddingService(true);
    try {
      await hotelApi.addServiceToFolio(folio.id, {
        service_id: selectedService.id,
        quantity: serviceQty,
        notes: serviceNotes.trim() || undefined,
      });
      setShowServicePicker(false);
      setSelectedService(null);
      setServiceQty(1);
      setServiceNotes('');
      await fetchFolioData(selectedBookingId);
    } catch (err: any) {
      alert(err?.message || 'Gagal menambahkan layanan ke folio');
    } finally {
      setAddingService(false);
    }
  };

  const handleRefundDeposit = async () => {
    if (!folio) return;
    const excess = Math.abs(Number(folio.balance));
    if (!confirm(`Kembalikan sisa uang muka/deposit tamu sebesar Rp ${excess.toLocaleString('id-ID')}?`)) return;

    setRefunding(true);
    try {
      await hotelApi.refundDeposit(folio.id, {
        amount: excess,
        notes: 'Pengembalian sisa deposit saat check-out',
      });
      await fetchFolioData(selectedBookingId);
    } catch (err: any) {
      alert(err?.message || 'Gagal memproses refund deposit');
    } finally {
      setRefunding(false);
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
        return <Sparkles className="w-3.5 h-3.5 text-neutral-500" />;
    }
  };

  const renderA4Invoice = () => {
    if (!folio) return null;
    const hotelName = tenant?.name || 'Hotel & Resort PMS';
    const isPaid = Number(folio.balance) <= 0;
    const printDate = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

    return (
      <div className="font-sans text-neutral-900 bg-white">
        {/* Document Header */}
        <div className="flex justify-between items-start border-b-2 border-neutral-900 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bed className="w-6 h-6 text-amber-800" />
              <h1 className="text-xl font-black uppercase tracking-tight text-neutral-900">{hotelName}</h1>
            </div>
            <p className="text-xs text-neutral-600 font-medium">Sistem Pengelolaan Hotel & Resto PMS Terintegrasi</p>
            <p className="text-xs text-neutral-500">Layanan Front Desk & Reservasi 24 Jam • Bukti Resmi Folio Tamu</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">Official Invoice</span>
            <h2 className="text-base font-black text-neutral-900 leading-tight">GUEST FOLIO</h2>
            <div className="mt-1">
              <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase border ${
                isPaid 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                  : 'bg-rose-50 text-rose-700 border-rose-300'
              }`}>
                {isPaid ? 'LUNAS (SETTLED / PAID)' : 'BELUM LUNAS (OPEN BALANCE)'}
              </span>
            </div>
          </div>
        </div>

        {/* Guest & Reservation Grid */}
        <div className="grid grid-cols-2 gap-4 bg-neutral-50 rounded-xl p-4 border border-neutral-200 mb-5 text-xs">
          <div className="space-y-1.5">
            <div className="flex">
              <span className="w-28 text-neutral-500 font-medium">Nomor Folio:</span>
              <span className="font-bold text-neutral-900">{folio.folio_number}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-neutral-500 font-medium">No. Reservasi:</span>
              <span className="font-semibold text-neutral-800">{folio.booking_number || '-'}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-neutral-500 font-medium">Nama Tamu:</span>
              <span className="font-black text-neutral-900">{folio.guest_name}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-neutral-500 font-medium">No. Identitas:</span>
              <span className="font-medium text-neutral-700">{folio.id_card_type || 'KTP'}: {folio.id_card_number || '-'}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex">
              <span className="w-28 text-neutral-500 font-medium">Nomor Kamar:</span>
              <span className="font-black text-amber-800">Kamar #{folio.room_number}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-neutral-500 font-medium">Tipe Kamar:</span>
              <span className="font-semibold text-neutral-800">{folio.room_type_name}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-neutral-500 font-medium">Periode Inap:</span>
              <span className="font-medium text-neutral-800">
                {folio.check_in_date || '-'} s/d {folio.check_out_date || '-'}
              </span>
            </div>
            <div className="flex">
              <span className="w-28 text-neutral-500 font-medium">Waktu Cetak:</span>
              <span className="text-neutral-600">{printDate} (Kasir: {user?.full_name || user?.username || 'Front Desk'})</span>
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="mb-5 overflow-hidden rounded-xl border border-neutral-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-100 text-neutral-700 font-bold border-b border-neutral-200">
              <tr>
                <th className="py-2.5 px-3 w-8 text-center">#</th>
                <th className="py-2.5 px-3 w-28">Kategori</th>
                <th className="py-2.5 px-3">Rincian Transaksi / Tagihan</th>
                <th className="py-2.5 px-3 text-center w-12">Qty</th>
                <th className="py-2.5 px-3 text-right w-28">Biaya (Rp)</th>
                <th className="py-2.5 px-3 text-right w-28">Bayar (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {folio.items && folio.items.length > 0 ? (
                folio.items.map((it, idx) => {
                  const isPayment = it.category === 'payment';
                  return (
                    <tr key={it.id || idx}>
                      <td className="py-2.5 px-3 text-center text-neutral-400 font-medium">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-neutral-700 capitalize">
                        {it.category === 'pos_restaurant' ? 'F&B Resto POS' : it.category.replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-neutral-900">
                        {it.description}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-neutral-600">
                        {it.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-neutral-900">
                        {!isPayment ? Number(it.amount).toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        {isPayment ? Number(Math.abs(Number(it.amount))).toLocaleString('id-ID') : '-'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-neutral-400">
                    Belum ada transaksi pada folio ini
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Balance */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
          <div className="w-full sm:w-1/2 p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs">
            <h4 className="font-bold text-neutral-800 mb-1">Catatan & Kebijakan Hotel:</h4>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Semua biaya fasilitas kamar, pesanan Resto POS, dan layanan ekstra dicatat dalam folio ini.
              Kunci kamar fisik / kartu akses harap dikembalikan ke Front Desk saat check-out.
            </p>
          </div>

          <div className="w-full sm:w-1/2 max-w-xs ml-auto space-y-1.5 text-xs bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
            <div className="flex justify-between">
              <span className="text-neutral-600">Total Biaya (Charges):</span>
              <span className="font-bold text-neutral-900">Rp {Number(folio.total_charges).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Total Pembayaran Masuk:</span>
              <span className="font-bold text-emerald-700">Rp {Number(folio.total_payments).toLocaleString('id-ID')}</span>
            </div>
            <div className="border-t border-neutral-300 pt-1.5 flex justify-between items-baseline">
              <span className="font-black text-neutral-900">Sisa Tagihan (Saldo):</span>
              <span className={`text-sm font-black ${Number(folio.balance) > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                Rp {Number(folio.balance).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 pt-6 border-t border-dashed border-neutral-300 text-xs text-center">
          <div>
            <p className="text-neutral-500 font-medium mb-14">Tamu / Guest Signature,</p>
            <div className="border-b border-neutral-400 w-44 mx-auto mb-1"></div>
            <p className="font-bold text-neutral-800">({folio.guest_name})</p>
          </div>
          <div>
            <p className="text-neutral-500 font-medium mb-14">Front Desk / Cashier,</p>
            <div className="border-b border-neutral-400 w-44 mx-auto mb-1"></div>
            <p className="font-bold text-neutral-800">({user?.full_name || user?.username || 'Petugas Front Desk'})</p>
          </div>
        </div>
      </div>
    );
  };

  const renderThermalReceipt = () => {
    if (!folio) return null;
    const hotelName = tenant?.name || 'Hotel & Resort PMS';
    const printDate = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });

    return (
      <div className="max-w-[80mm] mx-auto p-4 bg-white text-neutral-900 font-mono text-[11px] leading-relaxed border border-dashed border-neutral-300 rounded-xl shadow-xs">
        <div className="text-center pb-2 border-b border-dashed border-neutral-400 mb-2">
          <h2 className="font-black text-sm uppercase">{hotelName}</h2>
          <p className="text-[10px] text-neutral-600">STRUK TAGIHAN FOLIO HOTEL</p>
          <p className="text-[9px] text-neutral-500">{printDate}</p>
        </div>

        <div className="space-y-1 mb-2 text-[10px]">
          <div className="flex justify-between">
            <span>No. Folio:</span>
            <span className="font-bold">{folio.folio_number}</span>
          </div>
          <div className="flex justify-between">
            <span>Kamar:</span>
            <span className="font-bold">#{folio.room_number} ({folio.room_type_name})</span>
          </div>
          <div className="flex justify-between">
            <span>Tamu:</span>
            <span className="font-bold">{folio.guest_name}</span>
          </div>
        </div>

        <div className="border-t border-b border-dashed border-neutral-400 py-2 mb-2 space-y-1.5">
          {folio.items?.map((it, idx) => {
            const isPay = it.category === 'payment';
            return (
              <div key={idx} className="flex justify-between items-start text-[10px]">
                <div className="flex-1 pr-2">
                  <div className="font-bold">{it.description}</div>
                  <div className="text-[9px] text-neutral-500">{it.quantity} x @ Rp {Math.abs(Number(it.amount) / (it.quantity || 1)).toLocaleString('id-ID')}</div>
                </div>
                <div className={`font-bold text-right ${isPay ? 'text-emerald-700' : 'text-neutral-900'}`}>
                  {isPay ? '-' : ''}Rp {Math.abs(Number(it.amount)).toLocaleString('id-ID')}
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-1 text-[11px] font-bold">
          <div className="flex justify-between">
            <span>Total Tagihan:</span>
            <span>Rp {Number(folio.total_charges).toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-emerald-700">
            <span>Total Terbayar:</span>
            <span>Rp {Number(folio.total_payments).toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-base border-t border-dashed border-neutral-400 pt-1">
            <span>Sisa Saldo:</span>
            <span className={Number(folio.balance) > 0 ? 'text-rose-600' : 'text-emerald-700'}>
              Rp {Number(folio.balance).toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        <div className="text-center pt-4 text-[9px] text-neutral-500">
          *** TERIMA KASIH ATAS KUNJUNGAN ANDA ***
        </div>
      </div>
    );
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
            <p className="text-xs text-neutral-500">Item tagihan sewa kamar, layanan add-on hotel, pesanan F&B resto, dan pelunasan</p>
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

      {/* Main Content Area */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-neutral-400 font-medium text-xs">
          Memuat rincian folio...
        </div>
      ) : !folio ? (
        <div className="flex-1 flex items-center justify-center text-neutral-400 font-medium text-xs">
          Folio tidak ditemukan
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0 overflow-hidden">
          {/* Left Column: Folio Items List */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 shadow-xs flex flex-col min-h-0 overflow-hidden">
            <div className="p-4 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-neutral-500">Folio ID:</span>
                <span className="font-black text-xs text-neutral-900 bg-neutral-100 px-2.5 py-0.5 rounded-lg border border-neutral-200">
                  {folio.folio_number}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  folio.status === 'settled' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {folio.status}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowServicePicker(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Tambah Layanan Hotel</span>
                </button>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Item Manual</span>
                </button>
              </div>
            </div>

            {/* Table of Folio Items */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 sticky top-0 z-10 font-bold text-neutral-600">
                  <tr>
                    <th className="py-2.5 px-4 w-10">Tipe</th>
                    <th className="py-2.5 px-4">Deskripsi Transaksi</th>
                    <th className="py-2.5 px-4 text-center w-14">Qty</th>
                    <th className="py-2.5 px-4 text-right w-28">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium">
                  {folio.items?.map((it) => {
                    const isPay = it.category === 'payment';
                    return (
                      <tr key={it.id} className="hover:bg-neutral-50/70 transition-all">
                        <td className="py-3 px-4 text-center">
                          <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center">
                            {getCategoryIcon(it.category)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-neutral-900">{it.description}</div>
                          <div className="text-[10px] text-neutral-400 capitalize">{it.category.replace('_', ' ')} • {it.created_at}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-neutral-700">
                          {it.quantity}
                        </td>
                        <td className={`py-3 px-4 text-right font-bold text-xs ${isPay ? 'text-emerald-700' : 'text-neutral-900'}`}>
                          {isPay ? '-' : ''}Rp {Math.abs(Number(it.amount)).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Financial Recap & Actions */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Guest Card */}
              <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs">
                <div className="text-[10px] uppercase font-bold text-neutral-400 mb-1">Informasi Kamar & Tamu</div>
                <div className="font-black text-neutral-900 text-sm">{folio.guest_name}</div>
                <div className="text-xs text-amber-700 font-bold mt-0.5">
                  Kamar #{folio.room_number} • {folio.room_type_name}
                </div>
                <div className="text-[11px] text-neutral-500 mt-2 space-y-0.5">
                  <div>Check-in: <strong>{folio.check_in_date}</strong></div>
                  <div>Check-out: <strong>{folio.check_out_date}</strong></div>
                  <div>Kontak: {folio.guest_phone || '-'}</div>
                </div>
              </div>

              {/* Balance Summary Card */}
              <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs space-y-2.5 text-xs">
                <div className="text-[10px] uppercase font-bold text-neutral-400">Ringkasan Keuangan</div>

                <div className="flex justify-between">
                  <span className="text-neutral-600">Total Biaya (Charges):</span>
                  <span className="font-bold text-neutral-900">Rp {Number(folio.total_charges).toLocaleString('id-ID')}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-neutral-600">Total Pembayaran Masuk:</span>
                  <span className="font-bold text-emerald-700">Rp {Number(folio.total_payments).toLocaleString('id-ID')}</span>
                </div>

                <div className="border-t border-neutral-200 pt-2 flex justify-between items-baseline">
                  <span className="font-black text-neutral-900">Sisa Tagihan (Saldo):</span>
                  <span className={`text-base font-black ${Number(folio.balance) > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    Rp {Number(folio.balance).toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Deposit Refund Warning Banner if excess payments */}
                {Number(folio.balance) < 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1.5 mt-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Kelebihan Uang Muka / Deposit</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Tamu memiliki sisa kredit sebesar <strong>Rp {Math.abs(Number(folio.balance)).toLocaleString('id-ID')}</strong>.
                    </p>
                    <button
                      onClick={handleRefundDeposit}
                      disabled={refunding}
                      className="w-full py-1.5 px-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold text-xs transition-all shadow-xs"
                    >
                      {refunding ? 'Memproses...' : 'Kembalikan Sisa Deposit (Refund)'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs space-y-2">
              <button
                onClick={() => setShowSettleModal(true)}
                disabled={Number(folio.balance) <= 0}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Pelunasan / Catat Pembayaran</span>
              </button>

              <button
                onClick={() => setShowInvoiceModal(true)}
                className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Lembar Folio / Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Catalog Picker Drawer Modal */}
      {showServicePicker && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 text-amber-700 rounded-xl">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-neutral-900 leading-tight">Pilih dari Katalog Layanan Hotel</h3>
                  <p className="text-[11px] text-neutral-500">1-Klik posting layanan ekstra langsung ke folio tamu</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowServicePicker(false);
                  setSelectedService(null);
                }}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddServiceToFolio} className="flex-1 flex flex-col min-h-0 pt-3 text-xs">
              <div className="flex-1 overflow-auto space-y-2 pr-1">
                {services.map((srv) => {
                  const isSelected = selectedService?.id === srv.id;
                  return (
                    <div
                      key={srv.id}
                      onClick={() => setSelectedService(srv)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20'
                          : 'bg-white border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.2 bg-neutral-100 text-neutral-600 rounded text-[9px] font-black uppercase">
                            {srv.code}
                          </span>
                          <span className="font-bold text-neutral-900 text-xs">{srv.name}</span>
                        </div>
                        {srv.description && (
                          <div className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">{srv.description}</div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-black text-amber-700 text-xs">
                          Rp {srv.price.toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] text-neutral-400 font-medium">per {srv.unit}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedService && (
                <div className="pt-3 border-t border-neutral-200 mt-3 space-y-3 shrink-0">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">Jumlah (Qty)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={serviceQty}
                        onChange={(e) => setServiceQty(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-1.5 font-bold text-neutral-900 text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">Total Biaya</label>
                      <div className="w-full bg-neutral-100 border border-neutral-200 rounded-xl px-3 py-1.5 font-black text-amber-700 text-sm text-center">
                        Rp {(serviceQty * selectedService.price).toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">Catatan Tambahan (Opsional)</label>
                    <input
                      type="text"
                      placeholder="Contoh: Kamar lantai 2 atau nama pemesan..."
                      value={serviceNotes}
                      onChange={(e) => setServiceNotes(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-1.5 font-medium"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 mt-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowServicePicker(false)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!selectedService || addingService}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-xs disabled:opacity-50"
                >
                  {addingService ? 'Memproses...' : 'Posting ke Folio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200">
            <h3 className="text-base font-black text-neutral-900 mb-3">Tambah Biaya Ekstra ke Kamar</h3>
            <form onSubmit={handleAddItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">Kategori Biaya</label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 outline-none font-semibold text-neutral-800"
                >
                  <option value="laundry">Laundry</option>
                  <option value="minibar">Mini Bar</option>
                  <option value="extra_bed">Extra Bed</option>
                  <option value="amenity">Tambahan Amenities</option>
                  <option value="penalty">Penalti / Surcharge</option>
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
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 outline-none font-medium"
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
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Jumlah (Qty)</label>
                  <input
                    type="number"
                    min="1"
                    value={itemQty}
                    onChange={(e) => setItemQty(Number(e.target.value))}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 outline-none font-medium"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200">
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
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 font-black text-base text-amber-700"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Metode Pembayaran</label>
                <select
                  value={settleMethod}
                  onChange={(e) => setSettleMethod(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 font-semibold text-neutral-800"
                >
                  <option value="cash">Tunai (Cash)</option>
                  <option value="card">Kartu Debit / Kredit</option>
                  <option value="qris">QRIS</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Catatan Pembayaran (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: No. Ref Kartu / Bukti Transfer"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 font-medium"
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

      {/* Official Folio / Invoice Preview Modal */}
      {showInvoiceModal && folio && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full my-auto shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-neutral-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 bg-neutral-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-600/10 text-amber-700 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-neutral-900 leading-tight">Pratinjau Lembar Folio & Invoice Tamu</h3>
                  <p className="text-[11px] text-neutral-500">Pilih format cetak: Formal A4 atau Struk Thermal 80mm</p>
                </div>
              </div>

              {/* Format Toggle & Print */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-neutral-200 p-1 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setPrintFormat('a4')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      printFormat === 'a4' ? 'bg-white shadow-xs text-neutral-900 font-black' : 'text-neutral-600'
                    }`}
                  >
                    Format Formal A4
                  </button>
                  <button
                    onClick={() => setPrintFormat('thermal')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      printFormat === 'thermal' ? 'bg-white shadow-xs text-neutral-900 font-black' : 'text-neutral-600'
                    }`}
                  >
                    Struk Thermal 80mm
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                >
                  <Printer className="w-4 h-4" /> Cetak (Print / PDF)
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="p-2 hover:bg-neutral-200 text-neutral-500 rounded-xl transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-neutral-100">
              <div className="bg-white rounded-2xl shadow-xs border border-neutral-300 p-6 md:p-8 max-w-[210mm] mx-auto">
                {printFormat === 'a4' ? renderA4Invoice() : renderThermalReceipt()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
