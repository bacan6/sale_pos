import React, { useState, useEffect } from 'react';
import { 
  Layers, Plus, Trash2, Edit2, Sparkles, MapPin, 
  X 
} from 'lucide-react';
import { laundryApi } from '../../services/laundryApi';
import type { LaundryService, LaundryPerfume, LaundryRack } from '../../types/laundry';

export const LaundryServiceManagementView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'services' | 'perfumes' | 'racks'>('services');
  const [services, setServices] = useState<LaundryService[]>([]);
  const [perfumes, setPerfumes] = useState<LaundryPerfume[]>([]);
  const [racks, setRacks] = useState<LaundryRack[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form Fields
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<'kiloan' | 'satuan'>('kiloan');
  const [unit, setUnit] = useState<string>('kg');
  const [basePrice, setBasePrice] = useState<number>(7000);
  const [durationHours, setDurationHours] = useState<number>(48);
  const [description, setDescription] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [capacity, setCapacity] = useState<number>(10);
  const [priceExtra, setPriceExtra] = useState<number>(0);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sData, pData, rData] = await Promise.all([
        laundryApi.getServices(),
        laundryApi.getPerfumes(),
        laundryApi.getRacks(),
      ]);
      setServices(sData);
      setPerfumes(pData);
      setRacks(rData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setName('');
    setType('kiloan');
    setUnit('kg');
    setBasePrice(7000);
    setDurationHours(48);
    setDescription('');
    setCode('');
    setCapacity(10);
    setPriceExtra(0);
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setName(item.name || '');
    if (activeTab === 'services') {
      setType(item.type || 'kiloan');
      setUnit(item.unit || 'kg');
      setBasePrice(Number(item.base_price) || 0);
      setDurationHours(Number(item.duration_hours) || 48);
      setDescription(item.description || '');
    } else if (activeTab === 'perfumes') {
      setPriceExtra(Number(item.price_extra) || 0);
    } else if (activeTab === 'racks') {
      setCode(item.code || '');
      setCapacity(Number(item.capacity) || 10);
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Nama wajib diisi');

    try {
      if (activeTab === 'services') {
        const payload = {
          name: name.trim(),
          type,
          unit: type === 'kiloan' ? 'kg' : unit.trim() || 'pcs',
          base_price: basePrice,
          duration_hours: durationHours,
          description: description.trim(),
          is_active: 1,
        };
        if (editingItem) {
          await laundryApi.updateService(editingItem.id, payload);
        } else {
          await laundryApi.createService(payload);
        }
      } else if (activeTab === 'perfumes') {
        const payload = {
          name: name.trim(),
          price_extra: priceExtra,
          is_active: 1,
        };
        if (editingItem) {
          await laundryApi.updatePerfume(editingItem.id, payload);
        } else {
          await laundryApi.createPerfume(payload);
        }
      } else if (activeTab === 'racks') {
        const payload = {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          capacity,
          is_active: 1,
        };
        if (editingItem) {
          await laundryApi.updateRack(editingItem.id, payload);
        } else {
          await laundryApi.createRack(payload);
        }
      }

      setShowModal(false);
      await loadAll();
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan perubahan');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus item ini?')) return;
    try {
      if (activeTab === 'services') await laundryApi.deleteService(id);
      else if (activeTab === 'perfumes') await laundryApi.deletePerfume(id);
      else if (activeTab === 'racks') await laundryApi.deleteRack(id);
      await loadAll();
    } catch (err: any) {
      alert(err?.message || 'Gagal menghapus item');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-950 text-neutral-100">
      {/* Top Header */}
      <div className="p-4 border-b border-neutral-800 bg-neutral-900/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-sm text-white">Kelola Tarif & Master Laundry</h2>
            <p className="text-xs text-neutral-400">Pengaturan Katalog Layanan, Parfum, dan Rak</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-xs font-semibold">
            {[
              { id: 'services', label: 'Tarif & Layanan' },
              { id: 'perfumes', label: 'Aroma Parfum' },
              { id: 'racks', label: 'Rak Penyimpanan' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === tab.id ? 'bg-cyan-600 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={openCreateModal}
            className="py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah</span>
          </button>
        </div>
      </div>

      {/* Main Table / Grid Content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {loading ? (
          <div className="py-12 text-center text-neutral-400 text-xs">Memuat katalog...</div>
        ) : activeTab === 'services' ? (
          /* Services Table */
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-neutral-950/70 uppercase text-[10px] text-neutral-400 font-bold border-b border-neutral-800">
                <tr>
                  <th className="py-3 px-4">Nama Layanan</th>
                  <th className="py-3 px-4">Tipe</th>
                  <th className="py-3 px-4">Tarif Dasar</th>
                  <th className="py-3 px-4">Estimasi</th>
                  <th className="py-3 px-4">Deskripsi</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {services.map(svc => (
                  <tr key={svc.id} className="hover:bg-neutral-800/30 transition">
                    <td className="py-3 px-4 font-bold text-white">{svc.name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        svc.type === 'kiloan' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {svc.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-cyan-300">
                      Rp {Number(svc.base_price).toLocaleString('id-ID')} / {svc.unit}
                    </td>
                    <td className="py-3 px-4">{svc.duration_hours} Jam</td>
                    <td className="py-3 px-4 text-neutral-400 max-w-xs truncate">{svc.description || '-'}</td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => openEditModal(svc)}
                        className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(svc.id)}
                        className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-neutral-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'perfumes' ? (
          /* Perfumes Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {perfumes.map(p => (
              <div
                key={p.id}
                className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">{p.name}</h4>
                    <p className="text-[11px] text-cyan-400 font-semibold mt-0.5">
                      {Number(p.price_extra) > 0 ? `+Rp ${Number(p.price_extra).toLocaleString('id-ID')} / kg` : 'Gratis'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(p)}
                    className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-neutral-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Racks Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {racks.map(r => (
              <div
                key={r.id}
                className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-mono font-bold text-xs text-cyan-400">{r.code}</span>
                    <h4 className="font-bold text-xs text-white">{r.name}</h4>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Kapasitas: {r.capacity} slot</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(r)}
                    className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-neutral-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSave}
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4 text-neutral-100"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-black text-sm text-white">
                {editingItem ? 'Edit Item' : 'Tambah Baru'} ({activeTab.toUpperCase()})
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Fields for Services */}
            {activeTab === 'services' && (
              <>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Nama Layanan *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Contoh: Cuci Kering Lipat"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Tipe</label>
                    <select
                      value={type}
                      onChange={e => {
                        const nextType = e.target.value as any;
                        setType(nextType);
                        if (nextType === 'kiloan') setUnit('kg');
                      }}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="kiloan">Kiloan</option>
                      <option value="satuan">Satuan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Satuan Unit</label>
                    <input
                      type="text"
                      value={unit}
                      onChange={e => setUnit(e.target.value)}
                      placeholder="kg / pcs / lembar"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Tarif Dasar (Rp)</label>
                    <input
                      type="number"
                      value={basePrice}
                      onChange={e => setBasePrice(parseFloat(e.target.value) || 0)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Durasi Standar (Jam)</label>
                    <input
                      type="number"
                      value={durationHours}
                      onChange={e => setDurationHours(parseInt(e.target.value) || 24)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Keterangan Singkat</label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Contoh: Selesai 2 hari, bebas kusut"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </>
            )}

            {/* Fields for Perfumes */}
            {activeTab === 'perfumes' && (
              <>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Nama Aroma Parfum *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Contoh: Sakura Blossom"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Biaya Tambahan (Rp / kg atau item)</label>
                  <input
                    type="number"
                    value={priceExtra}
                    onChange={e => setPriceExtra(parseFloat(e.target.value) || 0)}
                    placeholder="0 jika gratis"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </>
            )}

            {/* Fields for Racks */}
            {activeTab === 'racks' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Kode Rak *</label>
                    <input
                      type="text"
                      value={code}
                      onChange={e => setCode(e.target.value.toUpperCase())}
                      placeholder="RAK-A1"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Kapasitas Slot</label>
                    <input
                      type="number"
                      value={capacity}
                      onChange={e => setCapacity(parseInt(e.target.value) || 10)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Nama / Keterangan Rak *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Rak Gantung Baju Jas"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
              </>
            )}

            <div className="flex gap-2 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 text-xs text-neutral-400 hover:text-white bg-neutral-800 rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl shadow-lg"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
