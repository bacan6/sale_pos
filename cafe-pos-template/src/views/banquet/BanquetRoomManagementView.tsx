import React, { useState, useEffect } from 'react';
import { Layers, Plus, Trash2 } from 'lucide-react';
import { banquetApi } from '../../services/banquetApi';
import type { BanquetRoom, BanquetPackage } from '../../types/banquet';

export const BanquetRoomManagementView: React.FC = () => {
  const [rooms, setRooms] = useState<BanquetRoom[]>([]);
  const [packages, setPackages] = useState<BanquetPackage[]>([]);
  const [activeTab, setActiveTab] = useState<'rooms' | 'packages'>('rooms');

  // New room modal
  const [isRoomModal, setIsRoomModal] = useState<boolean>(false);
  const [roomName, setRoomName] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  const [roomFloor, setRoomFloor] = useState<string>('Lantai 1');
  const [areaSqm] = useState<number>(50);
  const [capClassroom, setCapClassroom] = useState<number>(30);
  const [capTheater] = useState<number>(50);
  const [rateHour, setRateHour] = useState<number>(300000);

  const loadData = async () => {
    try {
      const [r, p] = await Promise.all([banquetApi.getRooms(), banquetApi.getPackages()]);
      setRooms(r);
      setPackages(p);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName || !roomCode) return;
    try {
      await banquetApi.createRoom({
        name: roomName,
        code: roomCode,
        floor: roomFloor,
        area_sqm: areaSqm,
        capacity_classroom: capClassroom,
        capacity_theater: capTheater,
        rate_per_hour: rateHour,
      });
      setIsRoomModal(false);
      setRoomName('');
      setRoomCode('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan');
    }
  };

  return (
    <div className="flex-1 bg-neutral-950 text-white flex flex-col min-h-0 overflow-y-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-amber-400 flex items-center gap-2">
            <Layers className="w-6 h-6" />
            Master Ruangan & Paket Meeting Banquet
          </h1>
          <p className="text-sm text-neutral-400">
            Konfigurasi unit ruangan serbaguna, kapasitas layout, serta paket makanan & fasilitas meeting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-1 flex">
            <button
              onClick={() => setActiveTab('rooms')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'rooms' ? 'bg-amber-600 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Ruangan ({rooms.length})
            </button>
            <button
              onClick={() => setActiveTab('packages')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'packages' ? 'bg-amber-600 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Paket Acara ({packages.length})
            </button>
          </div>

          {activeTab === 'rooms' && (
            <button
              onClick={() => setIsRoomModal(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              Tambah Ruangan
            </button>
          )}
        </div>
      </div>

      {activeTab === 'rooms' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((r) => (
            <div key={r.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
                    {r.code}
                  </span>
                  <span className="text-xs text-neutral-400">{r.floor || 'Lantai 1'}</span>
                </div>
                <h3 className="font-bold text-white text-base mb-1">{r.name}</h3>
                <p className="text-xs text-neutral-400 mb-3">Luas Area: {r.area_sqm} m²</p>

                <div className="space-y-1.5 text-xs bg-neutral-950 p-3 rounded-xl border border-neutral-800 mb-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Theater Style:</span>
                    <strong className="text-white">{r.capacity_theater} Kursi</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Classroom Style:</span>
                    <strong className="text-white">{r.capacity_classroom} Meja & Kursi</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Tarif Sewa:</span>
                    <strong className="text-amber-400">Rp {Number(r.rate_per_hour).toLocaleString('id-ID')}/jam</strong>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-800 flex justify-end">
                <button
                  onClick={async () => {
                    if (confirm(`Hapus ruangan ${r.name}?`)) {
                      await banquetApi.deleteRoom(r.id);
                      loadData();
                    }
                  }}
                  className="text-neutral-500 hover:text-rose-400 p-1.5 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((p) => (
            <div key={p.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
                    {p.code}
                  </span>
                  <span className="text-xs uppercase bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded">
                    {p.category}
                  </span>
                </div>
                <h3 className="font-bold text-white text-base mb-1">{p.name}</h3>
                <p className="text-xs text-neutral-400 mb-3">{p.description || 'Paket pertemuan profesional'}</p>

                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 mb-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Harga Per Pax:</span>
                    <strong className="text-amber-400">Rp {Number(p.price_per_pax).toLocaleString('id-ID')}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Min. Pesanan:</span>
                    <strong className="text-white">{p.min_pax} Pax</strong>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah Ruang */}
      {isRoomModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 text-white space-y-4">
            <h3 className="font-bold text-base text-amber-400">Tambah Ruang Banquet / Meeting Baru</h3>
            <form onSubmit={handleSaveRoom} className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">Nama Ruangan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Meeting Room Melati"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-neutral-400 block mb-1">Kode Ruangan *</label>
                  <input
                    type="text"
                    required
                    placeholder="RM-MLT-01"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Lantai</label>
                  <input
                    type="text"
                    value={roomFloor}
                    onChange={(e) => setRoomFloor(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-neutral-400 block mb-1">Kapasitas Classroom</label>
                  <input
                    type="number"
                    value={capClassroom}
                    onChange={(e) => setCapClassroom(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Tarif Per Jam (Rp)</label>
                  <input
                    type="number"
                    value={rateHour}
                    onChange={(e) => setRateHour(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsRoomModal(false)}
                  className="px-3 py-1.5 text-neutral-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-4 py-2 rounded-xl transition"
                >
                  Simpan Ruangan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
