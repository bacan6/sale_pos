import React, { useState, useEffect } from 'react';
import { 
  PackageSearch, MapPin, Search, CheckCircle, 
  RefreshCw, Eye 
} from 'lucide-react';
import { laundryApi } from '../../services/laundryApi';
import type { LaundryRack, LaundryOrder } from '../../types/laundry';
import { LaundryCustomerTrackingModal } from './LaundryCustomerTrackingModal';

export const LaundryRackView: React.FC = () => {
  const [racks, setRacks] = useState<LaundryRack[]>([]);
  const [orders, setOrders] = useState<LaundryOrder[]>([]);
  const [selectedRackId, setSelectedRackId] = useState<number | null>(null);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Settlement Handover modal
  const [settlingOrder, setSettlingOrder] = useState<LaundryOrder | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [processingHandover, setProcessingHandover] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [search, selectedRackId]);

  const loadData = async () => {
    try {
      const [rackData, orderData] = await Promise.all([
        laundryApi.getRacks(),
        laundryApi.getOrders({
          status: 'ready',
          rack_id: selectedRackId || undefined,
          search: search.trim() || undefined,
          limit: 100,
        }),
      ]);
      setRacks(rackData);
      setOrders(orderData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleHandover = async (order: LaundryOrder) => {
    const isUnpaid = order.payment_status !== 'paid';
    if (isUnpaid) {
      setSettlingOrder(order);
      return;
    }

    if (!confirm(`Konfirmasi penyerahan cucian ${order.order_number} kepada pelanggan ${order.customer_name}?`)) {
      return;
    }

    setProcessingHandover(true);
    try {
      await laundryApi.updateOrderStatus(order.id, 'picked_up', 'Cucian telah diserahkan dan diambil oleh pelanggan');
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Gagal menyerahkan cucian');
    } finally {
      setProcessingHandover(false);
    }
  };

  const handleSettleAndHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingOrder) return;

    setProcessingHandover(true);
    try {
      const remaining = Number(settlingOrder.total_amount) - Number(settlingOrder.paid_amount);
      await laundryApi.processPayment({
        order_id: settlingOrder.id,
        amount: remaining,
        payment_method: paymentMethod,
      });
      await laundryApi.updateOrderStatus(settlingOrder.id, 'picked_up', 'Pelunasan selesai & cucian diambil pelanggan');
      setSettlingOrder(null);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Gagal memproses pelunasan');
    } finally {
      setProcessingHandover(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-950 text-neutral-100">
      {/* Top Header & Search */}
      <div className="p-4 border-b border-neutral-800 bg-neutral-900/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
            <PackageSearch className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-sm text-white">Rak Penyimpanan & Pengambilan</h2>
            <p className="text-xs text-neutral-400">Pengorganisasian Paket Cucian Siap Diambil Pelanggan</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nota / nama / no. hp..."
              className="bg-neutral-900 border border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-cyan-500 w-52 sm:w-72"
            />
          </div>
          <button
            onClick={() => loadData()}
            className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl transition"
            title="Muat Ulang"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
        {/* Rack Shelf Status Cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Kapasitas Rak Penyimpanan
            </span>
            {selectedRackId && (
              <button
                onClick={() => setSelectedRackId(null)}
                className="text-xs text-cyan-400 hover:underline font-semibold"
              >
                Tampilkan Semua Rak
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {racks.map(rack => {
              const count = Number(rack.active_orders_count || 0);
              const cap = Number(rack.capacity || 10);
              const percent = Math.min(100, Math.round((count / cap) * 100));
              const isSelected = selectedRackId === rack.id;

              return (
                <div
                  key={rack.id}
                  onClick={() => setSelectedRackId(isSelected ? null : rack.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition shadow-xs flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-600/20 border-cyan-500 text-white shadow-md'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-cyan-400">{rack.code}</span>
                    <span className="text-[10px] font-bold text-neutral-400">{count}/{cap}</span>
                  </div>
                  <div className="text-xs font-semibold text-white mt-1 truncate">{rack.name}</div>
                  <div className="w-full bg-neutral-950 h-1.5 rounded-full overflow-hidden mt-3">
                    <div
                      className={`h-full rounded-full transition-all ${
                        percent >= 90 ? 'bg-rose-500' : percent >= 60 ? 'bg-amber-500' : 'bg-cyan-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ready Orders List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Paket Cucian Siap Diambil ({orders.length} Paket)
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-neutral-400 text-xs">Memuat paket cucian...</div>
          ) : orders.length === 0 ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-12 text-center text-neutral-500 text-xs">
              Tidak ada paket cucian berstatus Siap Diambil pada filter ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map(order => {
                const isPaid = order.payment_status === 'paid';
                return (
                  <div
                    key={order.id}
                    className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 shadow-sm hover:border-neutral-700 transition flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-white">{order.order_number}</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          Siap Diambil
                        </span>
                      </div>

                      <div className="mt-3">
                        <h4 className="font-bold text-sm text-neutral-100">{order.customer_name}</h4>
                        {order.customer_phone && (
                          <p className="text-xs text-neutral-400 mt-0.5">{order.customer_phone}</p>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-cyan-600/20 text-cyan-300 font-bold flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{order.rack_code || 'Belum di Rak'}</span>
                        </span>
                        {Number(order.total_weight) > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 font-semibold">
                            {order.total_weight} kg
                          </span>
                        )}
                        {order.perfume_name && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-semibold">
                            {order.perfume_name}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs">
                        <span className="text-neutral-400">Total Tagihan:</span>
                        <div className="text-right">
                          <div className="font-black text-sm text-white">
                            Rp {Number(order.total_amount).toLocaleString('id-ID')}
                          </div>
                          <div className={`text-[10px] font-black uppercase ${isPaid ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPaid ? 'Lunas' : `Sisa Rp ${(Number(order.total_amount) - Number(order.paid_amount)).toLocaleString('id-ID')}`}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedOrderId(order.id)}
                        className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl transition"
                        title="Lihat Struk"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        disabled={processingHandover}
                        onClick={() => handleHandover(order)}
                        className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md ${
                          isPaid
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-amber-600 hover:bg-amber-500 text-white'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{isPaid ? 'Serahkan ke Pelanggan' : 'Pelunasan & Serahkan'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Settlement & Handover Modal */}
      {settlingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5 text-neutral-100">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-black text-sm text-white">Pelunasan Tagihan Laundry</h3>
              <span className="font-mono text-xs text-cyan-400">{settlingOrder.order_number}</span>
            </div>

            <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-1">
              <div className="flex justify-between text-xs text-neutral-400">
                <span>Pelanggan:</span>
                <span className="font-bold text-white">{settlingOrder.customer_name}</span>
              </div>
              <div className="flex justify-between text-xs text-neutral-400">
                <span>Sisa Tagihan:</span>
                <span className="font-black text-rose-400 text-sm">
                  Rp {(Number(settlingOrder.total_amount) - Number(settlingOrder.paid_amount)).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-neutral-400 font-medium">Pilih Metode Pelunasan</label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {['cash', 'qris', 'card'].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`py-2 px-3 rounded-xl border text-center font-bold capitalize transition ${
                      paymentMethod === m
                        ? 'bg-cyan-600 border-cyan-500 text-white'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSettlingOrder(null)}
                className="flex-1 py-2 text-xs text-neutral-400 hover:text-white bg-neutral-800 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={processingHandover}
                onClick={handleSettleAndHandover}
                className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg"
              >
                {processingHandover ? 'Memproses...' : 'Lunas & Serahkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Tracking Modal */}
      {selectedOrderId && (
        <LaundryCustomerTrackingModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
};
