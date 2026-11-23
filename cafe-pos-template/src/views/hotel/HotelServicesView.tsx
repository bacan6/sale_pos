import React, { useState, useEffect } from 'react';
import { 
  Layers, Plus, Edit2, Trash2, Search, X,
  Utensils, BedDouble, Shirt, Car, Wine, AlertCircle, Sparkles
} from 'lucide-react';
import { hotelApi } from '../../services/hotelApi';
import type { HotelService, HotelServiceCategory } from '../../types/hotel';

export const HotelServicesView: React.FC = () => {
  const [services, setServices] = useState<HotelService[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<HotelService | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const [formData, setFormData] = useState<{
    category: HotelServiceCategory;
    code: string;
    name: string;
    price: number;
    unit: string;
    description: string;
    is_active: number;
  }>({
    category: 'extra_bed',
    code: '',
    name: '',
    price: 0,
    unit: 'pcs',
    description: '',
    is_active: 1,
  });

  const loadServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await hotelApi.getServices();
      setServices(data);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat katalog layanan hotel');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const openCreateModal = () => {
    setEditingService(null);
    setFormData({
      category: 'extra_bed',
      code: '',
      name: '',
      price: 100000,
      unit: 'pcs',
      description: '',
      is_active: 1,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (service: HotelService) => {
    setEditingService(service);
    setFormData({
      category: service.category,
      code: service.code,
      name: service.name,
      price: service.price,
      unit: service.unit,
      description: service.description || '',
      is_active: service.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      if (editingService) {
        await hotelApi.updateService(editingService.id, formData);
      } else {
        await hotelApi.createService(formData);
      }
      setIsModalOpen(false);
      await loadServices();
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan layanan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Hapus layanan "${name}"?`)) return;
    try {
      await hotelApi.deleteService(id);
      await loadServices();
    } catch (err: any) {
      alert(err?.message || 'Gagal menghapus layanan');
    }
  };

  const categories = [
    { id: 'all', label: 'Semua Layanan', icon: Layers },
    { id: 'extra_bed', label: 'Extra Bed', icon: BedDouble },
    { id: 'breakfast', label: 'Sarapan / Buffet', icon: Utensils },
    { id: 'laundry', label: 'Laundry', icon: Shirt },
    { id: 'transport', label: 'Antar Jemput', icon: Car },
    { id: 'minibar', label: 'Minibar & Snack', icon: Wine },
    { id: 'penalty', label: 'Surcharge & Denda', icon: AlertCircle },
  ];

  const filteredServices = services.filter((s) => {
    if (activeCategory !== 'all' && s.category !== activeCategory) return false;
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-100 overflow-hidden">
      {/* Top Header */}
      <div className="bg-white border-b border-neutral-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-700 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-neutral-900 leading-tight">Katalog Layanan & Add-on Hotel</h1>
            <p className="text-xs text-neutral-500 font-medium">Master item ekstra untuk 1-klik posting langsung ke Folio tamu</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari layanan / kode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-neutral-50 border border-neutral-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 w-48 sm:w-60"
            />
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Layanan</span>
          </button>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="bg-white/80 border-b border-neutral-200 px-5 py-2.5 flex items-center gap-2 overflow-x-auto shrink-0">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="flex-1 overflow-auto p-5">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-neutral-500 gap-2 font-medium">
            <Sparkles className="w-5 h-5 animate-spin text-amber-600" />
            <span>Memuat katalog layanan hotel...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm font-semibold">
            {error}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-neutral-400">
            <Layers className="w-12 h-12 mb-2 stroke-1" />
            <p className="text-sm font-bold text-neutral-600">Tidak ada item layanan yang cocok</p>
            <p className="text-xs">Klik "Tambah Layanan" untuk mendaftarkan add-on baru.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((service) => {
              return (
                <div
                  key={service.id}
                  className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs hover:border-amber-400 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-neutral-100 text-neutral-600 border border-neutral-200">
                        {service.code}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        service.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-500'
                      }`}>
                        {service.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-sm text-neutral-900 leading-snug mb-1">
                      {service.name}
                    </h3>
                    {service.description && (
                      <p className="text-xs text-neutral-500 mb-3 line-clamp-2">
                        {service.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between mt-2">
                    <div>
                      <div className="text-[10px] font-bold text-neutral-400 uppercase">Tarif Satuan</div>
                      <div className="font-black text-amber-700 text-sm">
                        Rp {service.price.toLocaleString('id-ID')}{' '}
                        <span className="text-[11px] font-normal text-neutral-500">/ {service.unit}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(service)}
                        className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-600 transition-all"
                        title="Edit Layanan"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(service.id, service.name)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-all"
                        title="Hapus Layanan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Add / Edit Service */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-neutral-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-black">
                {editingService ? 'Edit Layanan Hotel' : 'Tambah Layanan / Add-on Hotel'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Kategori Layanan *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as HotelServiceCategory })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-neutral-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="extra_bed">Extra Bed</option>
                    <option value="breakfast">Sarapan / Buffet</option>
                    <option value="laundry">Laundry</option>
                    <option value="transport">Transport / Shuttle</option>
                    <option value="minibar">Minibar & Snack</option>
                    <option value="penalty">Surcharge / Penalti</option>
                    <option value="amenity">Ameniti & Fasilitas</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Kode Layanan</label>
                  <input
                    type="text"
                    placeholder="Auto (mis. SRV-EXB-01)"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-neutral-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Nama Layanan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Extra Bed Springbed Single"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-neutral-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Harga Satuan (Rp) *</label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-neutral-800 font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    placeholder="pcs / pax / malam / kg"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-neutral-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Deskripsi Tambahan</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan fasilitas atau syarat layanan..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                ></textarea>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="srv_active"
                  checked={formData.is_active === 1}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                  className="rounded-md border-neutral-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <label htmlFor="srv_active" className="text-xs font-bold text-neutral-800">
                  Aktifkan dalam menu kasir folio
                </label>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-neutral-300 font-bold text-neutral-700 hover:bg-neutral-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Layanan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
