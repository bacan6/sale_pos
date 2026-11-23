import React, { useState, useEffect } from 'react';
import { 
  Shirt, Scale, Plus, Minus, Check, Sparkles, 
  MapPin, CreditCard, Building2, User, Clock, 
  AlertCircle, RefreshCw 
} from 'lucide-react';
import { laundryApi } from '../../services/laundryApi';
import { hotelApi } from '../../services/hotelApi';
import type { LaundryService, LaundryPerfume, LaundryRack } from '../../types/laundry';
import { LaundryCustomerTrackingModal } from './LaundryCustomerTrackingModal';

export const LaundryCashierView: React.FC = () => {
  const [services, setServices] = useState<LaundryService[]>([]);
  const [perfumes, setPerfumes] = useState<LaundryPerfume[]>([]);
  const [racks, setRacks] = useState<LaundryRack[]>([]);
  const [hotelBookings, setHotelBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Form State
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [serviceSpeed, setServiceSpeed] = useState<'regular' | 'express' | 'super_express'>('regular');
  const [selectedPerfumeId, setSelectedPerfumeId] = useState<number | null>(null);
  const [selectedRackId, setSelectedRackId] = useState<number | null>(null);
  const [selectedHotelBookingId, setSelectedHotelBookingId] = useState<number | null>(null);
  const [orderNotes, setOrderNotes] = useState<string>('');

  // Items State
  const [activeTypeTab, setActiveTypeTab] = useState<'kiloan' | 'satuan'>('kiloan');
  const [kiloanWeight, setKiloanWeight] = useState<number>(3.0);
  const [selectedKiloanServiceId, setSelectedKiloanServiceId] = useState<number | null>(null);
  const [satuanQuantities, setSatuanQuantities] = useState<Record<number, number>>({});

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'card' | 'room_charge' | 'unpaid'>('cash');
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);

  useEffect(() => {
    loadMasters();
  }, []);

  const loadMasters = async () => {
    setLoading(true);
    setError('');
    try {
      const [svcData, perfData, rackData] = await Promise.all([
        laundryApi.getServices({ active_only: 1 }),
        laundryApi.getPerfumes(),
        laundryApi.getRacks(),
      ]);
      setServices(svcData);
      setPerfumes(perfData);
      setRacks(rackData);

      // Default kiloan service
      const firstKiloan = svcData.find(s => s.type === 'kiloan');
      if (firstKiloan) setSelectedKiloanServiceId(firstKiloan.id);
      if (perfData.length > 0) setSelectedPerfumeId(perfData[0].id);
      if (rackData.length > 0) setSelectedRackId(rackData[0].id);

      // Try load checked-in hotel guests for room charge
      try {
        const bookings = await hotelApi.getBookings();
        const checkedIn = (bookings || []).filter((b: any) => b.status === 'checked_in');
        setHotelBookings(checkedIn);
      } catch (e) {
        // Hotel module might not be active, ignore
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat katalog layanan laundry');
    } finally {
      setLoading(false);
    }
  };

  const kiloanServices = services.filter(s => s.type === 'kiloan');
  const satuanServices = services.filter(s => s.type === 'satuan');

  // Calculation logic
  const selectedKiloanService = services.find(s => s.id === selectedKiloanServiceId);
  const kiloanSubtotal = selectedKiloanService && kiloanWeight > 0 
    ? Math.round(Number(selectedKiloanService.base_price) * kiloanWeight) 
    : 0;

  const satuanSubtotal = Object.entries(satuanQuantities).reduce((acc, [sId, qty]) => {
    if (qty <= 0) return acc;
    const svc = services.find(s => s.id === Number(sId));
    return acc + (svc ? Math.round(Number(svc.base_price) * qty) : 0);
  }, 0);

  const subtotal = kiloanSubtotal + satuanSubtotal;

  const speedMultiplier = serviceSpeed === 'express' ? 0.50 : serviceSpeed === 'super_express' ? 1.00 : 0.0;
  const speedSurcharge = Math.round(subtotal * speedMultiplier);

  const selectedPerfume = perfumes.find(p => p.id === selectedPerfumeId);
  const perfumeExtraUnit = selectedPerfume ? Number(selectedPerfume.price_extra) : 0;
  const perfumeSurcharge = kiloanWeight > 0 ? Math.round(perfumeExtraUnit * kiloanWeight) : Math.round(perfumeExtraUnit);

  const grandTotal = subtotal + speedSurcharge + perfumeSurcharge;

  const handleSatuanQtyChange = (serviceId: number, delta: number) => {
    setSatuanQuantities(prev => {
      const cur = prev[serviceId] || 0;
      const next = Math.max(0, cur + delta);
      return { ...prev, [serviceId]: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('Nama pelanggan wajib diisi');
      return;
    }

    const items: Array<{
      service_id?: number | null;
      item_name: string;
      quantity: number;
      unit_price: number;
    }> = [];

    // Add kiloan item if selected
    if (selectedKiloanService && kiloanWeight > 0) {
      items.push({
        service_id: selectedKiloanService.id,
        item_name: selectedKiloanService.name,
        quantity: kiloanWeight,
        unit_price: Number(selectedKiloanService.base_price),
      });
    }

    // Add satuan items
    Object.entries(satuanQuantities).forEach(([svcId, qty]) => {
      if (qty > 0) {
        const svc = services.find(s => s.id === Number(svcId));
        if (svc) {
          items.push({
            service_id: svc.id,
            item_name: svc.name,
            quantity: qty,
            unit_price: Number(svc.base_price),
          });
        }
      }
    });

    if (items.length === 0) {
      alert('Pilih minimal 1 layanan cucian (kiloan atau satuan)');
      return;
    }

    if (paymentMethod === 'room_charge' && !selectedHotelBookingId) {
      alert('Pilih kamar tamu hotel untuk pembebanan Room Charge');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const isInstantPay = paymentMethod !== 'unpaid';
      const res = await laundryApi.createOrder({
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        service_speed: serviceSpeed,
        perfume_id: selectedPerfumeId,
        rack_id: selectedRackId,
        hotel_booking_id: paymentMethod === 'room_charge' ? selectedHotelBookingId : null,
        notes: orderNotes.trim(),
        items,
        payment_method: isInstantPay ? paymentMethod : undefined,
        paid_amount: isInstantPay ? grandTotal : 0,
      });

      setCreatedOrderId(res.id);

      // Reset form
      setCustomerName('');
      setCustomerPhone('');
      setOrderNotes('');
      setSatuanQuantities({});
      setKiloanWeight(3.0);
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan pesanan laundry');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-neutral-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Memuat modul kasir laundry...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-neutral-950 text-neutral-100">
      {/* Left Form: Order Details & Services */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl flex items-center gap-3 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Customer Information Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
            <User className="w-4 h-4" />
            <span>Informasi Pelanggan</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Nama Pelanggan *</label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:border-cyan-500 transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Nomor WhatsApp / HP</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:border-cyan-500 transition"
              />
            </div>
          </div>

          {/* Speed Tiers */}
          <div>
            <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Kecepatan Layanan</label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'regular', label: 'Reguler', hours: '48 Jam', extra: 'Tarif Normal', color: 'border-neutral-700' },
                { id: 'express', label: 'Express', hours: '24 Jam', extra: '+50% Biaya', color: 'border-amber-500/40 text-amber-400' },
                { id: 'super_express', label: 'Kilat 6 Jam', hours: '6 Jam Selesai', extra: '+100% Biaya', color: 'border-rose-500/40 text-rose-400' },
              ].map(tier => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setServiceSpeed(tier.id as any)}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                    serviceSpeed === tier.id
                      ? 'bg-cyan-600/20 border-cyan-500 text-white shadow-xs'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="font-bold text-xs">{tier.label}</div>
                  <div className="text-[11px] text-neutral-300 mt-1">{tier.hours}</div>
                  <div className={`text-[10px] font-semibold mt-1 ${tier.color}`}>{tier.extra}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Services Selection: Kiloan vs Satuan */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
              <Shirt className="w-4 h-4" />
              <span>Pilihan Layanan Cucian</span>
            </div>

            {/* Segmented Switcher */}
            <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTypeTab('kiloan')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTypeTab === 'kiloan' ? 'bg-cyan-600 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Kiloan
              </button>
              <button
                type="button"
                onClick={() => setActiveTypeTab('satuan')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTypeTab === 'satuan' ? 'bg-cyan-600 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Satuan / Dry Clean
              </button>
            </div>
          </div>

          {activeTypeTab === 'kiloan' ? (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {kiloanServices.map(svc => (
                  <div
                    key={svc.id}
                    onClick={() => setSelectedKiloanServiceId(svc.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      selectedKiloanServiceId === svc.id
                        ? 'bg-cyan-600/15 border-cyan-500 text-white'
                        : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-white">{svc.name}</div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">{svc.description || 'Layanan timbang per kilogram'}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-xs text-cyan-400">Rp {Number(svc.base_price).toLocaleString('id-ID')}</div>
                      <div className="text-[9px] text-neutral-500">/ {svc.unit}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Weight Scale Input */}
              <div className="bg-neutral-950/60 border border-neutral-800 p-4 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">Timbangan Pakaian</div>
                    <div className="text-[10px] text-neutral-400">Total berat cucian kotor (kg)</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setKiloanWeight(prev => Math.max(0.5, Math.round((prev - 0.5) * 10) / 10))}
                    className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-white"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={kiloanWeight}
                    onChange={e => setKiloanWeight(Math.max(0.1, parseFloat(e.target.value) || 0))}
                    className="w-20 bg-neutral-900 border border-neutral-700 rounded-xl px-2 py-1.5 text-center font-black text-base text-cyan-400"
                  />
                  <span className="text-xs font-bold text-neutral-400">kg</span>
                  <button
                    type="button"
                    onClick={() => setKiloanWeight(prev => Math.round((prev + 0.5) * 10) / 10)}
                    className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Satuan Items Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {satuanServices.map(svc => {
                const qty = satuanQuantities[svc.id] || 0;
                return (
                  <div
                    key={svc.id}
                    className={`p-3.5 rounded-2xl border transition flex items-center justify-between ${
                      qty > 0
                        ? 'bg-cyan-600/10 border-cyan-500/50'
                        : 'bg-neutral-950/60 border-neutral-800'
                    }`}
                  >
                    <div className="flex-1 pr-2">
                      <div className="font-bold text-xs text-white">{svc.name}</div>
                      <div className="text-[11px] font-semibold text-cyan-400 mt-0.5">
                        Rp {Number(svc.base_price).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSatuanQtyChange(svc.id, -1)}
                        className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-300"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center font-bold text-xs text-white">{qty}</span>
                      <button
                        type="button"
                        onClick={() => handleSatuanQtyChange(svc.id, 1)}
                        className="w-7 h-7 rounded-lg bg-cyan-600 hover:bg-cyan-500 flex items-center justify-center text-white"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Perfume & Rack Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-neutral-800">
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Pilihan Aroma Parfum</span>
              </label>
              <select
                value={selectedPerfumeId || ''}
                onChange={e => setSelectedPerfumeId(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-500"
              >
                <option value="">-- Tanpa Parfum Khusus --</option>
                {perfumes.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {Number(p.price_extra) > 0 ? `(+Rp ${Number(p.price_extra).toLocaleString('id-ID')})` : '(Gratis)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1.5 font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Alokasi Rak Penyimpanan</span>
              </label>
              <select
                value={selectedRackId || ''}
                onChange={e => setSelectedRackId(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-500"
              >
                <option value="">-- Otomatis / Nanti --</option>
                {racks.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.code} - {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1 font-medium">Catatan Khusus Pakaian</label>
            <input
              type="text"
              value={orderNotes}
              onChange={e => setOrderNotes(e.target.value)}
              placeholder="Contoh: Ada noda oli di lengan kiri, pisahkan kain luntur"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Right Sidebar: Checkout & Settlement Panel */}
      <div className="w-full lg:w-96 bg-neutral-900 border-t lg:border-t-0 lg:border-l border-neutral-800 p-5 lg:p-6 flex flex-col justify-between shrink-0 space-y-6">
        <div className="space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <h3 className="font-black text-sm text-white">Ringkasan Tagihan</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold uppercase">
              {serviceSpeed}
            </span>
          </div>

          {/* Breakdown List */}
          <div className="space-y-2 text-xs">
            {selectedKiloanService && kiloanWeight > 0 && (
              <div className="flex justify-between text-neutral-300">
                <span>{selectedKiloanService.name} ({kiloanWeight} kg)</span>
                <span>Rp {kiloanSubtotal.toLocaleString('id-ID')}</span>
              </div>
            )}

            {Object.entries(satuanQuantities).map(([sId, qty]) => {
              if (qty <= 0) return null;
              const svc = services.find(s => s.id === Number(sId));
              return (
                <div key={sId} className="flex justify-between text-neutral-300">
                  <span>{svc?.name} x{qty}</span>
                  <span>Rp {((svc ? Number(svc.base_price) : 0) * qty).toLocaleString('id-ID')}</span>
                </div>
              );
            })}

            {speedSurcharge > 0 && (
              <div className="flex justify-between text-amber-400 font-medium">
                <span>Surcharge Layanan {serviceSpeed}</span>
                <span>+Rp {speedSurcharge.toLocaleString('id-ID')}</span>
              </div>
            )}

            {perfumeSurcharge > 0 && (
              <div className="flex justify-between text-purple-400 font-medium">
                <span>Parfum {selectedPerfume?.name}</span>
                <span>+Rp {perfumeSurcharge.toLocaleString('id-ID')}</span>
              </div>
            )}
          </div>

          {/* Total Display */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
            <div className="text-[11px] text-neutral-400">Total Pembayaran</div>
            <div className="text-2xl font-black text-white mt-1">
              Rp {grandTotal.toLocaleString('id-ID')}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2.5">
            <label className="block text-xs text-neutral-400 font-medium">Metode Pembayaran</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: 'cash', label: 'Tunai (Kas)', icon: CreditCard },
                { id: 'qris', label: 'QRIS / E-Wallet', icon: Sparkles },
                { id: 'card', label: 'Debit / Kartu', icon: CreditCard },
                { id: 'room_charge', label: 'Charge Hotel', icon: Building2 },
                { id: 'unpaid', label: 'Bayar Nanti (Ambil)', icon: Clock },
              ].map(pm => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setPaymentMethod(pm.id as any)}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition ${
                    paymentMethod === pm.id
                      ? 'bg-cyan-600 border-cyan-500 text-white font-bold'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <pm.icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate text-[11px]">{pm.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Hotel Room Charge Sub-Panel */}
          {paymentMethod === 'room_charge' && (
            <div className="p-3.5 bg-indigo-950/40 border border-indigo-800/60 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                <Building2 className="w-4 h-4" />
                <span>Pilih Kamar Tamu Hotel</span>
              </div>
              <select
                value={selectedHotelBookingId || ''}
                onChange={e => setSelectedHotelBookingId(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-neutral-900 border border-indigo-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden"
              >
                <option value="">-- Pilih Tamu Check-In --</option>
                {hotelBookings.map(b => (
                  <option key={b.id} value={b.id}>
                    Kamar #{b.room_number || b.id} - {b.guest_name} ({b.booking_number})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-neutral-400 leading-tight">
                Biaya laundry otomatis dibebankan ke Folio kamar tamu dan diposting ke Jurnal Akuntansi.
              </p>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || grandTotal <= 0}
          className="w-full py-3.5 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-xl transition flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Memproses Pesanan...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Buat Pesanan & Cetak Struk</span>
            </>
          )}
        </button>
      </div>

      {/* Tracking Modal */}
      {createdOrderId && (
        <LaundryCustomerTrackingModal
          orderId={createdOrderId}
          onClose={() => setCreatedOrderId(null)}
        />
      )}
    </div>
  );
};
