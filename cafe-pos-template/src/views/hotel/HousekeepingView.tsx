import React, { useState, useEffect } from 'react';
import { 
  Sparkles, CheckCircle2, AlertTriangle, RefreshCw, 
  Plus, User, Wrench, CheckCheck
} from 'lucide-react';
import { hotelApi } from '../../services/hotelApi';
import type { HotelRoom, HousekeepingTask } from '../../types/hotel';

export const HousekeepingView: React.FC = () => {
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [staff, setStaff] = useState<Array<{ id: number; full_name: string; username: string; role: string }>>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New task modal
  const [showTaskModal, setShowTaskModal] = useState<boolean>(false);
  const [taskRoomId, setTaskRoomId] = useState<number>(0);
  const [taskStaffId, setTaskStaffId] = useState<number | null>(null);
  const [taskType, setTaskType] = useState<string>('daily_cleaning');
  const [taskPriority, setTaskPriority] = useState<string>('medium');
  const [taskNotes, setTaskNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await hotelApi.getHousekeeping();
      setRooms(res.rooms || []);
      setTasks(res.tasks || []);
      setStaff(res.staff || []);
    } catch (err: any) {
      alert(err.message || 'Gagal mengambil data housekeeping');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleQuickClean = async (roomId: number) => {
    try {
      await hotelApi.quickCleanRoom(roomId);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui status kebersihan');
    }
  };

  const handleTaskStatus = async (taskId: number, status: string) => {
    try {
      await hotelApi.updateTaskStatus(taskId, status);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status tugas');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskRoomId) {
      alert('Pilih kamar');
      return;
    }

    try {
      setSubmitting(true);
      await hotelApi.createHousekeepingTask({
        room_id: taskRoomId,
        assigned_user_id: taskStaffId,
        task_type: taskType,
        priority: taskPriority,
        notes: taskNotes,
      });
      setShowTaskModal(false);
      setTaskRoomId(0);
      setTaskNotes('');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal membuat tugas');
    } finally {
      setSubmitting(false);
    }
  };

  const dirtyRooms = rooms.filter(r => r.status === 'vacant_dirty' || r.status === 'occupied_dirty');
  const cleanRooms = rooms.filter(r => r.status === 'vacant_clean' || r.status === 'occupied_clean' || r.status === 'inspected');
  const maintenanceRooms = rooms.filter(r => r.status === 'maintenance' || r.status === 'out_of_service');

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-100 overflow-hidden p-4 md:p-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-neutral-200 mb-4 shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-amber-600/10 text-amber-700 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-neutral-900 leading-tight">Housekeeping & Pemeliharaan Kamar</h1>
            <p className="text-xs text-neutral-500">Manajemen antrean pembersihan kamar, inspeksi, dan penugasan staf</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTaskModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Buat Tugas Baru
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

      {/* Status Highlights */}
      <div className="grid grid-cols-3 gap-3 mb-4 shrink-0 text-xs">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <span className="font-bold text-amber-900 text-[11px] uppercase">Perlu Dibersihkan (Dirty)</span>
            <p className="text-xl font-black text-amber-950 mt-0.5">{dirtyRooms.length} Kamar</p>
          </div>
          <AlertTriangle className="w-6 h-6 text-amber-600 opacity-60" />
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <span className="font-bold text-emerald-900 text-[11px] uppercase">Kamar Bersih (Clean)</span>
            <p className="text-xl font-black text-emerald-950 mt-0.5">{cleanRooms.length} Kamar</p>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-600 opacity-60" />
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <span className="font-bold text-rose-900 text-[11px] uppercase">Perbaikan (Maintenance)</span>
            <p className="text-xl font-black text-rose-950 mt-0.5">{maintenanceRooms.length} Kamar</p>
          </div>
          <Wrench className="w-6 h-6 text-rose-600 opacity-60" />
        </div>
      </div>

      {/* Split View: Left = Room Cleaning Board, Right = Housekeeping Tasks */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden min-h-0">
        
        {/* Left: Quick Room Clean Board */}
        <div className="flex-1 bg-white rounded-2xl border border-neutral-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-xs font-black text-neutral-900">Antrean Kamar Kotor (Quick Clean)</h2>
            <span className="text-[11px] font-bold text-neutral-400">{dirtyRooms.length} Kamar Menunggu</span>
          </div>

          <div className="flex-1 overflow-auto p-3">
            {dirtyRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-neutral-400 text-xs">
                <CheckCircle2 className="w-8 h-8 mb-2 text-emerald-500 opacity-70" />
                <p className="font-bold text-neutral-600">Semua kamar dalam kondisi bersih!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {dirtyRooms.map(r => (
                  <div key={r.id} className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm text-neutral-900">#{r.room_number}</span>
                        <span className="text-[10px] font-bold text-neutral-400">Lt {r.floor}</span>
                      </div>
                      <p className="text-[11px] text-neutral-600 font-semibold">{r.room_type_name}</p>
                      <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                        {r.status.replace('_', ' ')}
                      </span>
                    </div>

                    <button
                      onClick={() => handleQuickClean(r.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1 shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Selesai Bersih
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Assigned Tasks List */}
        <div className="flex-1 bg-white rounded-2xl border border-neutral-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-xs font-black text-neutral-900">Daftar Penugasan Staf</h2>
            <span className="text-[11px] font-bold text-neutral-400">{tasks.length} Tugas Tercatat</span>
          </div>

          <div className="flex-1 overflow-auto divide-y divide-neutral-100 text-xs">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-neutral-400">
                Belum ada tugas penugasan aktif
              </div>
            ) : (
              tasks.map(t => (
                <div key={t.id} className="p-3.5 hover:bg-neutral-50 transition-all flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-neutral-900">Kamar #{t.room_number}</span>
                      <span className="text-[10px] bg-neutral-100 font-bold px-1.5 py-0.5 rounded text-neutral-600 capitalize">
                        {t.task_type.replace('_', ' ')}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                        t.priority === 'urgent' ? 'bg-rose-100 text-rose-700' :
                        t.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        'bg-neutral-100 text-neutral-600'
                      }`}>
                        {t.priority}
                      </span>
                    </div>
                    {t.notes && <p className="text-neutral-500 text-[11px]">{t.notes}</p>}
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                      <User className="w-3 h-3" />
                      <span>{t.assigned_staff_name || 'Belum ditugaskan'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {t.status === 'pending' && (
                      <button
                        onClick={() => handleTaskStatus(t.id, 'in_progress')}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all"
                      >
                        Mulai
                      </button>
                    )}
                    {(t.status === 'pending' || t.status === 'in_progress') && (
                      <button
                        onClick={() => handleTaskStatus(t.id, 'completed')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all"
                      >
                        Selesai
                      </button>
                    )}
                    {t.status === 'completed' && (
                      <button
                        onClick={() => handleTaskStatus(t.id, 'inspected')}
                        className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Inspeksi OK
                      </button>
                    )}
                    {t.status === 'inspected' && (
                      <span className="text-teal-700 font-black text-[10px] bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                        Inspected
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* New Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-base font-black text-neutral-900 mb-3">Buat Tugas Housekeeping</h3>
            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">Pilih Kamar *</label>
                <select
                  value={taskRoomId}
                  onChange={(e) => setTaskRoomId(Number(e.target.value))}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-semibold text-neutral-800"
                  required
                >
                  <option value={0}>-- Pilih Kamar --</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      #{r.room_number} - {r.room_type_name} ({r.status.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Tugaskan ke Staf</label>
                <select
                  value={taskStaffId || ''}
                  onChange={(e) => setTaskStaffId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-semibold text-neutral-800"
                >
                  <option value="">-- Bebas (Siapa Saja) --</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name || s.username} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Jenis Pekerjaan</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-semibold text-neutral-800"
                  >
                    <option value="daily_cleaning">Pembersihan Harian</option>
                    <option value="checkout_cleaning">Pembersihan Check-out</option>
                    <option value="deep_cleaning">Deep Cleaning</option>
                    <option value="maintenance">Perbaikan / AC / Listrik</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Prioritas</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-semibold text-neutral-800"
                  >
                    <option value="low">Rendah (Low)</option>
                    <option value="medium">Sedang (Medium)</option>
                    <option value="high">Tinggi (High)</option>
                    <option value="urgent">Mendesak (Urgent)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Instruksi Khusus (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Ganti sprei, tambah handuk, perbaiki kran..."
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 outline-none font-medium resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Tugas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
