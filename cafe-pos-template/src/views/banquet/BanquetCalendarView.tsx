import React, { useState, useEffect } from 'react';
import { Clock, Building, Sparkles } from 'lucide-react';
import { banquetApi } from '../../services/banquetApi';
import type { BanquetRoom, BanquetBooking } from '../../types/banquet';

interface Props {
  onOpenBookingModal?: (room?: BanquetRoom) => void;
}

export const BanquetCalendarView: React.FC<Props> = ({ onOpenBookingModal }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [rooms, setRooms] = useState<BanquetRoom[]>([]);
  const [bookings, setBookings] = useState<BanquetBooking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await banquetApi.getTimeline(selectedDate);
      setRooms(data.rooms || []);
      setBookings(data.bookings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

  return (
    <div className="flex-1 bg-neutral-950 text-white flex flex-col min-h-0 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2 text-amber-400">
            <Building className="w-6 h-6" />
            Denah & Timeline Ruang Banquet / Meeting
          </h1>
          <p className="text-sm text-neutral-400">
            Jadwal reservasi ruangan, kapasitas layout, dan status okupansi waktu nyata.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-neutral-900 border border-neutral-700 px-3 py-2 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
          />
          {onOpenBookingModal && (
            <button
              onClick={() => onOpenBookingModal()}
              className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition"
            >
              <Sparkles className="w-4 h-4" />
              Reservasi Acara Baru
            </button>
          )}
        </div>
      </div>

      {/* Room Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rooms.map((room) => {
          const roomBookings = bookings.filter((b) => b.banquet_room_id === room.id);
          return (
            <div
              key={room.id}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-600/50 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-md border border-amber-500/20">
                    {room.code}
                  </span>
                  <span className="text-xs text-neutral-400">{room.floor || 'Lantai 1'}</span>
                </div>
                <h3 className="font-bold text-white text-base mb-1">{room.name}</h3>
                <p className="text-xs text-neutral-400 mb-3">Luas: {room.area_sqm} m²</p>

                <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 mb-3">
                  <div>
                    <span className="text-neutral-500">Classroom:</span>{' '}
                    <strong className="text-white">{room.capacity_classroom} pax</strong>
                  </div>
                  <div>
                    <span className="text-neutral-500">Theater:</span>{' '}
                    <strong className="text-white">{room.capacity_theater} pax</strong>
                  </div>
                  <div>
                    <span className="text-neutral-500">U-Shape:</span>{' '}
                    <strong className="text-white">{room.capacity_u_shape} pax</strong>
                  </div>
                  <div>
                    <span className="text-neutral-500">Round Banquet:</span>{' '}
                    <strong className="text-white">{room.capacity_banquet} pax</strong>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
                <span className="text-neutral-400">
                  Rp {Number(room.rate_per_hour).toLocaleString('id-ID')}/jam
                </span>
                <span className="font-semibold text-amber-400">
                  {roomBookings.length} acara hari ini
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Timeline Grid */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 md:p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          Gantt Chart Jadwal Slot Acara ({selectedDate})
        </h3>

        {loading ? (
          <div className="text-center py-10 text-neutral-500 text-sm">Memuat timeline...</div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-10 text-neutral-500 text-sm">Belum ada ruangan banquet</div>
        ) : (
          <div className="space-y-4 overflow-x-auto">
            {/* Hour Scale Header */}
            <div className="grid grid-cols-15 gap-1 min-w-[700px] border-b border-neutral-800 pb-2 text-xs text-neutral-400">
              <div className="col-span-3 font-semibold text-white">Ruangan</div>
              <div className="col-span-12 grid grid-cols-14 text-center">
                {hours.map((h) => (
                  <span key={h} className="text-[11px]">{h}:00</span>
                ))}
              </div>
            </div>

            {/* Room Rows */}
            {rooms.map((room) => {
              const roomBookings = bookings.filter((b) => b.banquet_room_id === room.id);
              return (
                <div key={room.id} className="grid grid-cols-15 gap-1 min-w-[700px] items-center py-2 border-b border-neutral-850">
                  <div className="col-span-3 pr-2">
                    <p className="text-xs font-bold text-white truncate">{room.name}</p>
                    <p className="text-[10px] text-neutral-500">{room.code}</p>
                  </div>
                  <div className="col-span-12 grid grid-cols-14 gap-1 h-9 bg-neutral-950 rounded-xl p-1 relative border border-neutral-800">
                    {roomBookings.map((b) => {
                      const startH = new Date(b.start_time).getHours();
                      const endH = new Date(b.end_time).getHours();
                      const leftIndex = Math.max(0, startH - 8);
                      const widthHours = Math.max(1, endH - startH);

                      return (
                        <div
                          key={b.id}
                          className="absolute top-1 bottom-1 bg-amber-600/80 hover:bg-amber-500 text-white text-[10px] rounded-lg px-2 flex items-center justify-between overflow-hidden shadow-sm border border-amber-400/40 cursor-pointer"
                          style={{
                            left: `${(leftIndex / 14) * 100}%`,
                            width: `${(widthHours / 14) * 100}%`,
                          }}
                          title={`${b.event_name} (${b.customer_name}) - ${b.layout_type}`}
                        >
                          <span className="font-bold truncate">{b.event_name}</span>
                          <span className="text-[9px] opacity-80 shrink-0 ml-1">{b.pax_count}pax</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
