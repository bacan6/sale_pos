import React, { useState } from 'react';
import { 
  Printer, Check, Clock, AlertTriangle, ChefHat, 
  Flame
} from 'lucide-react';
import type { KitchenTicket } from '../data/mockData';
import { INITIAL_KITCHEN_TICKETS } from '../data/mockData';

export const KitchenTicketView: React.FC = () => {
  const [tickets, setTickets] = useState<KitchenTicket[]>(INITIAL_KITCHEN_TICKETS);
  const [activeTab, setActiveTab] = useState<'all' | 'queued' | 'cooking' | 'ready'>('all');
  const [selectedTicketForPrint, setSelectedTicketForPrint] = useState<KitchenTicket | null>(INITIAL_KITCHEN_TICKETS[0]);

  const updateStatus = (id: string, newStatus: 'queued' | 'cooking' | 'ready') => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const filteredTickets = tickets.filter(t => activeTab === 'all' || t.status === activeTab);

  const handlePrintThermal = (ticket: KitchenTicket) => {
    setSelectedTicketForPrint(ticket);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-neutral-100 overflow-hidden">
      <div className="flex-1 flex flex-col h-full overflow-hidden p-3 md:p-5">
        <div className="bg-white p-4 rounded-2xl shadow-xs mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-neutral-200/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-800 text-amber-200 flex items-center justify-center font-bold">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-neutral-900 text-sm sm:text-base">Kitchen Display System (KDS)</h2>
              <p className="text-xs text-neutral-500">Antrian Tiket & Instruksi Masak Dapur</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl self-stretch sm:self-auto overflow-x-auto">
            {(['all', 'queued', 'cooking', 'ready'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  activeTab === tab ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {tab === 'all' ? 'Semua' : tab === 'queued' ? 'Antrian' : tab === 'cooking' ? 'Dimasak' : 'Siap'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20 lg:pb-4">
            {filteredTickets.map(ticket => (
              <div 
                key={ticket.id}
                className={`bg-white rounded-3xl p-4 border-2 shadow-xs flex flex-col justify-between transition-all ${
                  ticket.status === 'queued' 
                    ? 'border-amber-400 bg-amber-50/20' 
                    : ticket.status === 'cooking' 
                    ? 'border-blue-400 bg-blue-50/20' 
                    : 'border-emerald-400 bg-emerald-50/20'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between pb-3 border-b border-neutral-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold bg-neutral-900 text-white px-2 py-0.5 rounded-md">
                          #{ticket.orderNumber}
                        </span>
                        <span className="text-xs font-extrabold text-neutral-800">
                          {ticket.tableNumber}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {ticket.createdAt} • {ticket.waiterName}
                      </p>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      ticket.status === 'queued' ? 'bg-amber-100 text-amber-800' :
                      ticket.status === 'cooking' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {ticket.status === 'queued' ? 'Antri' : ticket.status === 'cooking' ? 'Memasak' : 'Siap'}
                    </span>
                  </div>

                  {ticket.notes && (
                    <div className="my-2.5 p-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{ticket.notes}</span>
                    </div>
                  )}

                  <div className="py-3 space-y-3">
                    {ticket.items.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <span className="w-6 h-6 rounded-lg bg-neutral-900 text-white font-black flex items-center justify-center shrink-0">
                          {item.qty}x
                        </span>
                        <div className="flex-1">
                          <p className="font-extrabold text-neutral-900 leading-tight">{item.name}</p>
                          {item.notes && (
                            <p className="text-red-600 font-bold bg-red-100/70 px-1.5 py-0.5 rounded inline-block mt-0.5">
                              ⚠️ {item.notes}
                            </p>
                          )}
                          {item.options && (
                            <p className="text-neutral-500 text-[11px] mt-0.5">
                              Opsi: {item.options.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-200 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handlePrintThermal(ticket)}
                    className="p-2.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-all"
                    title="Cetak Struk Thermal 80mm"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  <div className="flex gap-1.5 flex-1 justify-end">
                    {ticket.status === 'queued' && (
                      <button
                        onClick={() => updateStatus(ticket.id, 'cooking')}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1"
                      >
                        <Flame className="w-3.5 h-3.5" />
                        <span>Mulai Masak</span>
                      </button>
                    )}

                    {ticket.status === 'cooking' && (
                      <button
                        onClick={() => updateStatus(ticket.id, 'ready')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Tandai Selesai</span>
                      </button>
                    )}

                    {ticket.status === 'ready' && (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 py-1 px-2">
                        <Check className="w-4 h-4" /> Siap Saji
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-80 bg-white border-l border-neutral-200 p-4 flex flex-col h-full shadow-lg lg:shadow-none overflow-y-auto">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100">
          <div className="flex items-center gap-1.5 text-neutral-800 font-bold text-xs">
            <Printer className="w-4 h-4 text-amber-700" />
            <span>Format Struk Dapur (80mm)</span>
          </div>
          <button 
            onClick={() => window.print()}
            className="bg-neutral-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg hover:bg-neutral-800"
          >
            Cetak
          </button>
        </div>

        {selectedTicketForPrint ? (
          <div 
            id="printable-kitchen-receipt" 
            className="bg-amber-50/40 p-4 rounded-xl border border-dashed border-neutral-300 font-mono text-[11px] text-neutral-900 shadow-inner space-y-2"
          >
            <div className="text-center pb-2 border-b border-dashed border-neutral-400">
              <h4 className="font-extrabold text-sm uppercase">Kopi Senja Utama</h4>
              <p className="text-[10px] text-neutral-600">** STRUK INSTRUKSI DAPUR **</p>
            </div>

            <div className="space-y-0.5 text-[10px] py-1 border-b border-dashed border-neutral-300">
              <div className="flex justify-between">
                <span>ORDER:</span>
                <span className="font-bold">#{selectedTicketForPrint.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>MEJA:</span>
                <span className="font-extrabold">{selectedTicketForPrint.tableNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>TIPE:</span>
                <span>{selectedTicketForPrint.type}</span>
              </div>
              <div className="flex justify-between">
                <span>WAKTU:</span>
                <span>{selectedTicketForPrint.createdAt}</span>
              </div>
              <div className="flex justify-between">
                <span>STAFF:</span>
                <span>{selectedTicketForPrint.waiterName}</span>
              </div>
            </div>

            <div className="py-2 space-y-2 border-b border-dashed border-neutral-400">
              {selectedTicketForPrint.items.map((item, i) => (
                <div key={i} className="space-y-0.5">
                  <div className="flex justify-between font-bold">
                    <span>{item.qty}x {item.name}</span>
                  </div>
                  {item.notes && (
                    <div className="pl-3 text-[10px] font-bold text-red-600">
                      &gt;&gt; NOTE: {item.notes}
                    </div>
                  )}
                  {item.options && (
                    <div className="pl-3 text-[9px] text-neutral-600">
                      * {item.options.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selectedTicketForPrint.notes && (
              <div className="text-[10px] italic border-b border-dashed border-neutral-400 pb-1">
                Catatan Pesanan: {selectedTicketForPrint.notes}
              </div>
            )}

            <div className="text-center pt-2 text-[9px] text-neutral-500">
              -- Dicetak Otomatis ke Printer Dapur --
            </div>
          </div>
        ) : (
          <p className="text-xs text-neutral-400 text-center py-10">Pilih tiket untuk melihat struk</p>
        )}
      </div>
    </div>
  );
};
