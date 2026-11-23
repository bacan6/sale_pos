import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, 
  Plus, User, ArrowRight, Sparkles,
  CalendarDays
} from 'lucide-react';
import { hotelApi } from '../../services/hotelApi';
import type { HotelRoom, CalendarBookingSpan, TimelineCalendarData } from '../../types/hotel';

interface HotelTimelineCalendarViewProps {
  onOpenBookingModal?: (room: HotelRoom, selectedDate?: string) => void;
  onOpenFolio?: (bookingId: number) => void;
}

export const HotelTimelineCalendarView: React.FC<HotelTimelineCalendarViewProps> = ({
  onOpenBookingModal,
  onOpenFolio,
}) => {
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [dayCount, setDayCount] = useState<number>(14);
  const [data, setData] = useState<TimelineCalendarData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<CalendarBookingSpan | null>(null);

  const loadTimeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await hotelApi.getTimelineCalendar(startDate, dayCount);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat timeline okupansi kamar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimeline();
  }, [startDate, dayCount]);

  // Generate date array
  const dateList: string[] = [];
  if (startDate) {
    const base = new Date(startDate);
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      dateList.push(d.toISOString().split('T')[0]);
    }
  }

  const shiftDate = (days: number) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + days);
    setStartDate(d.toISOString().split('T')[0]);
  };

  const setToday = () => {
    setStartDate(new Date().toISOString().split('T')[0]);
  };

  const rooms = data?.rooms || [];

  // Filter rooms
  const filteredRooms = rooms.filter((r) => {
    if (selectedFloor !== 'all' && String(r.floor) !== selectedFloor) return false;
    if (selectedType !== 'all' && r.room_type_name !== selectedType) return false;
    return true;
  });

  const uniqueFloors = Array.from(new Set(rooms.map((r) => String(r.floor)))).sort();
  const uniqueTypes = Array.from(new Set(rooms.map((r) => r.room_type_name).filter(Boolean)));

  const isToday = (dateStr: string) => {
    return dateStr === new Date().toISOString().split('T')[0];
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-100 overflow-hidden">
      {/* Top Controls Toolbar */}
      <div className="bg-white border-b border-neutral-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-700 rounded-xl">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-neutral-900 leading-tight">Timeline & Okupansi Kamar</h1>
            <p className="text-xs text-neutral-500 font-medium">Gantt chart jadwal reservasi dan ketersediaan unit kamar</p>
          </div>
        </div>

        {/* Date Navigation & View Span */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs font-bold">
            <button
              onClick={() => shiftDate(-dayCount)}
              className="p-1.5 hover:bg-white rounded-lg text-neutral-600 transition-all"
              title="Periode Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={setToday}
              className="px-2.5 py-1 hover:bg-white rounded-lg text-neutral-700 text-[11px] font-bold transition-all"
            >
              Hari Ini
            </button>
            <button
              onClick={() => shiftDate(dayCount)}
              className="p-1.5 hover:bg-white rounded-lg text-neutral-600 transition-all"
              title="Periode Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Span Switcher (7 / 14 / 30) */}
          <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs font-bold">
            {[7, 14, 30].map((count) => (
              <button
                key={count}
                onClick={() => setDayCount(count)}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                  dayCount === count ? 'bg-white shadow-xs text-amber-700 font-black' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {count} Hari
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-1.5 text-xs">
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="bg-white border border-neutral-300 rounded-xl px-2.5 py-1.5 text-neutral-800 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Semua Lantai</option>
              {uniqueFloors.map((fl) => (
                <option key={fl} value={fl}>Lantai {fl}</option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-white border border-neutral-300 rounded-xl px-2.5 py-1.5 text-neutral-800 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Semua Tipe Kamar</option>
              {uniqueTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="bg-white/80 border-b border-neutral-200 px-5 py-2 flex items-center gap-5 text-xs text-neutral-600 font-medium overflow-x-auto shrink-0">
        <span className="font-bold text-neutral-800">Status:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-emerald-500"></span>
          <span>Checked In (Menginap)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-blue-500"></span>
          <span>Reserved (Dipesan)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-slate-400"></span>
          <span>Checked Out (Selesai)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md border border-dashed border-neutral-400 bg-neutral-100"></span>
          <span>Kosong (Klik untuk Reservasi)</span>
        </div>
      </div>

      {/* Main Gantt Grid Container */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-neutral-500 gap-2 font-medium">
            <Sparkles className="w-5 h-5 animate-spin text-amber-600" />
            <span>Memuat kalender timeline kamar...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm font-semibold">
            {error}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xs border border-neutral-200 overflow-hidden inline-block min-w-full">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 sticky top-0 z-10">
                  <th className="p-3 w-48 min-w-48 bg-neutral-50 font-bold text-xs text-neutral-700 border-r border-neutral-200 sticky left-0 z-20">
                    Kamar / Tipe
                  </th>
                  {dateList.map((dt) => {
                    const dObj = new Date(dt + 'T00:00:00');
                    const dayName = dObj.toLocaleDateString('id-ID', { weekday: 'short' });
                    const dateNum = dObj.getDate();
                    const monthName = dObj.toLocaleDateString('id-ID', { month: 'short' });
                    const today = isToday(dt);

                    return (
                      <th
                        key={dt}
                        className={`p-2 text-center border-r border-neutral-200 min-w-20 w-20 ${
                          today ? 'bg-amber-50/80 font-black text-amber-900' : 'text-neutral-600 font-semibold'
                        }`}
                      >
                        <div className="text-[10px] uppercase tracking-wider">{dayName}</div>
                        <div className={`text-xs mt-0.5 ${today ? 'font-black text-amber-700' : 'text-neutral-900 font-bold'}`}>
                          {dateNum} {monthName}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-xs">
                {filteredRooms.map((room) => {
                  return (
                    <tr key={room.id} className="hover:bg-neutral-50/50 transition-colors">
                      {/* Room Header Column */}
                      <td className="p-3 bg-white font-bold border-r border-neutral-200 sticky left-0 z-10 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center font-black text-xs text-neutral-800">
                              {room.room_number}
                            </span>
                            <div>
                              <div className="text-xs font-bold text-neutral-900 leading-tight">
                                Kamar #{room.room_number}
                              </div>
                              <div className="text-[10px] text-neutral-500 font-normal truncate max-w-28">
                                Lt. {room.floor} • {room.room_type_name}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Date Cells */}
                      {dateList.map((dt) => {
                        const today = isToday(dt);
                        
                        // Find booking that covers dt: dt >= check_in_date AND dt < check_out_date
                        const booking = room.bookings?.find((b) => {
                          return dt >= b.check_in_date && dt < b.check_out_date;
                        });

                        const isStart = booking && booking.check_in_date === dt;
                        const isEnd = booking && new Date(new Date(booking.check_out_date).getTime() - 86400000).toISOString().split('T')[0] === dt;

                        let bgClass = 'bg-transparent hover:bg-amber-50 cursor-pointer';
                        if (booking) {
                          if (booking.status === 'checked_in') {
                            bgClass = 'bg-emerald-500 text-white cursor-pointer shadow-xs hover:bg-emerald-600';
                          } else if (booking.status === 'reserved') {
                            bgClass = 'bg-blue-500 text-white cursor-pointer shadow-xs hover:bg-blue-600';
                          } else {
                            bgClass = 'bg-slate-400 text-white cursor-pointer hover:bg-slate-500';
                          }
                        }

                        return (
                          <td
                            key={dt}
                            onClick={() => {
                              if (booking) {
                                setSelectedBooking(booking);
                              } else if (onOpenBookingModal) {
                                onOpenBookingModal(room, dt);
                              }
                            }}
                            className={`p-1 border-r border-neutral-200 h-14 text-center align-middle relative transition-all ${
                              today && !booking ? 'bg-amber-50/30' : ''
                            }`}
                          >
                            {booking ? (
                              <div
                                className={`w-full h-11 flex flex-col items-center justify-center px-1 rounded-lg ${bgClass} transition-all`}
                                title={`${booking.guest_name} (${booking.booking_number}) - ${booking.status.toUpperCase()}`}
                              >
                                {isStart && (
                                  <span className="text-[10px] font-black leading-tight truncate w-full text-center">
                                    {booking.guest_name}
                                  </span>
                                )}
                                {!isStart && isEnd && (
                                  <span className="text-[9px] opacity-80 leading-tight">
                                    Check-out
                                  </span>
                                )}
                                {!isStart && !isEnd && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-white/70"></div>
                                )}
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <Plus className="w-4 h-4 text-amber-600" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-neutral-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400">Detail Reservasi Kamar</span>
                <h3 className="text-base font-black">{selectedBooking.booking_number}</h3>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                selectedBooking.status === 'checked_in' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                selectedBooking.status === 'reserved' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                'bg-slate-500/20 text-slate-300'
              }`}>
                {selectedBooking.status.replace('_', ' ')}
              </span>
            </div>

            <div className="p-5 space-y-4 text-xs text-neutral-700">
              <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-extrabold text-sm text-neutral-900">{selectedBooking.guest_name}</div>
                  <div className="text-neutral-500">{selectedBooking.guest_phone || 'Tanpa no. telepon'}</div>
                </div>
                {selectedBooking.vip_tier && selectedBooking.vip_tier !== 'regular' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300">
                    VIP {selectedBooking.vip_tier}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="text-[10px] font-bold text-neutral-500 uppercase">Check-in</div>
                  <div className="font-extrabold text-neutral-900 text-xs mt-0.5">{selectedBooking.check_in_date}</div>
                </div>
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="text-[10px] font-bold text-neutral-500 uppercase">Check-out</div>
                  <div className="font-extrabold text-neutral-900 text-xs mt-0.5">{selectedBooking.check_out_date}</div>
                </div>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Durasi Menginap:</span>
                  <span className="font-bold text-neutral-900">{selectedBooking.night_count} Malam</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Tarif / Malam:</span>
                  <span className="font-bold text-neutral-900">Rp {selectedBooking.rate_per_night?.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between border-t border-neutral-200 pt-1.5 font-bold">
                  <span className="text-neutral-700">Total Biaya Kamar:</span>
                  <span className="text-amber-700">Rp {selectedBooking.total_amount?.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-neutral-300 text-neutral-700 font-bold hover:bg-neutral-50 transition-all"
                >
                  Tutup
                </button>
                {selectedBooking.folio_id && onOpenFolio && (
                  <button
                    type="button"
                    onClick={() => {
                      const fId = selectedBooking.folio_id!;
                      setSelectedBooking(null);
                      onOpenFolio(fId);
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>Buka Folio & Kasir</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
