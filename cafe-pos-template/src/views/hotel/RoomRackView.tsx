import React, { useState, useEffect } from 'react';
import { 
  Grid, AlertCircle, RefreshCw, 
  DoorClosed, Sparkles, User, CreditCard, LogIn, Wrench
} from 'lucide-react';
import { hotelApi } from '../../services/hotelApi';
import type { HotelRoom, RoomStatus } from '../../types/hotel';

interface RoomRackViewProps {
  onOpenBookingModal?: (room?: HotelRoom) => void;
  onOpenFolio?: (bookingId: number) => void;
}

export const RoomRackView: React.FC<RoomRackViewProps> = ({ onOpenBookingModal, onOpenFolio }) => {
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<HotelRoom | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const data = await hotelApi.getRooms();
      setRooms(data);
    } catch (err: any) {
      alert(err.message || 'Gagal memuat data kamar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const floors = Array.from(new Set(rooms.map(r => r.floor))).sort((a, b) => a - b);

  const filteredRooms = rooms.filter(r => {
    const matchFloor = selectedFloor === 'all' || r.floor === selectedFloor;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchFloor && matchStatus;
  });

  const getStatusBadge = (status: RoomStatus) => {
    switch (status) {
      case 'vacant_clean':
        return { label: 'Vacant Clean', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-300', dot: 'bg-emerald-500' };
      case 'vacant_dirty':
        return { label: 'Vacant Dirty', color: 'bg-amber-500/10 text-amber-700 border-amber-300', dot: 'bg-amber-500' };
      case 'occupied_clean':
        return { label: 'Occupied Clean', color: 'bg-blue-500/10 text-blue-700 border-blue-300', dot: 'bg-blue-500' };
      case 'occupied_dirty':
        return { label: 'Occupied Dirty', color: 'bg-purple-500/10 text-purple-700 border-purple-300', dot: 'bg-purple-500' };
      case 'inspected':
        return { label: 'Inspected', color: 'bg-teal-500/10 text-teal-700 border-teal-300', dot: 'bg-teal-500' };
      case 'maintenance':
      case 'out_of_service':
        return { label: 'Out of Order', color: 'bg-rose-500/10 text-rose-700 border-rose-300', dot: 'bg-rose-500' };
      default:
        return { label: status, color: 'bg-neutral-100 text-neutral-700 border-neutral-300', dot: 'bg-neutral-400' };
    }
  };

  const handleQuickStatus = async (room: HotelRoom, newStatus: RoomStatus) => {
    try {
      setActionLoading(true);
      await hotelApi.updateRoomStatus(room.id, newStatus);
      await fetchRooms();
      setSelectedRoom(null);
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui status kamar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickClean = async (roomId: number) => {
    try {
      setActionLoading(true);
      await hotelApi.quickCleanRoom(roomId);
      await fetchRooms();
      setSelectedRoom(null);
    } catch (err: any) {
      alert(err.message || 'Gagal membersihkan kamar');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-100 overflow-hidden p-4 md:p-6">
      {/* Top Header & Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-neutral-200 mb-4 shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-amber-600/10 text-amber-700 flex items-center justify-center font-bold">
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-neutral-900 leading-tight">Denah & Status Kamar (Room Rack)</h1>
            <p className="text-xs text-neutral-500">Monitor status okupansi, kebersihan, dan pemeliharaan unit kamar</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Floor selector */}
          <div className="flex items-center bg-neutral-100 rounded-xl p-1 text-xs font-semibold">
            <button
              onClick={() => setSelectedFloor('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${selectedFloor === 'all' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              Semua Lantai
            </button>
            {floors.map(f => (
              <button
                key={f}
                onClick={() => setSelectedFloor(f)}
                className={`px-3 py-1.5 rounded-lg transition-all ${selectedFloor === f ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'}`}
              >
                Lantai {f}
              </button>
            ))}
          </div>

          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-neutral-100 border-none text-xs font-semibold text-neutral-700 rounded-xl px-3 py-2 outline-none cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="vacant_clean">Vacant Clean</option>
            <option value="vacant_dirty">Vacant Dirty</option>
            <option value="occupied_clean">Occupied Clean</option>
            <option value="occupied_dirty">Occupied Dirty</option>
            <option value="inspected">Inspected</option>
            <option value="maintenance">Out of Order</option>
          </select>

          <button
            onClick={fetchRooms}
            className="p-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl transition-all"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Room Grid */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-neutral-400 text-sm">
            Memuat denah kamar...
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-dashed border-neutral-300 text-neutral-400 p-6 text-center">
            <DoorClosed className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm font-bold text-neutral-600">Tidak ada kamar ditemukan</p>
            <p className="text-xs">Coba sesuaikan filter lantai atau status</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pb-6">
            {filteredRooms.map(room => {
              const badge = getStatusBadge(room.status);
              const isOccupied = room.status.startsWith('occupied');

              return (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className={`bg-white rounded-2xl p-3.5 border transition-all cursor-pointer hover:shadow-md relative flex flex-col justify-between ${
                    isOccupied ? 'border-blue-200 bg-blue-50/20' : 'border-neutral-200 hover:border-amber-400'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-2">
                      <span className="text-lg font-black text-neutral-900 tracking-tight">
                        #{room.room_number}
                      </span>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                        Lt {room.floor}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-neutral-800 line-clamp-1">{room.room_type_name}</p>
                    <p className="text-[11px] text-neutral-500 font-semibold mb-3">
                      Rp {Number(room.base_price || 0).toLocaleString('id-ID')}/mlm
                    </p>

                    {isOccupied && room.guest_name && (
                      <div className="bg-blue-100/60 rounded-xl p-2 mb-2">
                        <div className="flex items-center gap-1.5 text-blue-900 text-xs font-bold truncate">
                          <User className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{room.guest_name}</span>
                        </div>
                        {room.booking_number && (
                          <span className="text-[10px] text-blue-700 block truncate mt-0.5">
                            {room.booking_number}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-bold ${badge.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                    <span className="truncate">{badge.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Room Action Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between mb-4 border-b border-neutral-100 pb-3">
              <div>
                <span className="text-[11px] font-extrabold uppercase text-amber-600 tracking-wider">Detail Kamar</span>
                <h3 className="text-xl font-black text-neutral-900">Kamar #{selectedRoom.room_number}</h3>
                <p className="text-xs text-neutral-500">{selectedRoom.room_type_name} • Lantai {selectedRoom.floor}</p>
              </div>
              <button 
                onClick={() => setSelectedRoom(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Current status overview */}
            <div className="bg-neutral-50 rounded-2xl p-3.5 border border-neutral-100 mb-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">Status Saat Ini:</span>
                <span className="font-bold text-neutral-800 capitalize">{selectedRoom.status.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Harga Dasar:</span>
                <span className="font-bold text-neutral-800">Rp {Number(selectedRoom.base_price || 0).toLocaleString('id-ID')}/malam</span>
              </div>
              {selectedRoom.guest_name && (
                <>
                  <div className="flex justify-between border-t border-neutral-200 pt-2">
                    <span className="text-neutral-500">Tamu Menginap:</span>
                    <span className="font-bold text-blue-800">{selectedRoom.guest_name}</span>
                  </div>
                  {selectedRoom.guest_phone && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">No. Telepon:</span>
                      <span className="font-semibold text-neutral-700">{selectedRoom.guest_phone}</span>
                    </div>
                  )}
                  {selectedRoom.check_in_date && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Periode Sewa:</span>
                      <span className="font-semibold text-neutral-700">{selectedRoom.check_in_date} s/d {selectedRoom.check_out_date}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase text-neutral-400 tracking-wider block mb-1">Aksi Cepat</span>

              {/* If vacant, allow new reservation / walk-in */}
              {!selectedRoom.active_booking_id && (
                <button
                  onClick={() => {
                    const r = selectedRoom;
                    setSelectedRoom(null);
                    if (onOpenBookingModal) onOpenBookingModal(r);
                  }}
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <LogIn className="w-4 h-4" /> Check-In / Walk-in Kamar Ini
                </button>
              )}

              {/* If occupied, view folio */}
              {selectedRoom.active_booking_id && onOpenFolio && (
                <button
                  onClick={() => {
                    const bId = selectedRoom.active_booking_id!;
                    setSelectedRoom(null);
                    onOpenFolio(bId);
                  }}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <CreditCard className="w-4 h-4" /> Lihat Folio Tagihan Tamu
                </button>
              )}

              {/* Quick Housekeeping status toggle */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  disabled={actionLoading}
                  onClick={() => handleQuickClean(selectedRoom.id)}
                  className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Tandai Bersih (Clean)
                </button>

                <button
                  disabled={actionLoading}
                  onClick={() => handleQuickStatus(selectedRoom, selectedRoom.active_booking_id ? 'occupied_dirty' : 'vacant_dirty')}
                  className="py-2 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <AlertCircle className="w-3.5 h-3.5" /> Tandai Kotor (Dirty)
                </button>
              </div>

              {/* Maintenance Toggle */}
              <button
                disabled={actionLoading}
                onClick={() => handleQuickStatus(selectedRoom, selectedRoom.status === 'maintenance' ? 'vacant_clean' : 'maintenance')}
                className="w-full py-2 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Wrench className="w-3.5 h-3.5" />
                {selectedRoom.status === 'maintenance' ? 'Selesai Perbaikan (Kembali Aktif)' : 'Set Status Perbaikan (Maintenance)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
