import React, { useState, useEffect } from 'react';
import { X, Printer, Clock, AlertCircle, Shirt } from 'lucide-react';
import { laundryApi } from '../../services/laundryApi';
import type { LaundryOrder } from '../../types/laundry';

interface Props {
  orderId?: number;
  trackingCode?: string;
  onClose: () => void;
}

export const LaundryCustomerTrackingModal: React.FC<Props> = ({ orderId, trackingCode, onClose }) => {
  const [order, setOrder] = useState<LaundryOrder | any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadDetails();
  }, [orderId, trackingCode]);

  const loadDetails = async () => {
    setLoading(true);
    setError('');
    try {
      if (orderId) {
        const data = await laundryApi.getOrder(orderId);
        setOrder(data);
      } else if (trackingCode) {
        const data = await laundryApi.trackOrder(trackingCode);
        setOrder(data);
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat status pesanan');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">Diterima (Antrean)</span>;
      case 'washing':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">Sedang Dicuci</span>;
      case 'drying':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">Pengeringan</span>;
      case 'ironing':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">Setrika & Packing</span>;
      case 'ready':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Siap Diambil</span>;
      case 'picked_up':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-600/30 text-neutral-300 border border-neutral-600/50">Sudah Diambil</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-700 text-neutral-300">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden my-8 text-neutral-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center font-bold">
              <Shirt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">Struk & Tracking Cucian</h3>
              <p className="text-xs text-neutral-400">Kode Nota & Progres Layanan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-12 text-center text-neutral-400 text-sm">Memuat data pesanan...</div>
          ) : error ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl flex items-center gap-3 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : order ? (
            <div className="space-y-6">
              {/* Receipt Visual Card */}
              <div className="bg-white text-neutral-900 p-6 rounded-2xl shadow-md border border-neutral-200 font-mono text-xs space-y-4">
                <div className="text-center border-b border-dashed border-neutral-300 pb-3">
                  <div className="font-black text-base tracking-wider uppercase">LAUNDRY OPERATIONS</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">Sistem Kasir & Pelacak Digital</div>
                  <div className="mt-2 text-xs font-bold text-neutral-800 tracking-widest">{order.order_number}</div>
                  <div className="text-[11px] text-cyan-700 font-black mt-0.5 tracking-wider">TRACK: {order.tracking_code}</div>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Pelanggan:</span>
                    <span className="font-bold text-neutral-900">{order.customer_name}</span>
                  </div>
                  {order.customer_phone && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">No. HP:</span>
                      <span>{order.customer_phone}</span>
                    </div>
                  )}
                  {order.customer_phone_masked && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">No. HP:</span>
                      <span>{order.customer_phone_masked}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Layanan:</span>
                    <span className="capitalize font-semibold">{order.service_speed}</span>
                  </div>
                  {order.perfume_name && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Aroma:</span>
                      <span>{order.perfume_name}</span>
                    </div>
                  )}
                  {order.rack_code && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Lokasi Rak:</span>
                      <span className="font-bold text-cyan-700">{order.rack_code}</span>
                    </div>
                  )}
                  {order.hotel_guest_name && (
                    <div className="flex justify-between text-indigo-700">
                      <span>Kamar Hotel:</span>
                      <span className="font-bold">{order.hotel_guest_name}</span>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="border-t border-b border-dashed border-neutral-300 py-2.5 space-y-1.5">
                  {(order.items || []).map((itm: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <div className="flex-1 pr-2">
                        <span>{itm.item_name}</span>
                        <span className="text-neutral-500 ml-1">x{itm.quantity}</span>
                      </div>
                      <span className="font-semibold">Rp {Number(itm.subtotal).toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Subtotal:</span>
                    <span>Rp {Number(order.subtotal_amount || 0).toLocaleString('id-ID')}</span>
                  </div>
                  {Number(order.speed_surcharge) > 0 && (
                    <div className="flex justify-between text-amber-700">
                      <span>Biaya Kilat / Express:</span>
                      <span>Rp {Number(order.speed_surcharge).toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {Number(order.perfume_surcharge) > 0 && (
                    <div className="flex justify-between text-purple-700">
                      <span>Tambahan Parfum:</span>
                      <span>Rp {Number(order.perfume_surcharge).toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black pt-1 border-t border-neutral-300">
                    <span>TOTAL:</span>
                    <span>Rp {Number(order.total_amount).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-[11px] pt-0.5">
                    <span className="text-neutral-500">Status Bayar:</span>
                    <span className={`font-black uppercase ${order.payment_status === 'paid' ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {order.payment_status === 'paid' ? 'LUNAS' : 'BELUM LUNAS'}
                    </span>
                  </div>
                </div>

                <div className="text-center text-[10px] text-neutral-400 border-t border-dashed border-neutral-300 pt-2">
                  Terima kasih atas kepercayaan Anda.
                  <br />
                  Harap simpan struk ini saat pengambilan.
                </div>
              </div>

              {/* Status & Timeline Section */}
              <div className="bg-neutral-950/60 border border-neutral-800 p-4 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400 font-semibold">Status Pengerjaan:</span>
                  {getStatusBadge(order.status)}
                </div>

                {order.estimated_completion_at && (
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Perkiraan Selesai: <strong className="text-white">{new Date(order.estimated_completion_at).toLocaleString('id-ID')}</strong></span>
                  </div>
                )}

                {/* Progress Steps Timeline */}
                {((order.timeline && order.timeline.length > 0) || (order.logs && order.logs.length > 0)) && (
                  <div className="pt-2 border-t border-neutral-800">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-3">Histori Pelacakan</div>
                    <div className="space-y-3">
                      {(order.timeline || order.logs || []).map((step: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 text-xs">
                          <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                          <div className="flex-1">
                            <div className="font-semibold text-neutral-200 capitalize">
                              {step.to_status ? step.to_status.replace('_', ' ') : step.status}
                            </div>
                            <div className="text-[10px] text-neutral-400">{step.notes}</div>
                            <div className="text-[9px] text-neutral-500 mt-0.5">{new Date(step.created_at).toLocaleString('id-ID')}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition"
          >
            Tutup
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition flex items-center gap-2 shadow-lg"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Struk</span>
          </button>
        </div>
      </div>
    </div>
  );
};
