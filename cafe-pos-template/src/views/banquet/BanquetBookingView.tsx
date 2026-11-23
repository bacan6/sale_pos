import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, AlertTriangle } from 'lucide-react';
import { banquetApi } from '../../services/banquetApi';
import type { BanquetBooking, BanquetRoom, BanquetPackage } from '../../types/banquet';

export const BanquetBookingView: React.FC = () => {
  const [bookings, setBookings] = useState<BanquetBooking[]>([]);
  const [rooms, setRooms] = useState<BanquetRoom[]>([]);
  const [packages, setPackages] = useState<BanquetPackage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Form State
  const [formRoomId, setFormRoomId] = useState<number>(0);
  const [formCustName, setFormCustName] = useState<string>('');
  const [formCustPhone, setFormCustPhone] = useState<string>('');
  const [formCompany, setFormCompany] = useState<string>('');
  const [formEventName, setFormEventName] = useState<string>('');
  const [formEventType] = useState<string>('meeting');
  const [formLayoutType, setFormLayoutType] = useState<string>('classroom');
  const [formPax, setFormPax] = useState<number>(20);
  const [formStart, setFormStart] = useState<string>('');
  const [formEnd, setFormEnd] = useState<string>('');
  const [formPackageId, setFormPackageId] = useState<number | 0>(0);
  const [formDeposit, setFormDeposit] = useState<number>(0);
  const [formNotes, setFormNotes] = useState<string>('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [bData, rData, pData] = await Promise.all([
        banquetApi.getBookings(),
        banquetApi.getRooms(),
        banquetApi.getPackages(),
      ]);
      setBookings(bData);
      setRooms(rData);
      setPackages(pData);
      if (rData.length > 0 && !formRoomId) {
        setFormRoomId(rData[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCheckConflict = async () => {
    if (!formRoomId || !formStart || !formEnd) return;
    try {
      const res = await banquetApi.checkConflict(formRoomId, formStart, formEnd);
      if (res.conflict) {
        setConflictWarning('PERINGATAN: Jadwal bentrok dengan acara lain pada jam ini!');
      } else {
        setConflictWarning(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustName || !formEventName || !formStart || !formEnd) {
      alert('Lengkapi field wajib (Nama, Acara, Waktu Mulai & Selesai)');
      return;
    }

    try {
      const res = await banquetApi.createBooking({
        banquet_room_id: formRoomId,
        customer_name: formCustName,
        customer_phone: formCustPhone,
        company_name: formCompany,
        event_name: formEventName,
        event_type: formEventType,
        layout_type: formLayoutType,
        pax_count: formPax,
        start_time: formStart,
        end_time: formEnd,
        package_id: formPackageId || null,
        deposit_amount: formDeposit,
        notes: formNotes,
      });

      if (res.status === 'error') {
        alert(res.message || 'Gagal membuat reservasi BEO');
        return;
      }

      setIsModalOpen(false);
      resetForm();
      loadAll();
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem');
    }
  };

  const resetForm = () => {
    setFormCustName('');
    setFormCustPhone('');
    setFormCompany('');
    setFormEventName('');
    setFormPax(20);
    setFormStart('');
    setFormEnd('');
    setFormDeposit(0);
    setFormNotes('');
    setConflictWarning(null);
  };

  const filtered = bookings.filter((b) => {
    const matchStatus = !filterStatus || b.status === filterStatus;
    const matchSearch =
      !search ||
      b.event_name.toLowerCase().includes(search.toLowerCase()) ||
      b.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      b.booking_number.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="flex-1 bg-neutral-950 text-white flex flex-col min-h-0 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-amber-400 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            BEO & Reservasi Event Banquet
          </h1>
          <p className="text-sm text-neutral-400">
            Daftar Banquet Event Order (BEO), status pembayaran DP, dan paket meeting.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          Buat BEO Event Baru
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-neutral-900 p-3 rounded-2xl border border-neutral-800">
        <div className="relative flex-1 w-full md:w-auto">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari BEO, nama acara, atau pelanggan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
          >
            <option value="">Semua Status</option>
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Booking List Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 uppercase text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-4">No. BEO</th>
                <th className="py-3 px-4">Acara & Pelanggan</th>
                <th className="py-3 px-4">Ruangan & Layout</th>
                <th className="py-3 px-4">Waktu Pelaksanaan</th>
                <th className="py-3 px-4">Total Biaya</th>
                <th className="py-3 px-4">Status & Bayar</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-neutral-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-500">
                    Memuat data BEO...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-500">
                    Tidak ada data reservasi banquet ditemukan.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-neutral-850 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-amber-400">
                      {b.booking_number}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-white">{b.event_name}</p>
                      <p className="text-xs text-neutral-400">
                        {b.customer_name} {b.company_name ? `(${b.company_name})` : ''}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-white">{b.room_name || `Room #${b.banquet_room_id}`}</p>
                      <p className="text-xs text-neutral-400 capitalize">
                        {b.layout_type.replace('_', ' ')} • {b.pax_count} Pax
                      </p>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <p className="text-white font-medium">
                        {new Date(b.start_time).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-neutral-400">
                        {new Date(b.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(b.end_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-white">
                        Rp {Number(b.total_amount).toLocaleString('id-ID')}
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        DP: Rp {Number(b.paid_amount).toLocaleString('id-ID')}
                      </p>
                    </td>
                    <td className="py-3 px-4 space-y-1">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          b.status === 'confirmed'
                            ? 'bg-blue-500/20 text-blue-300'
                            : b.status === 'ongoing'
                            ? 'bg-amber-500/20 text-amber-300'
                            : b.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {b.status}
                      </span>
                      <br />
                      <span
                        className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          b.payment_status === 'paid'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : b.payment_status === 'folio_charge'
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : b.payment_status === 'partial'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {b.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {b.status === 'confirmed' && (
                        <button
                          onClick={async () => {
                            await banquetApi.updateBookingStatus(b.id, 'ongoing');
                            loadAll();
                          }}
                          className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1 rounded-lg font-medium transition"
                        >
                          Mulai Acara
                        </button>
                      )}
                      {b.status === 'ongoing' && (
                        <button
                          onClick={async () => {
                            await banquetApi.updateBookingStatus(b.id, 'completed');
                            loadAll();
                          }}
                          className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-medium transition"
                        >
                          Selesai
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Buat BEO Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 text-white space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-lg font-bold text-amber-400">Buat Banquet Event Order (BEO) Baru</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white">
                ✕
              </button>
            </div>

            {conflictWarning && (
              <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{conflictWarning}</span>
              </div>
            )}

            <form onSubmit={handleCreateBooking} className="space-y-4 text-xs md:text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Ruangan Banquet *</label>
                  <select
                    value={formRoomId}
                    onChange={(e) => {
                      setFormRoomId(Number(e.target.value));
                      handleCheckConflict();
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Paket Acara (Opsional)</label>
                  <select
                    value={formPackageId}
                    onChange={(e) => setFormPackageId(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                  >
                    <option value={0}>Sewa Ruang Saja (Per Jam)</option>
                    {packages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - Rp {Number(p.price_per_pax).toLocaleString('id-ID')}/pax
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Nama Acara / Event *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Seminar AI & Digital Bisnis"
                    value={formEventName}
                    onChange={(e) => setFormEventName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Nama Pelanggan / Kontak *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama PIC"
                    value={formCustName}
                    onChange={(e) => setFormCustName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Layout Meja / Kursi</label>
                  <select
                    value={formLayoutType}
                    onChange={(e) => setFormLayoutType(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="classroom">Classroom</option>
                    <option value="theater">Theater</option>
                    <option value="u_shape">U-Shape</option>
                    <option value="banquet_round">Round Table (Banquet)</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Jumlah Peserta (Pax) *</label>
                  <input
                    type="number"
                    min={1}
                    value={formPax}
                    onChange={(e) => setFormPax(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Uang Muka / DP (Rp)</label>
                  <input
                    type="number"
                    value={formDeposit}
                    onChange={(e) => setFormDeposit(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Waktu Mulai *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formStart}
                    onChange={(e) => {
                      setFormStart(e.target.value);
                      setTimeout(handleCheckConflict, 100);
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Waktu Selesai *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formEnd}
                    onChange={(e) => {
                      setFormEnd(e.target.value);
                      setTimeout(handleCheckConflict, 100);
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Catatan Tambahan / Fasilitas Khusus</label>
                <textarea
                  rows={2}
                  placeholder="Kebutuhan mic wireless, backdrop panggung, coffee break..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-5 py-2.5 rounded-xl transition"
                >
                  Simpan BEO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
