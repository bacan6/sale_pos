import React, { useState, useEffect } from 'react';
import { Unlock, Key, RefreshCw, Battery, Clock } from 'lucide-react';
import { parkingApi } from '../../services/parkingApi';
import type { SmartLock, SmartLockLog } from '../../types/parking';

export const SmartLockManagementView: React.FC = () => {
  const [locks, setLocks] = useState<SmartLock[]>([]);
  const [logs, setLogs] = useState<SmartLockLog[]>([]);
  const [unlockMessage, setUnlockMessage] = useState<string | null>(null);

  // Passcode modal
  const [activeLockForPin, setActiveLockForPin] = useState<SmartLock | null>(null);
  const [customPin, setCustomPin] = useState<string>('');
  const [validHours, setValidHours] = useState<number>(24);

  const loadData = async () => {
    try {
      const [lData, logData] = await Promise.all([
        parkingApi.getSmartLocks(),
        parkingApi.getAccessLogs(),
      ]);
      setLocks(lData);
      setLogs(logData);
    } catch (e) {
      console.error(e);
    } finally {
      // loaded
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRemoteUnlock = async (lock: SmartLock) => {
    try {
      await parkingApi.remoteUnlock(lock.id, 5);
      setUnlockMessage(`Gerbang/Pintu '${lock.device_name}' berhasil DIBUKA secara remote!`);
      setTimeout(() => setUnlockMessage(null), 3000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal membuka kunci remote');
    }
  };

  const handleGeneratePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLockForPin) return;
    try {
      const res = await parkingApi.generatePasscode(activeLockForPin.id, validHours, customPin || undefined);
      alert(`Passcode Baru Berhasil Dibuat!\nPIN: ${res.data.passcode}\nBerlaku Hingga: ${res.data.expires_at}`);
      setActiveLockForPin(null);
      setCustomPin('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal membuat passcode');
    }
  };

  return (
    <div className="flex-1 bg-neutral-950 text-white flex flex-col min-h-0 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-cyan-400 flex items-center gap-2">
            <Key className="w-6 h-6" />
            Smart Lock & IoT Access Control Gateway
          </h1>
          <p className="text-sm text-neutral-400">
            Kendali kunci pintu digital kamar hotel, ruang rapat banquet, palang barrier gate, dan histori akses sensor.
          </p>
        </div>

        <button onClick={loadData} className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5">
          <RefreshCw className="w-4 h-4" /> Sinkronisasi Status
        </button>
      </div>

      {unlockMessage && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Unlock className="w-4 h-4" />
          {unlockMessage}
        </div>
      )}

      {/* Smart Locks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locks.map((lock) => (
          <div
            key={lock.id}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between hover:border-cyan-600/50 transition"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20">
                  {lock.device_code}
                </span>
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Battery className="w-3.5 h-3.5 text-emerald-400" />
                    {lock.battery_level}%
                  </span>
                </div>
              </div>

              <h3 className="font-bold text-white text-base mb-1">{lock.device_name}</h3>
              <p className="text-xs text-neutral-400 mb-3 capitalize">
                Tipe: {lock.lock_type.replace('_', ' ')} • {lock.device_model}
              </p>

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1.5 text-xs mb-4">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Status Kunci:</span>
                  <span className={`font-semibold ${lock.is_locked ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {lock.is_locked ? 'TERKUNCI' : 'TERBUKA'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">PIN Aktif:</span>
                  <strong className="text-cyan-400 font-mono">{lock.current_passcode || '123456'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">IP / MAC:</span>
                  <span className="text-neutral-400 font-mono text-[11px]">{lock.mac_address || 'WiFi Node'}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800 flex gap-2">
              <button
                onClick={() => handleRemoteUnlock(lock)}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Unlock className="w-3.5 h-3.5" /> Buka Kunci
              </button>
              <button
                onClick={() => setActiveLockForPin(lock)}
                className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
              >
                <Key className="w-3.5 h-3.5" /> Buat PIN
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Access Logs */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Histori Pembukaan Akses & Sensor IoT (Terbaru)
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Waktu</th>
                <th className="py-2.5 px-4">Perangkat</th>
                <th className="py-2.5 px-4">Metode Akses</th>
                <th className="py-2.5 px-4">Kredensial</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-neutral-300">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-neutral-500">
                    Belum ada riwayat aktivitas akses tercatat.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-neutral-850 transition">
                    <td className="py-2.5 px-4 text-neutral-400 font-mono">{l.timestamp}</td>
                    <td className="py-2.5 px-4 font-semibold text-white">{l.device_name || `Lock #${l.smart_lock_id}`}</td>
                    <td className="py-2.5 px-4 uppercase text-[11px] text-cyan-400 font-mono">{l.auth_method}</td>
                    <td className="py-2.5 px-4 font-mono text-neutral-300">{l.credential_identifier || '-'}</td>
                    <td className="py-2.5 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 uppercase">
                        {l.access_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-neutral-400 text-xs">{l.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal PIN Generator */}
      {activeLockForPin && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-sm p-6 text-white space-y-4">
            <h3 className="font-bold text-base text-cyan-400">Buat Passcode Akses Baru</h3>
            <p className="text-xs text-neutral-400">
              Perangkat: <strong>{activeLockForPin.device_name}</strong> ({activeLockForPin.device_code})
            </p>

            <form onSubmit={handleGeneratePin} className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">Passcode PIN 6-Digit (Kosongkan untuk otomatis)</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="Contoh: 882910"
                  value={customPin}
                  onChange={(e) => setCustomPin(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white font-mono text-center text-lg tracking-widest"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Masa Berlaku (Jam)</label>
                <select
                  value={validHours}
                  onChange={(e) => setValidHours(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                >
                  <option value={4}>4 Jam (Event Singkat)</option>
                  <option value={12}>12 Jam (Setengah Hari)</option>
                  <option value={24}>24 Jam (1 Hari Menginap)</option>
                  <option value={72}>72 Jam (3 Hari)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setActiveLockForPin(null)}
                  className="px-3 py-1.5 text-neutral-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-4 py-2 rounded-xl transition"
                >
                  Buat PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
