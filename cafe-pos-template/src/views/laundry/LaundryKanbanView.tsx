import React, { useState, useEffect } from 'react';
import { 
  Shirt, ArrowRight, Sparkles, MapPin, 
  Search, RefreshCw, Eye 
} from 'lucide-react';
import { laundryApi } from '../../services/laundryApi';
import type { LaundryOrder } from '../../types/laundry';
import { LaundryCustomerTrackingModal } from './LaundryCustomerTrackingModal';

export const LaundryKanbanView: React.FC = () => {
  const [orders, setOrders] = useState<LaundryOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedSpeed, setSelectedSpeed] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 15000); // 15s polling for live workstation
    return () => clearInterval(interval);
  }, [search, selectedSpeed]);

  const loadOrders = async () => {
    try {
      const data = await laundryApi.getOrders({
        search: search.trim() || undefined,
        speed: selectedSpeed || undefined,
        limit: 100,
      });
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceStatus = async (order: LaundryOrder, nextStatus: string) => {
    setUpdatingId(order.id);
    try {
      await laundryApi.updateOrderStatus(order.id, nextStatus);
      await loadOrders();
    } catch (err: any) {
      alert(err?.message || 'Gagal mengubah status');
    } finally {
      setUpdatingId(null);
    }
  };

  const columns = [
    { id: 'received', title: '1. Diterima', subtitle: 'Menunggu Antrean', next: 'washing', nextLabel: 'Mulai Cuci', color: 'border-amber-500/30 bg-amber-500/5' },
    { id: 'washing', title: '2. Pencucian', subtitle: 'Mesin Cuci Aktif', next: 'drying', nextLabel: 'Keringkan', color: 'border-blue-500/30 bg-blue-500/5' },
    { id: 'drying', title: '3. Pengeringan', subtitle: 'Mesin Dryer / Jemur', next: 'ironing', nextLabel: 'Setrika', color: 'border-indigo-500/30 bg-indigo-500/5' },
    { id: 'ironing', title: '4. Setrika & Packing', subtitle: 'Penyetrikaan & Lipat', next: 'ready', nextLabel: 'Selesai di Rak', color: 'border-purple-500/30 bg-purple-500/5' },
    { id: 'ready', title: '5. Siap Diambil', subtitle: 'Berada di Rak Pengambilan', next: 'picked_up', nextLabel: 'Sudah Diambil', color: 'border-emerald-500/30 bg-emerald-500/5' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-950 text-neutral-100">
      {/* Top Filter Bar */}
      <div className="p-4 border-b border-neutral-800 bg-neutral-900/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center font-bold">
            <Shirt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-sm text-white">Pipeline Cucian & Workstation</h2>
            <p className="text-xs text-neutral-400">Papan Kontrol Alur Pengerjaan Laundry</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nota / nama..."
              className="bg-neutral-900 border border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-cyan-500 w-44 sm:w-60"
            />
          </div>

          {/* Speed Filter */}
          <select
            value={selectedSpeed}
            onChange={e => setSelectedSpeed(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-cyan-500"
          >
            <option value="">Semua Kecepatan</option>
            <option value="regular">Reguler</option>
            <option value="express">Express (+50%)</option>
            <option value="super_express">Kilat 6 Jam (+100%)</option>
          </select>

          <button
            onClick={() => loadOrders()}
            className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl transition"
            title="Muat Ulang"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Kanban Board Workspace */}
      <div className="flex-1 overflow-x-auto p-4 flex gap-4">
        {columns.map(col => {
          const colOrders = orders.filter(o => o.status === col.id);
          return (
            <div
              key={col.id}
              className={`w-72 sm:w-80 flex flex-col h-full rounded-3xl border ${col.color} bg-neutral-900/60 overflow-hidden shrink-0 shadow-lg`}
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-neutral-800/80 flex items-center justify-between shrink-0 bg-neutral-900/80">
                <div>
                  <h4 className="font-black text-xs text-white">{col.title}</h4>
                  <p className="text-[10px] text-neutral-400">{col.subtitle}</p>
                </div>
                <span className="w-6 h-6 rounded-full bg-neutral-800 text-white font-black text-xs flex items-center justify-center">
                  {colOrders.length}
                </span>
              </div>

              {/* Order Cards List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {loading && orders.length === 0 ? (
                  <div className="py-8 text-center text-[11px] text-neutral-500">Memuat antrean...</div>
                ) : colOrders.length === 0 ? (
                  <div className="py-8 text-center text-[11px] text-neutral-500">
                    Tidak ada cucian di tahap ini
                  </div>
                ) : (
                  colOrders.map(order => {
                    const isUpdating = updatingId === order.id;
                    const isExpress = order.service_speed === 'express' || order.service_speed === 'super_express';

                    return (
                      <div
                        key={order.id}
                        className={`p-3.5 rounded-2xl border transition shadow-sm space-y-3 ${
                          isExpress
                            ? 'bg-neutral-900 border-amber-500/40 hover:border-amber-400'
                            : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        {/* Header Badge */}
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono font-bold text-xs text-white">
                            {order.order_number}
                          </span>
                          {isExpress && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              {order.service_speed.replace('_', ' ')}
                            </span>
                          )}
                        </div>

                        {/* Customer Info */}
                        <div>
                          <div className="font-bold text-xs text-neutral-200 truncate">
                            {order.customer_name}
                          </div>
                          {order.customer_phone && (
                            <div className="text-[10px] text-neutral-400">
                              {order.customer_phone}
                            </div>
                          )}
                          {order.hotel_guest_name && (
                            <div className="text-[10px] font-semibold text-indigo-400 mt-0.5">
                              Tamu Hotel: {order.hotel_guest_name}
                            </div>
                          )}
                        </div>

                        {/* Weight & Scent Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                          {Number(order.total_weight) > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-cyan-400 font-bold">
                              {order.total_weight} kg
                            </span>
                          )}
                          {order.perfume_name && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-semibold flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span className="truncate max-w-[80px]">{order.perfume_name}</span>
                            </span>
                          )}
                          {order.rack_code && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" />
                              <span>{order.rack_code}</span>
                            </span>
                          )}
                        </div>

                        {/* Amount & Payment Status */}
                        <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80 text-[11px]">
                          <span className="font-black text-white">
                            Rp {Number(order.total_amount).toLocaleString('id-ID')}
                          </span>
                          <span className={`font-bold text-[10px] uppercase ${
                            order.payment_status === 'paid' ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {order.payment_status === 'paid' ? 'LUNAS' : 'BELUM LUNAS'}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setSelectedOrderId(order.id)}
                            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl transition"
                            title="Lihat Struk & Detail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleAdvanceStatus(order, col.next)}
                            className="flex-1 py-1.5 px-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1 shadow-sm"
                          >
                            {isUpdating ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <span>{col.nextLabel}</span>
                                <ArrowRight className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal View */}
      {selectedOrderId && (
        <LaundryCustomerTrackingModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
};
