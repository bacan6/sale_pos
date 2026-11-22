import React, { useState, useEffect } from 'react';
import { 
  Layers, Plus, Trash2, Edit3, 
  RefreshCw
} from 'lucide-react';
import { hotelApi } from '../../services/hotelApi';
import type { RoomType, HotelRoom } from '../../types/hotel';

export const RoomTypeManagementView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'types' | 'rooms'>('types');
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Room Type Form Modal
  const [showTypeModal, setShowTypeModal] = useState<boolean>(false);
  const [editingTypeId, setEditingTypeId] = useState<number | null>(null);
  const [typeName, setTypeName] = useState<string>('');
  const [typeCode, setTypeCode] = useState<string>('');
  const [typePrice, setTypePrice] = useState<number>(350000);
  const [typeAdults, setTypeAdults] = useState<number>(2);
  const [typeChildren, setTypeChildren] = useState<number>(1);
  const [typeAmenities, setTypeAmenities] = useState<string>('AC, WiFi, Hot Water, Smart TV');
  const [typeDesc, setTypeDesc] = useState<string>('');

  // Room Form Modal
  const [showRoomModal, setShowRoomModal] = useState<boolean>(false);
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [roomNumber, setRoomNumber] = useState<string>('');
  const [roomFloor, setRoomFloor] = useState<number>(1);
  const [roomTypeId, setRoomTypeId] = useState<number>(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [typeData, roomData] = await Promise.all([
        hotelApi.getRoomTypes(),
        hotelApi.getRooms(),
      ]);
      setRoomTypes(typeData);
      setRooms(roomData);
      if (typeData.length > 0 && !roomTypeId) {
        setRoomTypeId(typeData[0].id);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal memuat master data kamar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName || !typeCode || typePrice <= 0) {
      alert('Nama, kode, dan harga wajib diisi');
      return;
    }

    const amenitiesArray = typeAmenities
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    try {
      if (editingTypeId) {
        await hotelApi.updateRoomType(editingTypeId, {
          name: typeName,
          code: typeCode,
          base_price: typePrice,
          max_adults: typeAdults,
          max_children: typeChildren,
          amenities: amenitiesArray,
          description: typeDesc,
        });
      } else {
        await hotelApi.createRoomType({
          name: typeName,
          code: typeCode,
          base_price: typePrice,
          max_adults: typeAdults,
          max_children: typeChildren,
          amenities: amenitiesArray,
          description: typeDesc,
        });
      }
      setShowTypeModal(false);
      resetTypeForm();
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan tipe kamar');
    }
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber || !roomTypeId) {
      alert('Nomor kamar dan tipe kamar wajib diisi');
      return;
    }

    try {
      if (editingRoomId) {
        await hotelApi.updateRoom(editingRoomId, {
          room_number: roomNumber,
          floor: roomFloor,
          room_type_id: roomTypeId,
        });
      } else {
        await hotelApi.createRoom({
          room_number: roomNumber,
          floor: roomFloor,
          room_type_id: roomTypeId,
        });
      }
      setShowRoomModal(false);
      resetRoomForm();
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan data kamar');
    }
  };

  const handleDeleteType = async (id: number) => {
    if (!confirm('Hapus tipe kamar ini?')) return;
    try {
      await hotelApi.deleteRoomType(id);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus tipe kamar');
    }
  };

  const handleDeleteRoom = async (id: number) => {
    if (!confirm('Hapus nomor kamar ini?')) return;
    try {
      await hotelApi.deleteRoom(id);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus kamar');
    }
  };

  const resetTypeForm = () => {
    setEditingTypeId(null);
    setTypeName('');
    setTypeCode('');
    setTypePrice(350000);
    setTypeAdults(2);
    setTypeChildren(1);
    setTypeAmenities('AC, WiFi, Hot Water, Smart TV');
    setTypeDesc('');
  };

  const resetRoomForm = () => {
    setEditingRoomId(null);
    setRoomNumber('');
    setRoomFloor(1);
    if (roomTypes.length > 0) setRoomTypeId(roomTypes[0].id);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-100 overflow-hidden p-4 md:p-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-neutral-200 mb-4 shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-amber-600/10 text-amber-700 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-neutral-900 leading-tight">Master Data Tipe & Nomor Kamar</h1>
            <p className="text-xs text-neutral-500">Konfigurasi jenis kamar, harga dasar, kapasitas, dan nomor unit kamar per lantai</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-100 rounded-xl p-1 text-xs font-bold">
            <button
              onClick={() => setActiveSubTab('types')}
              className={`px-3 py-1.5 rounded-lg transition-all ${activeSubTab === 'types' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              Tipe Kamar ({roomTypes.length})
            </button>
            <button
              onClick={() => setActiveSubTab('rooms')}
              className={`px-3 py-1.5 rounded-lg transition-all ${activeSubTab === 'rooms' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              Unit Kamar ({rooms.length})
            </button>
          </div>

          <button
            onClick={() => {
              if (activeSubTab === 'types') {
                resetTypeForm();
                setShowTypeModal(true);
              } else {
                resetRoomForm();
                setShowRoomModal(true);
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> {activeSubTab === 'types' ? 'Tambah Tipe Kamar' : 'Tambah Unit Kamar'}
          </button>

          <button
            onClick={fetchData}
            className="p-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          {activeSubTab === 'types' ? (
            /* Room Types Table */
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 sticky top-0 font-bold text-neutral-600">
                <tr>
                  <th className="py-3 px-4">Kode & Nama Tipe</th>
                  <th className="py-3 px-4">Harga Dasar / Malam</th>
                  <th className="py-3 px-4">Kapasitas</th>
                  <th className="py-3 px-4">Fasilitas / Amenities</th>
                  <th className="py-3 px-4">Total Unit</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium">
                {roomTypes.map(t => (
                  <tr key={t.id} className="hover:bg-neutral-50/70 transition-all">
                    <td className="py-3 px-4">
                      <div className="font-bold text-neutral-900">{t.name}</div>
                      <span className="text-[10px] bg-neutral-100 text-neutral-600 font-mono px-1.5 py-0.5 rounded">{t.code}</span>
                    </td>
                    <td className="py-3 px-4 font-black text-amber-700 whitespace-nowrap">
                      Rp {Number(t.base_price).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-neutral-700">
                      {t.max_adults} Dewasa, {t.max_children} Anak
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {t.amenities && t.amenities.map((am, i) => (
                          <span key={i} className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                            {am}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-neutral-800 whitespace-nowrap">
                      {t.total_rooms || 0} Kamar
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingTypeId(t.id);
                            setTypeName(t.name);
                            setTypeCode(t.code);
                            setTypePrice(t.base_price);
                            setTypeAdults(t.max_adults);
                            setTypeChildren(t.max_children);
                            setTypeAmenities(t.amenities ? t.amenities.join(', ') : '');
                            setTypeDesc(t.description || '');
                            setShowTypeModal(true);
                          }}
                          className="p-1.5 hover:bg-neutral-100 text-neutral-600 rounded-lg transition-all"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteType(t.id)}
                          className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* Rooms List Table */
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 sticky top-0 font-bold text-neutral-600">
                <tr>
                  <th className="py-3 px-4">Nomor Kamar</th>
                  <th className="py-3 px-4">Lantai</th>
                  <th className="py-3 px-4">Tipe Kamar</th>
                  <th className="py-3 px-4">Harga Dasar</th>
                  <th className="py-3 px-4">Status Terkini</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium">
                {rooms.map(r => (
                  <tr key={r.id} className="hover:bg-neutral-50/70 transition-all">
                    <td className="py-3 px-4 font-black text-neutral-900 text-sm">
                      #{r.room_number}
                    </td>
                    <td className="py-3 px-4 font-semibold text-neutral-600">
                      Lantai {r.floor}
                    </td>
                    <td className="py-3 px-4 font-bold text-amber-700">
                      {r.room_type_name}
                    </td>
                    <td className="py-3 px-4 font-bold text-neutral-800">
                      Rp {Number(r.base_price).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 capitalize">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingRoomId(r.id);
                            setRoomNumber(r.room_number);
                            setRoomFloor(r.floor);
                            setRoomTypeId(r.room_type_id);
                            setShowRoomModal(true);
                          }}
                          className="p-1.5 hover:bg-neutral-100 text-neutral-600 rounded-lg transition-all"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(r.id)}
                          className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal: Room Type */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-black text-neutral-900 mb-3">
              {editingTypeId ? 'Edit Tipe Kamar' : 'Tambah Tipe Kamar Baru'}
            </h3>
            <form onSubmit={handleSaveType} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Nama Tipe *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Deluxe Room"
                    value={typeName}
                    onChange={(e) => setTypeName(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Kode Tipe *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: DLX"
                    value={typeCode}
                    onChange={(e) => setTypeCode(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-medium uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Harga Dasar / Malam (Rp) *</label>
                <input
                  type="number"
                  min="50000"
                  step="10000"
                  required
                  value={typePrice}
                  onChange={(e) => setTypePrice(Number(e.target.value))}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-black text-amber-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Maks. Dewasa</label>
                  <input
                    type="number"
                    min="1"
                    value={typeAdults}
                    onChange={(e) => setTypeAdults(Number(e.target.value))}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Maks. Anak</label>
                  <input
                    type="number"
                    min="0"
                    value={typeChildren}
                    onChange={(e) => setTypeChildren(Number(e.target.value))}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Fasilitas (Pisahkan Koma)</label>
                <input
                  type="text"
                  placeholder="AC, WiFi, Hot Water, Smart TV"
                  value={typeAmenities}
                  onChange={(e) => setTypeAmenities(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={2}
                  placeholder="Kamar nyaman dengan pemandangan..."
                  value={typeDesc}
                  onChange={(e) => setTypeDesc(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-medium resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowTypeModal(false)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold"
                >
                  Simpan Tipe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Unit Room */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-base font-black text-neutral-900 mb-3">
              {editingRoomId ? 'Edit Unit Kamar' : 'Tambah Unit Kamar Baru'}
            </h3>
            <form onSubmit={handleSaveRoom} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Nomor Kamar *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 101"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Lantai *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={roomFloor}
                    onChange={(e) => setRoomFloor(Number(e.target.value))}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Tipe Kamar *</label>
                <select
                  value={roomTypeId}
                  onChange={(e) => setRoomTypeId(Number(e.target.value))}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-semibold text-neutral-800"
                >
                  {roomTypes.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code}) - Rp {Number(t.base_price).toLocaleString('id-ID')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold"
                >
                  Simpan Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
