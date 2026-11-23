import React, { useState, useEffect } from 'react';
import { Car, Ticket, CreditCard, CheckCircle2, RefreshCw } from 'lucide-react';
import { parkingApi } from '../../services/parkingApi';
import type { ParkingTicket, ParkingGate } from '../../types/parking';

export const ParkingCashierView: React.FC = () => {
  const [tickets, setTickets] = useState<ParkingTicket[]>([]);
  const [gates, setGates] = useState<ParkingGate[]>([]);

  // Check-in form
  const [plateIn, setPlateIn] = useState<string>('');
  const [vehicleType, setVehicleType] = useState<string>('car');
  const [entryGateId, setEntryGateId] = useState<number>(1);

  // Check-out / scanner
  const [searchBarcode, setSearchBarcode] = useState<string>('');
  const [activeTicket, setActiveTicket] = useState<ParkingTicket | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [pulseMessage, setPulseMessage] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      const [tData, gData] = await Promise.all([
        parkingApi.getTickets({ status: 'parked' }),
        parkingApi.getGates(),
      ]);
      setTickets(tData);
      setGates(gData);
      if (gData.length > 0 && !entryGateId) {
        setEntryGateId(gData[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      // loaded
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateIn) return;
    try {
      const res = await parkingApi.checkIn(plateIn, vehicleType, entryGateId);
      if (res.status === 'error') {
        alert(res.message || 'Gagal cetak tiket');
        return;
      }
      setPlateIn('');
      loadAll();
      alert(`Tiket Berhasil Dicetak!\nNo: ${res.data.ticket_number}\nPlat: ${res.data.plate_number}`);
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem');
    }
  };

  const handleLookupTicket = async (barcodeOrPlate: string | number) => {
    if (!barcodeOrPlate) return;
    try {
      const ticket = await parkingApi.getTicket(barcodeOrPlate);
      if (ticket) {
        setActiveTicket(ticket);
      } else {
        alert('Tiket tidak ditemukan');
      }
    } catch (err) {
      alert('Tiket atau kendaraan tidak ditemukan');
    }
  };

  const handleCheckOut = async () => {
    if (!activeTicket) return;
    try {
      const res = await parkingApi.checkOut(activeTicket.id, {
        payment_method: paymentMethod,
        exit_gate_id: 2,
      });

      if (res.status === 'error') {
        alert(res.message || 'Gagal menyelesaikan tiket');
        return;
      }

      alert(`Selesai! Palang Keluar Dibuka.\nBiaya: Rp ${Number(res.data.parking_fee).toLocaleString('id-ID')}\nBayar: Rp ${Number(res.data.paid_amount).toLocaleString('id-ID')} (${res.data.payment_method})`);
      setActiveTicket(null);
      setSearchBarcode('');
      loadAll();
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem');
    }
  };

  const handlePulseGate = async (gateId: number) => {
    try {
      const res = await parkingApi.pulseGate(gateId, 'open');
      setPulseMessage(res.message || 'Palang gerbang terbuka!');
      setTimeout(() => setPulseMessage(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 bg-neutral-950 text-white flex flex-col min-h-0 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-cyan-400 flex items-center gap-2">
            <Car className="w-6 h-6" />
            Pos Parkir & Barrier Gate Terintegrasi
          </h1>
          <p className="text-sm text-neutral-400">
            Pencatatan kendaraan masuk/keluar, hitung tarif durasi, validasi tamu hotel gratis, dan kendali palang otomatis.
          </p>
        </div>

        {pulseMessage && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 animate-pulse">
            <CheckCircle2 className="w-4 h-4" />
            {pulseMessage}
          </div>
        )}
      </div>

      {/* Gates Control Bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-400">STATUS GERBANG FISIK:</span>
          {gates.map((g) => (
            <div key={g.id} className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-xl text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="font-semibold text-white">{g.gate_name}</span>
              <button
                onClick={() => handlePulseGate(g.id)}
                className="bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-0.5 rounded text-[11px] font-bold transition ml-2"
              >
                Buka Palang
              </button>
            </div>
          ))}
        </div>

        <button onClick={loadAll} className="text-neutral-400 hover:text-white text-xs flex items-center gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
        </button>
      </div>

      {/* Main Grid: Pos Masuk & Pos Keluar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pos Masuk (Cetak Tiket) */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-base text-cyan-400 flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            Pos Masuk Kendaraan (Entry Gate)
          </h3>
          <p className="text-xs text-neutral-400">Input nomor plat kendaraan atau scan ANPR kamera gerbang masuk.</p>

          <form onSubmit={handleCheckIn} className="space-y-4 text-xs md:text-sm">
            <div>
              <label className="text-neutral-400 block mb-1">Nomor Plat Kendaraan *</label>
              <input
                type="text"
                required
                placeholder="Contoh: B 1234 ABC"
                value={plateIn}
                onChange={(e) => setPlateIn(e.target.value.toUpperCase())}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white font-mono text-base font-bold tracking-wider uppercase focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-neutral-400 block mb-1">Jenis Kendaraan</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                >
                  <option value="car">Mobil (Roda 4)</option>
                  <option value="motorcycle">Motor (Roda 2)</option>
                  <option value="bus">Bus / Truk Pariwisata</option>
                </select>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Pintu Gerbang</label>
                <select
                  value={entryGateId}
                  onChange={(e) => setEntryGateId(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white"
                >
                  {gates.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.gate_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-cyan-600/20 text-sm"
            >
              Cetak Tiket & Buka Palang Masuk
            </button>
          </form>
        </div>

        {/* Pos Keluar & Pembayaran */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-base text-cyan-400 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Pos Keluar & Kasir Parkir (Exit Gate)
          </h3>
          <p className="text-xs text-neutral-400">Scan barcode tiket atau cari berdasarkan nomor plat kendaraan.</p>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Scan Barcode Tiket (PRK...) atau ID..."
              value={searchBarcode}
              onChange={(e) => setSearchBarcode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookupTicket(searchBarcode)}
              className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={() => handleLookupTicket(searchBarcode)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition"
            >
              Cari
            </button>
          </div>

          {activeTicket ? (
            <div className="bg-neutral-950 border border-cyan-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <div>
                  <span className="font-mono text-xs text-cyan-400 font-bold">{activeTicket.ticket_number}</span>
                  <h4 className="text-lg font-mono font-bold text-white">{activeTicket.plate_number}</h4>
                </div>
                <span className="text-xs uppercase bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded">
                  {activeTicket.vehicle_type}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400">
                <div>
                  Jam Masuk: <strong className="text-white">{new Date(activeTicket.entry_time).toLocaleTimeString('id-ID')}</strong>
                </div>
                <div>
                  Durasi: <strong className="text-cyan-400">{activeTicket.current_duration_minutes || 1} Menit</strong>
                </div>
              </div>

              <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800 flex items-center justify-between">
                <span className="text-xs text-neutral-400">Total Tarif Parkir:</span>
                <span className="text-xl font-bold text-cyan-400">
                  Rp {Number(activeTicket.current_estimated_fee || 0).toLocaleString('id-ID')}
                </span>
              </div>

              {/* Pilihan Metode Bayar */}
              <div className="space-y-1.5 text-xs">
                <label className="text-neutral-400 block">Metode Pembayaran / Validasi Tamu</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 rounded-xl font-semibold border transition ${
                      paymentMethod === 'cash'
                        ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
                        : 'border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    Tunai / Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qris')}
                    className={`py-2 rounded-xl font-semibold border transition ${
                      paymentMethod === 'qris'
                        ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
                        : 'border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    QRIS
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('hotel_complimentary')}
                    className={`py-2 rounded-xl font-semibold border transition ${
                      paymentMethod === 'hotel_complimentary'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                        : 'border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    Tamu Hotel (Free)
                  </button>
                </div>
              </div>

              <button
                onClick={handleCheckOut}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-sm transition"
              >
                Proses Keluar & Buka Palang
              </button>
            </div>
          ) : (
            <div className="bg-neutral-950 border border-neutral-850 rounded-2xl p-8 text-center text-neutral-500 text-xs">
              Pilih tiket parkir aktif di tabel bawah atau scan barcode untuk memproses keluar.
            </div>
          )}
        </div>
      </div>

      {/* Tabel Kendaraan Parkir Aktif */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Car className="w-4 h-4 text-cyan-400" />
            Kendaraan Sedang Parkir ({tickets.length} Unit)
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-4">No. Tiket</th>
                <th className="py-2.5 px-4">Nomor Plat</th>
                <th className="py-2.5 px-4">Jenis</th>
                <th className="py-2.5 px-4">Jam Masuk</th>
                <th className="py-2.5 px-4">Gerbang Masuk</th>
                <th className="py-2.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-neutral-300">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-neutral-500">
                    Tidak ada kendaraan di dalam area parkir saat ini.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-neutral-850 transition">
                    <td className="py-2.5 px-4 font-mono font-semibold text-cyan-400">{t.ticket_number}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-white text-sm">{t.plate_number}</td>
                    <td className="py-2.5 px-4 uppercase text-neutral-400">{t.vehicle_type}</td>
                    <td className="py-2.5 px-4 text-neutral-400">{new Date(t.entry_time).toLocaleString('id-ID')}</td>
                    <td className="py-2.5 px-4 text-neutral-400">{t.entry_gate_name || 'Gerbang Masuk'}</td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleLookupTicket(t.id)}
                        className="bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600 hover:text-white px-2.5 py-1 rounded-lg text-xs font-semibold transition"
                      >
                        Pilih Keluar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
