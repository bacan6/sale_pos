import React, { useState, useEffect } from 'react';
import { 
  Users, Search, ShieldAlert, Phone, Mail, 
  Edit2, AlertTriangle, Sparkles, X
} from 'lucide-react';
import { hotelApi } from '../../services/hotelApi';
import type { HotelGuest, VipTier } from '../../types/hotel';

export const GuestCrmView: React.FC = () => {
  const [guests, setGuests] = useState<HotelGuest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [selectedVip, setSelectedVip] = useState<string>('all');
  const [selectedBlacklist, setSelectedBlacklist] = useState<string>('all');

  // Detail & Edit State
  const [selectedGuest, setSelectedGuest] = useState<HotelGuest | null>(null);
  const [guestDetail, setGuestDetail] = useState<HotelGuest | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const [editFormData, setEditFormData] = useState<{
    full_name: string;
    phone: string;
    email: string;
    address: string;
    vip_tier: VipTier;
    is_blacklisted: number;
    blacklist_reason: string;
    preferences: string;
  }>({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    vip_tier: 'regular',
    is_blacklisted: 0,
    blacklist_reason: '',
    preferences: '',
  });

  const loadGuests = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await hotelApi.getGuests({
        search: search.trim() || undefined,
        vip_tier: selectedVip !== 'all' ? selectedVip : undefined,
        is_blacklisted: selectedBlacklist === 'all' ? undefined : Number(selectedBlacklist),
      });
      setGuests(data);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat data tamu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuests();
  }, [selectedVip, selectedBlacklist]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadGuests();
  };

  const handleSelectGuest = async (g: HotelGuest) => {
    setSelectedGuest(g);
    try {
      const detail = await hotelApi.getGuest(g.id);
      setGuestDetail(detail);
    } catch {
      setGuestDetail(g);
    }
  };

  const openEditModal = (g: HotelGuest) => {
    setEditFormData({
      full_name: g.full_name,
      phone: g.phone || '',
      email: g.email || '',
      address: g.address || '',
      vip_tier: g.vip_tier || 'regular',
      is_blacklisted: g.is_blacklisted || 0,
      blacklist_reason: g.blacklist_reason || '',
      preferences: g.preferences || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuest) return;

    setSaving(true);
    try {
      await hotelApi.updateGuest(selectedGuest.id, editFormData);
      setIsEditModalOpen(false);
      await loadGuests();
      const updated = await hotelApi.getGuest(selectedGuest.id);
      setSelectedGuest(updated);
      setGuestDetail(updated);
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  const vipBadges: Record<VipTier, { bg: string; text: string; label: string }> = {
    regular: { bg: 'bg-neutral-100', text: 'text-neutral-700', label: 'Regular' },
    silver: { bg: 'bg-slate-200', text: 'text-slate-800', label: 'Silver VIP' },
    gold: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Gold VIP' },
    platinum: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Platinum VIP' },
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-100 overflow-hidden">
      {/* Top Header */}
      <div className="bg-white border-b border-neutral-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-700 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-neutral-900 leading-tight">Guest CRM & Direktori Tamu</h1>
            <p className="text-xs text-neutral-500 font-medium">Riwayat menginap, status VIP loyalitas, dan proteksi daftar hitam</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center flex-wrap gap-2">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, nomor HP, no. KTP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-neutral-50 border border-neutral-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 w-52 sm:w-64"
            />
          </form>

          <select
            value={selectedVip}
            onChange={(e) => setSelectedVip(e.target.value)}
            className="bg-white border border-neutral-300 rounded-xl px-2.5 py-1.5 text-neutral-800 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">Semua VIP Tier</option>
            <option value="regular">Regular</option>
            <option value="silver">Silver VIP</option>
            <option value="gold">Gold VIP</option>
            <option value="platinum">Platinum VIP</option>
          </select>

          <select
            value={selectedBlacklist}
            onChange={(e) => setSelectedBlacklist(e.target.value)}
            className="bg-white border border-neutral-300 rounded-xl px-2.5 py-1.5 text-neutral-800 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">Semua Status Tamu</option>
            <option value="0">Tamu Normal</option>
            <option value="1">Blacklisted</option>
          </select>
        </div>
      </div>

      {/* Main Content Area (List + Detail Drawer) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Guest List */}
        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="h-64 flex items-center justify-center text-neutral-500 gap-2 font-medium">
              <Sparkles className="w-5 h-5 animate-spin text-amber-600" />
              <span>Memuat direktori tamu...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm font-semibold">
              {error}
            </div>
          ) : guests.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-neutral-400">
              <Users className="w-12 h-12 mb-2 stroke-1" />
              <p className="text-sm font-bold text-neutral-600">Tidak ada data tamu ditemukan</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {guests.map((g) => {
                const tier = g.vip_tier || 'regular';
                const badge = vipBadges[tier];
                const isSelected = selectedGuest?.id === g.id;

                return (
                  <div
                    key={g.id}
                    onClick={() => handleSelectGuest(g)}
                    className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                        : 'border-neutral-200 hover:border-neutral-300 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>

                        {Boolean(g.is_blacklisted) && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-800 flex items-center gap-1 border border-red-300 animate-pulse">
                            <ShieldAlert className="w-3 h-3 text-red-600" />
                            <span>Blacklist</span>
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-sm text-neutral-900 leading-snug">
                        {g.full_name}
                      </h3>
                      <div className="text-xs text-neutral-500 font-medium mt-0.5">
                        {g.id_card_type}: {g.id_card_number}
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-neutral-600">
                        {g.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-neutral-400" />
                            <span>{g.phone}</span>
                          </div>
                        )}
                        {g.email && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail className="w-3.5 h-3.5 text-neutral-400" />
                            <span className="truncate">{g.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-neutral-400">Total Kunjungan</div>
                        <div className="font-black text-neutral-900">{g.total_stays || 0} Kali</div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-neutral-400">Total Spending</div>
                        <div className="font-black text-amber-700">
                          Rp {(g.total_spent || 0).toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Guest Detail Sidebar */}
        {selectedGuest && (
          <div className="w-80 sm:w-96 bg-white border-l border-neutral-200 flex flex-col h-full shadow-lg shrink-0 overflow-y-auto">
            <div className="p-4 bg-neutral-900 text-white flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400">Profil & Riwayat Tamu</span>
                <h3 className="text-sm font-black truncate">{selectedGuest.full_name}</h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(selectedGuest)}
                  className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-300 hover:text-white"
                  title="Edit Status & Data Tamu"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedGuest(null);
                    setGuestDetail(null);
                  }}
                  className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs text-neutral-700 flex-1">
              {/* Blacklist banner if applicable */}
              {Boolean(selectedGuest.is_blacklisted) && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900">
                  <div className="flex items-center gap-1.5 font-black text-xs text-red-800 mb-1">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>STATUS: DAFTAR HITAM (BLACKLIST)</span>
                  </div>
                  <p className="text-[11px] font-medium leading-relaxed">
                    {selectedGuest.blacklist_reason || 'Tamu ini ditandai daftar hitam karena masalah operasional.'}
                  </p>
                </div>
              )}

              {/* Stats Overview */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase">Tier Loyalitas</div>
                  <div className="font-extrabold text-neutral-900 capitalize mt-0.5">
                    {selectedGuest.vip_tier || 'Regular'}
                  </div>
                </div>
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase">Total Spending</div>
                  <div className="font-extrabold text-amber-700 mt-0.5">
                    Rp {(selectedGuest.total_spent || 0).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* Contact & Identity Details */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Identitas:</span>
                  <span className="font-bold text-neutral-900">{selectedGuest.id_card_type} • {selectedGuest.id_card_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">No. WhatsApp / HP:</span>
                  <span className="font-bold text-neutral-900">{selectedGuest.phone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Email:</span>
                  <span className="font-bold text-neutral-900">{selectedGuest.email || '-'}</span>
                </div>
                {selectedGuest.address && (
                  <div className="border-t border-neutral-200 pt-2">
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold">Alamat:</span>
                    <span className="text-neutral-900">{selectedGuest.address}</span>
                  </div>
                )}
                {selectedGuest.preferences && (
                  <div className="border-t border-neutral-200 pt-2">
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold">Preferensi Tamu:</span>
                    <span className="text-neutral-900 font-semibold">{selectedGuest.preferences}</span>
                  </div>
                )}
              </div>

              {/* Booking History */}
              <div>
                <h4 className="font-black text-xs text-neutral-900 mb-2">Riwayat Reservasi Tamu</h4>
                {guestDetail?.booking_history && guestDetail.booking_history.length > 0 ? (
                  <div className="space-y-2">
                    {guestDetail.booking_history.map((hb) => (
                      <div key={hb.id} className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
                        <div className="flex items-center justify-between font-bold text-xs">
                          <span className="text-neutral-900">{hb.booking_number}</span>
                          <span className="text-amber-700">Kamar #{hb.room_number}</span>
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">
                          {hb.check_in_date} s/d {hb.check_out_date} ({hb.night_count} Malam)
                        </div>
                        <div className="flex items-center justify-between text-[11px] mt-1 pt-1 border-t border-neutral-200/60 font-semibold">
                          <span className="capitalize">{hb.status.replace('_', ' ')}</span>
                          <span>Rp {hb.total_amount?.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-400 text-xs italic">Belum ada riwayat menginap.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Guest Status Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-neutral-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-black">Edit Profil & Keamanan Tamu</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-neutral-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">No. Handphone</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-neutral-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">VIP Tier</label>
                  <select
                    value={editFormData.vip_tier}
                    onChange={(e) => setEditFormData({ ...editFormData, vip_tier: e.target.value as VipTier })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-neutral-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="regular">Regular</option>
                    <option value="silver">Silver VIP</option>
                    <option value="gold">Gold VIP</option>
                    <option value="platinum">Platinum VIP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Preferensi Khusus (Catatan Tamu)</label>
                <input
                  type="text"
                  placeholder="Contoh: Non-smoking, bantal ekstra, lantai tinggi"
                  value={editFormData.preferences}
                  onChange={(e) => setEditFormData({ ...editFormData, preferences: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Blacklist Section */}
              <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="guest_bl"
                    checked={editFormData.is_blacklisted === 1}
                    onChange={(e) => setEditFormData({ ...editFormData, is_blacklisted: e.target.checked ? 1 : 0 })}
                    className="rounded-md border-red-300 text-red-600 focus:ring-red-500 w-4 h-4"
                  />
                  <label htmlFor="guest_bl" className="text-xs font-black text-red-800">
                    Masukkan ke Daftar Hitam (Blacklist)
                  </label>
                </div>

                {editFormData.is_blacklisted === 1 && (
                  <div>
                    <label className="block text-[10px] font-bold text-red-700 uppercase mb-1">
                      Alasan Blacklist *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Merusak fasilitas TV kamar atau kabur tanpa bayar"
                      value={editFormData.blacklist_reason}
                      onChange={(e) => setEditFormData({ ...editFormData, blacklist_reason: e.target.value })}
                      className="w-full bg-white border border-red-300 rounded-lg px-2.5 py-1.5 text-xs text-red-900 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-neutral-300 font-bold text-neutral-700 hover:bg-neutral-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
