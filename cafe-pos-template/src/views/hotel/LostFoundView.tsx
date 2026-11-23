import React, { useState, useEffect } from 'react';
import { 
  PackageSearch, Plus, CheckCircle2, Trash2, 
  Sparkles, X
} from 'lucide-react';
import { hotelApi } from '../../services/hotelApi';
import type { LostAndFoundItem, HotelRoom } from '../../types/hotel';

export const LostFoundView: React.FC = () => {
  const [items, setItems] = useState<LostAndFoundItem[]>([]);
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<LostAndFoundItem | null>(null);
  const [claimedByName, setClaimedByName] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    room_id: 0,
    item_name: '',
    description: '',
    storage_location: 'Brankas Front Desk Laci B',
    found_date: new Date().toISOString().split('T')[0],
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemList, roomList] = await Promise.all([
        hotelApi.getLostAndFound(statusFilter !== 'all' ? statusFilter : undefined),
        hotelApi.getRooms(),
      ]);
      setItems(itemList);
      setRooms(roomList);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat daftar barang tertinggal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.room_id <= 0 || !formData.item_name.trim()) return;

    setSaving(true);
    try {
      await hotelApi.createLostAndFound(formData);
      setIsAddModalOpen(false);
      setFormData({
        room_id: 0,
        item_name: '',
        description: '',
        storage_location: 'Brankas Front Desk Laci B',
        found_date: new Date().toISOString().split('T')[0],
      });
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Gagal mencatat barang tertinggal');
    } finally {
      setSaving(false);
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !claimedByName.trim()) return;

    setSaving(true);
    try {
      await hotelApi.updateLostAndFoundStatus(selectedItem.id, {
        status: 'claimed',
        claimed_by_name: claimedByName.trim(),
      });
      setIsClaimModalOpen(false);
      setSelectedItem(null);
      setClaimedByName('');
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Gagal memperbarui status klaim');
    } finally {
      setSaving(false);
    }
  };

  const handleDisposed = async (id: number) => {
    if (!confirm('Tandai barang ini telah didisposisi/dibuang?')) return;
    try {
      await hotelApi.updateLostAndFoundStatus(id, { status: 'disposed' });
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Gagal memproses');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-100 overflow-hidden">
      {/* Top Header */}
      <div className="bg-white border-b border-neutral-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-700 rounded-xl">
            <PackageSearch className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-neutral-900 leading-tight">Lost & Found (Barang Tertinggal)</h1>
            <p className="text-xs text-neutral-500 font-medium">Pencatatan dan serah terima barang tamu yang tertinggal di kamar</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-neutral-300 rounded-xl px-2.5 py-1.5 text-neutral-800 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">Semua Status</option>
            <option value="stored">Tersimpan di Brankas</option>
            <option value="claimed">Sudah Diklaim Tamu</option>
            <option value="disposed">Didisposisi / Kedaluwarsa</option>
          </select>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Barang Temuan</span>
          </button>
        </div>
      </div>

      {/* Item List Container */}
      <div className="flex-1 overflow-auto p-5">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-neutral-500 gap-2 font-medium">
            <Sparkles className="w-5 h-5 animate-spin text-amber-600" />
            <span>Memuat barang tertinggal...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm font-semibold">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-neutral-400">
            <PackageSearch className="w-12 h-12 mb-2 stroke-1" />
            <p className="text-sm font-bold text-neutral-600">Tidak ada barang tertinggal tercatat</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((it) => {
              return (
                <div
                  key={it.id}
                  className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-neutral-100 text-neutral-700 border border-neutral-200">
                        Kamar #{it.room_number} (Lt. {it.floor})
                      </span>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        it.status === 'stored' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        it.status === 'claimed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        'bg-neutral-100 text-neutral-600'
                      }`}>
                        {it.status === 'stored' ? 'Tersimpan' :
                         it.status === 'claimed' ? 'Telah Diambil' : 'Didisposisi'}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-sm text-neutral-900 leading-snug">
                      {it.item_name}
                    </h3>
                    {it.description && (
                      <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                        {it.description}
                      </p>
                    )}

                    <div className="mt-3 space-y-1 text-xs text-neutral-600 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200/80">
                      <div className="flex justify-between">
                        <span className="text-neutral-400 font-medium">Tanggal Temuan:</span>
                        <span className="font-semibold text-neutral-800">{it.found_date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400 font-medium">Lokasi Simpan:</span>
                        <span className="font-semibold text-neutral-800">{it.storage_location}</span>
                      </div>
                      {it.claimed_by_name && (
                        <div className="flex justify-between border-t border-neutral-200 pt-1 text-emerald-800 font-bold">
                          <span>Diambil oleh:</span>
                          <span>{it.claimed_by_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {it.status === 'stored' && (
                    <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedItem(it);
                          setIsClaimModalOpen(true);
                        }}
                        className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Klaim / Serahkan Tamu</span>
                      </button>

                      <button
                        onClick={() => handleDisposed(it.id)}
                        className="p-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-500"
                        title="Disposisi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Add Lost & Found Item */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-neutral-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-black">Catat Barang Tertinggal (Lost & Found)</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Kamar Lokasi Temuan *</label>
                  <select
                    required
                    value={formData.room_id}
                    onChange={(e) => setFormData({ ...formData, room_id: Number(e.target.value) })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-neutral-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  >
                    <option value={0}>-- Pilih Kamar --</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        Kamar #{r.room_number} (Lt. {r.floor})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Tanggal Ditemukan *</label>
                  <input
                    type="date"
                    required
                    value={formData.found_date}
                    onChange={(e) => setFormData({ ...formData, found_date: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-neutral-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Nama Barang *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Jam Tangan Seiko / Dompet Kulit / Charger"
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-neutral-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Lokasi Penyimpanan Sementara</label>
                <input
                  type="text"
                  value={formData.storage_location}
                  onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-neutral-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Keterangan / Kondisi Barang</label>
                <textarea
                  rows={2}
                  placeholder="Posisi ditemukan (di nakas/lemari) beserta ciri-ciri fisik..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                ></textarea>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-neutral-300 font-bold text-neutral-700 hover:bg-neutral-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Barang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Claim Item */}
      {isClaimModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between">
              <h3 className="text-sm font-black">Serah Terima & Klaim Barang</h3>
              <button
                onClick={() => setIsClaimModalOpen(false)}
                className="p-1 rounded-lg hover:bg-emerald-800 text-emerald-100 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleClaimSubmit} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <div className="text-[10px] uppercase font-bold text-neutral-400">Barang:</div>
                <div className="font-bold text-neutral-900 text-xs">{selectedItem.item_name}</div>
                <div className="text-[11px] text-neutral-500">Kamar #{selectedItem.room_number}</div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Nama Tamu / Penerima Pengambil *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bpk. Hendra (Tamu Kamar)"
                  value={claimedByName}
                  onChange={(e) => setClaimedByName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-neutral-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-neutral-300 font-bold text-neutral-700 hover:bg-neutral-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
                >
                  {saving ? 'Memproses...' : 'Konfirmasi Klaim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
