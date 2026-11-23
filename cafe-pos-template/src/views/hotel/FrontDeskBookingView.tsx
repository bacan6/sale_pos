import React, { useState, useEffect } from 'react';
import { 
  UserCheck, Plus, Search, 
  XCircle, RefreshCw, ArrowRightLeft, CalendarPlus, 
  ShieldAlert, Clock
} from 'lucide-react';
import { hotelApi } from '../../services/hotelApi';
import type { HotelBooking, HotelRoom } from '../../types/hotel';

interface FrontDeskBookingViewProps {
  onOpenFolio: (bookingId: number) => void;
  preSelectedRoom?: HotelRoom | null;
}

export const FrontDeskBookingView: React.FC<FrontDeskBookingViewProps> = ({ onOpenFolio, preSelectedRoom }) => {
  const [bookings, setBookings] = useState<HotelBooking[]>([]);
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // New Walk-in / Booking modal state
  const [showModal, setShowModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [blacklistWarning, setBlacklistWarning] = useState<string | null>(null);
  const [overrideBlacklist, setOverrideBlacklist] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    room_id: preSelectedRoom ? preSelectedRoom.id : 0,
    guest_name: '',
    id_card_type: 'KTP',
    id_card_number: '',
    phone: '',
    email: '',
    source: 'walk_in',
    ota_reference_code: '',
    check_in_date: new Date().toISOString().split('T')[0],
    check_out_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    deposit_amount: 0,
    notes: '',
    auto_check_in: true,
  });

  // Room Transfer Modal
  const [transferModalBooking, setTransferModalBooking] = useState<HotelBooking | null>(null);
  const [transferTargetRoomId, setTransferTargetRoomId] = useState<number>(0);
  const [transferReason, setTransferReason] = useState<string>('Permintaan tamu pindah kamar');
  const [transferApplyRate, setTransferApplyRate] = useState<boolean>(false);
  const [transferring, setTransferring] = useState<boolean>(false);

  // Extend Stay Modal
  const [extendModalBooking, setExtendModalBooking] = useState<HotelBooking | null>(null);
  const [extraNights, setExtraNights] = useState<number>(1);
  const [extending, setExtending] = useState<boolean>(false);

  // Early/Late Charge Modal
  const [surchargeModalBooking, setSurchargeModalBooking] = useState<HotelBooking | null>(null);
  const [surchargeType, setSurchargeType] = useState<'late_checkout' | 'early_checkin'>('late_checkout');
  const [surchargeAmount, setSurchargeAmount] = useState<number>(100000);
  const [surchargeNotes, setSurchargeNotes] = useState<string>('Late check-out s/d pukul 16:00');
  const [chargingSurcharge, setChargingSurcharge] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bookingData, roomData] = await Promise.all([
        hotelApi.getBookings(),
        hotelApi.getRooms(),
      ]);
      setBookings(bookingData);
      setRooms(roomData);
    } catch (err: any) {
      alert(err.message || 'Gagal mengambil data reservasi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (preSelectedRoom) {
      setFormData(prev => ({ ...prev, room_id: preSelectedRoom.id, auto_check_in: true }));
      setShowModal(true);
    }
  }, [preSelectedRoom]);

  const handleCheckIn = async (bookingId: number) => {
    if (!confirm('Lanjutkan proses Check-In tamu untuk kamar ini?')) return;
    try {
      await hotelApi.checkIn(bookingId);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal memproses check-in');
    }
  };

  const handleCheckOut = async (booking: HotelBooking) => {
    if (booking.balance && booking.balance > 0) {
      alert(`Tagihan kamar belum lunas! Masih ada sisa saldo Rp ${Number(booking.balance).toLocaleString('id-ID')}. Selesaikan pembayaran di Folio terlebih dahulu.`);
      onOpenFolio(booking.id);
      return;
    }

    if (!confirm(`Proses Check-Out untuk kamar #${booking.room_number}? Status kamar akan berubah ke Vacant Dirty.`)) return;
    try {
      await hotelApi.checkOut(booking.id);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal memproses check-out');
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan reservasi ini?')) return;
    try {
      await hotelApi.cancelBooking(bookingId);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal membatalkan reservasi');
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.room_id || !formData.guest_name || !formData.id_card_number) {
      alert('Pilih kamar, isi nama tamu dan nomor identitas.');
      return;
    }

    try {
      setSubmitting(true);
      await hotelApi.createBooking({
        ...formData,
        override_blacklist: overrideBlacklist,
      });
      setShowModal(false);
      setBlacklistWarning(null);
      setOverrideBlacklist(false);
      await fetchData();
      setFormData({
        room_id: 0,
        guest_name: '',
        id_card_type: 'KTP',
        id_card_number: '',
        phone: '',
        email: '',
        source: 'walk_in',
        ota_reference_code: '',
        check_in_date: new Date().toISOString().split('T')[0],
        check_out_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        deposit_amount: 0,
        notes: '',
        auto_check_in: true,
      });
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('PERINGATAN BLACKLIST')) {
        setBlacklistWarning(msg);
      } else {
        alert(msg || 'Gagal membuat reservasi');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferModalBooking || transferTargetRoomId <= 0) return;

    setTransferring(true);
    try {
      await hotelApi.transferRoom(transferModalBooking.id, {
        target_room_id: transferTargetRoomId,
        reason: transferReason,
        apply_new_rate: transferApplyRate,
      });
      setTransferModalBooking(null);
      await fetchData();
    } catch (err: any) {
      alert(err?.message || 'Gagal memindahkan kamar');
    } finally {
      setTransferring(false);
    }
  };

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendModalBooking || extraNights <= 0) return;

    setExtending(true);
    try {
      await hotelApi.extendStay(extendModalBooking.id, extraNights);
      setExtendModalBooking(null);
      await fetchData();
    } catch (err: any) {
      alert(err?.message || 'Gagal memperpanjang masa menginap');
    } finally {
      setExtending(false);
    }
  };

  const handleSurchargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surchargeModalBooking || surchargeAmount <= 0) return;

    setChargingSurcharge(true);
    try {
      await hotelApi.addEarlyLateCharge(surchargeModalBooking.id, {
        type: surchargeType,
        amount: surchargeAmount,
        notes: surchargeNotes,
      });
      setSurchargeModalBooking(null);
      await fetchData();
    } catch (err: any) {
      alert(err?.message || 'Gagal menambahkan surcharge');
    } finally {
      setChargingSurcharge(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchSearch = 
      b.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.booking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.room_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.guest_phone && b.guest_phone.includes(searchQuery));
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getSourceBadge = (source: string, otaRef?: string) => {
    switch (source) {
      case 'ota_traveloka':
        return <span className="bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">Traveloka {otaRef && `(${otaRef})`}</span>;
      case 'ota_agoda':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">Agoda {otaRef && `(${otaRef})`}</span>;
      case 'ota_booking_com':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">Booking.com {otaRef && `(${otaRef})`}</span>;
      case 'direct_web':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">Direct Web</span>;
      default:
        return <span className="bg-neutral-100 text-neutral-700 border border-neutral-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">Walk-in</span>;
    }
  };

  const availableCleanRooms = rooms.filter(
    (r) => ['vacant_clean', 'inspected'].includes(r.status) && !r.active_booking_id
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-100 overflow-hidden p-4 md:p-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-neutral-200 mb-4 shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-amber-600/10 text-amber-700 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-neutral-900 leading-tight">Front Desk & Reservasi Tamu</h1>
            <p className="text-xs text-neutral-500">Kelola check-in, check-out, pindah kamar, extend stay, dan tagihan folio</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Reservasi / Walk-in Baru
          </button>
          <button
            onClick={fetchData}
            className="p-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl transition-all"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-3 shadow-xs border border-neutral-200 mb-4 shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-neutral-50 rounded-xl px-3 py-1.5 border border-neutral-200">
          <Search className="w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari nama tamu, no. booking, kamar, atau telp..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-xs text-neutral-800 placeholder-neutral-400 w-full outline-none font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-neutral-100 border-none text-xs font-semibold text-neutral-700 rounded-xl px-3 py-2 outline-none cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="checked_in">Checked-In (Sedang Menginap)</option>
            <option value="reserved">Reserved (Akan Datang)</option>
            <option value="checked_out">Checked-Out (Selesai)</option>
            <option value="cancelled">Cancelled (Dibatalkan)</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="flex-1 bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 sticky top-0 z-10 font-bold text-neutral-600">
              <tr>
                <th className="py-3 px-4">No. Booking</th>
                <th className="py-3 px-4">Tamu & VIP</th>
                <th className="py-3 px-4">Kamar & Tipe</th>
                <th className="py-3 px-4">Sumber Booking</th>
                <th className="py-3 px-4">Periode Menginap</th>
                <th className="py-3 px-4">Total & Saldo</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi Operasional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-neutral-400">
                    Memuat data reservasi...
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-neutral-400">
                    Tidak ada reservasi yang sesuai filter
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-neutral-50/70 transition-all">
                    <td className="py-3 px-4 font-bold text-neutral-900 whitespace-nowrap">
                      {b.booking_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-neutral-900">{b.guest_name}</span>
                        {b.vip_tier && b.vip_tier !== 'regular' && (
                          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-md text-[9px] font-black uppercase">
                            VIP
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400">{b.guest_phone || '-'} • {b.id_card_number}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-amber-700">Kamar #{b.room_number}</div>
                      <div className="text-[11px] text-neutral-500">{b.room_type_name} (Lt {b.floor})</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getSourceBadge(b.source, b.ota_reference_code)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-neutral-800">{b.check_in_date} → {b.check_out_date}</div>
                      <div className="text-[11px] text-neutral-400">{b.night_count} Malam</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-neutral-900">Rp {Number(b.total_amount).toLocaleString('id-ID')}</div>
                      <div className={`text-[11px] font-semibold ${b.folio_balance && b.folio_balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {b.folio_balance && b.folio_balance > 0 ? `Sisa: Rp ${Number(b.folio_balance).toLocaleString('id-ID')}` : 'Lunas'}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        b.status === 'checked_in' ? 'bg-blue-100 text-blue-700' :
                        b.status === 'reserved' ? 'bg-amber-100 text-amber-700' :
                        b.status === 'checked_out' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-neutral-100 text-neutral-500'
                      }`}>
                        {b.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* Check-In */}
                        {b.status === 'reserved' && (
                          <button
                            onClick={() => handleCheckIn(b.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                            title="Proses Check-In"
                          >
                            Check-In
                          </button>
                        )}

                        {/* Front Desk v2 Operational Actions for checked_in */}
                        {b.status === 'checked_in' && (
                          <>
                            <button
                              onClick={() => {
                                setTransferModalBooking(b);
                                setTransferTargetRoomId(0);
                                setTransferReason('Permintaan tamu pindah kamar');
                                setTransferApplyRate(false);
                              }}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1"
                              title="Pindah Kamar (Room Transfer)"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                              <span>Pindah</span>
                            </button>

                            <button
                              onClick={() => {
                                setExtendModalBooking(b);
                                setExtraNights(1);
                              }}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1"
                              title="Perpanjang Menginap (+Malam)"
                            >
                              <CalendarPlus className="w-3 h-3" />
                              <span>+Malam</span>
                            </button>

                            <button
                              onClick={() => {
                                setSurchargeModalBooking(b);
                                setSurchargeAmount(100000);
                                setSurchargeNotes('Late check-out s/d pukul 16:00');
                              }}
                              className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1"
                              title="Surcharge / Denda"
                            >
                              <Clock className="w-3 h-3" />
                              <span>Surcharge</span>
                            </button>

                            <button
                              onClick={() => handleCheckOut(b)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                              title="Proses Check-Out"
                            >
                              Check-Out
                            </button>
                          </>
                        )}

                        {/* View Folio */}
                        <button
                          onClick={() => onOpenFolio(b.id)}
                          className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-bold transition-all"
                          title="Buka Folio Tagihan"
                        >
                          Folio
                        </button>

                        {/* Cancel */}
                        {b.status === 'reserved' && (
                          <button
                            onClick={() => handleCancelBooking(b.id)}
                            className="p-1 hover:bg-rose-50 text-rose-600 rounded-lg transition-all"
                            title="Batalkan Reservasi"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Booking / Walk-in Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto border border-neutral-200">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
              <div>
                <span className="text-[11px] font-extrabold uppercase text-amber-600 tracking-wider">Reservasi Baru</span>
                <h3 className="text-lg font-black text-neutral-900">Formulir Walk-In & Reservasi Hotel</h3>
              </div>
              <button 
                onClick={() => {
                  setShowModal(false);
                  setBlacklistWarning(null);
                }}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Blacklist Alert Modal */}
            {blacklistWarning && (
              <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded-2xl text-red-900 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 font-black text-xs text-red-800">
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                  <span>PERINGATAN RESIKO: TAMU DAFTAR HITAM</span>
                </div>
                <p className="text-xs font-semibold leading-relaxed">
                  {blacklistWarning}
                </p>
                <div className="pt-2 border-t border-red-200 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="confirm_override"
                    checked={overrideBlacklist}
                    onChange={(e) => setOverrideBlacklist(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="confirm_override" className="text-xs font-black text-red-900 cursor-pointer">
                    Saya berwenang & menyetujui override reservasi untuk tamu ini
                  </label>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitBooking} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">Pilih Kamar *</label>
                <select
                  required
                  value={formData.room_id}
                  onChange={(e) => setFormData({ ...formData, room_id: Number(e.target.value) })}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-semibold text-neutral-800"
                >
                  <option value={0}>-- Pilih Unit Kamar --</option>
                  {rooms.map((r) => {
                    const isOccupied = !emptyOrNull(r.active_booking_id);
                    return (
                      <option 
                        key={r.id} 
                        value={r.id} 
                        disabled={isOccupied}
                      >
                        Kamar #{r.room_number} - {r.room_type_name} (Lt {r.floor}) • {r.status.toUpperCase()} {isOccupied ? '(Terisi)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Nama Lengkap Tamu *</label>
                <input
                  type="text"
                  required
                  placeholder="Nama sesuai KTP/Paspor"
                  value={formData.guest_name}
                  onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">No. Handphone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="08xxxxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Email Tamu</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Jenis ID *</label>
                  <select
                    value={formData.id_card_type}
                    onChange={(e) => setFormData({ ...formData, id_card_type: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-2 py-2 outline-none font-semibold text-neutral-800"
                  >
                    <option value="KTP">KTP</option>
                    <option value="Passport">Passport</option>
                    <option value="SIM">SIM</option>
                    <option value="Other">Lainnya</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-neutral-700 mb-1">Nomor Identitas *</label>
                  <input
                    type="text"
                    required
                    placeholder="No. KTP / Paspor"
                    value={formData.id_card_number}
                    onChange={(e) => setFormData({ ...formData, id_card_number: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Sumber Pemesanan</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-semibold text-neutral-800"
                  >
                    <option value="walk_in">Walk-in (Langsung)</option>
                    <option value="ota_traveloka">OTA - Traveloka</option>
                    <option value="ota_agoda">OTA - Agoda</option>
                    <option value="ota_booking_com">OTA - Booking.com</option>
                    <option value="direct_web">Website Hotel</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">No. Ref OTA (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Kode booking OTA"
                    value={formData.ota_reference_code}
                    onChange={(e) => setFormData({ ...formData, ota_reference_code: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Tgl Check-In</label>
                  <input
                    type="date"
                    required
                    value={formData.check_in_date}
                    onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Tgl Check-Out</label>
                  <input
                    type="date"
                    required
                    value={formData.check_out_date}
                    onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Uang Muka / Deposit (Rp)</label>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  placeholder="0"
                  value={formData.deposit_amount}
                  onChange={(e) => setFormData({ ...formData, deposit_amount: Number(e.target.value) })}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  placeholder="Permintaan khusus tamu..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-medium resize-none"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <input
                  type="checkbox"
                  id="auto_check_in"
                  checked={formData.auto_check_in}
                  onChange={(e) => setFormData({ ...formData, auto_check_in: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 cursor-pointer"
                />
                <label htmlFor="auto_check_in" className="font-bold text-amber-900 cursor-pointer text-xs">
                  Langsung Check-In Tamu Sekarang (Kamar berubah Occupied)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Reservasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Room Transfer Modal (Pindah Kamar) */}
      {transferModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
              <div>
                <span className="text-[11px] font-extrabold uppercase text-amber-700 tracking-wider">Operasional Front Desk</span>
                <h3 className="text-base font-black text-neutral-900">Pindah Kamar (Room Move)</h3>
              </div>
              <button 
                onClick={() => setTransferModalBooking(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-3.5 text-xs">
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <div className="text-[10px] uppercase font-bold text-neutral-400">Tamu & Kamar Saat Ini</div>
                <div className="font-extrabold text-neutral-900 text-sm">{transferModalBooking.guest_name}</div>
                <div className="text-amber-700 font-bold">Kamar #{transferModalBooking.room_number} • {transferModalBooking.room_type_name}</div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Pilih Kamar Tujuan (Siap Huni) *</label>
                <select
                  required
                  value={transferTargetRoomId}
                  onChange={(e) => setTransferTargetRoomId(Number(e.target.value))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 font-semibold text-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                >
                  <option value={0}>-- Pilih Kamar Baru --</option>
                  {availableCleanRooms
                    .filter((r) => r.id !== transferModalBooking.room_id)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        Kamar #{r.room_number} (Lt {r.floor}) • {r.room_type_name} @ Rp {r.base_price?.toLocaleString('id-ID')}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Alasan Pindah Kamar *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: AC bising / Upgrade tamu / Permintaan tamu"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <input
                  type="checkbox"
                  id="apply_new_rate"
                  checked={transferApplyRate}
                  onChange={(e) => setTransferApplyRate(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 cursor-pointer"
                />
                <label htmlFor="apply_new_rate" className="font-bold text-amber-900 cursor-pointer text-xs">
                  Terapkan tarif kamar baru untuk sisa malam menginap (update Folio)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setTransferModalBooking(null)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={transferring}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-xs disabled:opacity-50"
                >
                  {transferring ? 'Memproses...' : 'Konfirmasi Pindah Kamar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Extend Stay Modal (+Malam) */}
      {extendModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
              <div>
                <span className="text-[11px] font-extrabold uppercase text-blue-700 tracking-wider">Perpanjang Menginap</span>
                <h3 className="text-base font-black text-neutral-900">Extend Stay Kamar #{extendModalBooking.room_number}</h3>
              </div>
              <button 
                onClick={() => setExtendModalBooking(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExtendSubmit} className="space-y-3.5 text-xs">
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                <div className="text-[10px] uppercase font-bold text-neutral-400">Tamu Menginap</div>
                <div className="font-extrabold text-neutral-900">{extendModalBooking.guest_name}</div>
                <div className="text-neutral-500">Check-out saat ini: <strong>{extendModalBooking.check_out_date}</strong></div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Tambah Berapa Malam? *</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setExtraNights(n)}
                      className={`flex-1 py-2 rounded-xl font-black text-xs transition-all ${
                        extraNights === n ? 'bg-blue-600 text-white shadow-xs' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                    >
                      +{n} Mlm
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-blue-950 font-semibold space-y-1">
                <div className="flex justify-between">
                  <span>Biaya Tambahan:</span>
                  <span className="font-black text-blue-700">
                    Rp {(extraNights * Number(extendModalBooking.rate_per_night || 0)).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="text-[11px] text-blue-700">
                  Tagihan akan otomatis ditambahkan ke Folio kamar.
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setExtendModalBooking(null)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={extending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs disabled:opacity-50"
                >
                  {extending ? 'Menyimpan...' : 'Perpanjang Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Surcharge Modal (Early / Late Fee) */}
      {surchargeModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
              <div>
                <span className="text-[11px] font-extrabold uppercase text-amber-700 tracking-wider">Penalti / Surcharge</span>
                <h3 className="text-base font-black text-neutral-900">Biaya Early / Late Check-out</h3>
              </div>
              <button 
                onClick={() => setSurchargeModalBooking(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSurchargeSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">Jenis Surcharge *</label>
                <select
                  value={surchargeType}
                  onChange={(e) => setSurchargeType(e.target.value as any)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 font-semibold text-neutral-800"
                >
                  <option value="late_checkout">Late Check-out Surcharge</option>
                  <option value="early_checkin">Early Check-in Surcharge</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Nominal Biaya (Rp) *</label>
                <input
                  type="number"
                  min="0"
                  step="25000"
                  required
                  value={surchargeAmount}
                  onChange={(e) => setSurchargeAmount(Number(e.target.value))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 font-bold text-amber-700 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Catatan Keterangan</label>
                <input
                  type="text"
                  placeholder="Keterangan jam atau alasan..."
                  value={surchargeNotes}
                  onChange={(e) => setSurchargeNotes(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setSurchargeModalBooking(null)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={chargingSurcharge}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-xs disabled:opacity-50"
                >
                  {chargingSurcharge ? 'Menyimpan...' : 'Posting ke Folio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function emptyOrNull(val: any): boolean {
  return val === null || val === undefined || val === 0 || val === '0' || val === '';
}
