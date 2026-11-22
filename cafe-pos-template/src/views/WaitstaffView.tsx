import React, { useState } from 'react';
import { 
  Users, Coffee, Send, Plus, Minus, Search, 
  CheckCircle, Table 
} from 'lucide-react';
import type { Product, TableItem } from '../data/mockData';
import { INITIAL_PRODUCTS, CATEGORIES, INITIAL_TABLES, formatCurrency } from '../data/mockData';

export const WaitstaffView: React.FC = () => {
  const [tables] = useState<TableItem[]>(INITIAL_TABLES);
  const [selectedTableId, setSelectedTableId] = useState<string>('t1');
  const [guestCount, setGuestCount] = useState<number>(2);
  const [products] = useState<Product[]>(INITIAL_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [orderItems, setOrderItems] = useState<{ product: Product; qty: number; notes: string }[]>([
    { product: INITIAL_PRODUCTS[6], qty: 1, notes: 'Pedas Banget, Telur setengah matang' },
    { product: INITIAL_PRODUCTS[1], qty: 2, notes: '1 Panas, 1 Dingin' }
  ]);

  const [firedSuccess, setFiredSuccess] = useState(false);

  const selectedTable = tables.find(t => t.id === selectedTableId);

  const filteredProducts = products.filter(p => {
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchQuery = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       p.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery && p.isAvailable;
  });

  const addItem = (product: Product) => {
    setOrderItems(prev => {
      const idx = prev.findIndex(i => i.product.id === product.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx].qty += 1;
        return copy;
      }
      return [...prev, { product, qty: 1, notes: '' }];
    });
  };

  const updateItemQty = (id: string, delta: number) => {
    setOrderItems(prev => prev.map(item => {
      if (item.product.id === id) {
        const n = item.qty + delta;
        return n > 0 ? { ...item, qty: n } : null;
      }
      return item;
    }).filter(Boolean) as { product: Product; qty: number; notes: string }[]);
  };

  const updateNotes = (id: string, noteText: string) => {
    setOrderItems(prev => prev.map(item => 
      item.product.id === id ? { ...item, notes: noteText } : item
    ));
  };

  const handleSendToKitchen = () => {
    setFiredSuccess(true);
    setTimeout(() => {
      setFiredSuccess(false);
      setOrderItems([]);
    }, 2000);
  };

  const subtotal = orderItems.reduce((acc, i) => acc + (i.product.price * i.qty), 0);

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-neutral-100 overflow-hidden">
      <div className="flex-1 flex flex-col h-full overflow-hidden p-3 md:p-5">
        <div className="bg-white p-4 rounded-2xl shadow-xs mb-3 flex flex-wrap items-center justify-between gap-3 border border-neutral-200/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-amber-50 text-amber-900 px-3 py-1.5 rounded-xl border border-amber-200">
              <Table className="w-4 h-4 text-amber-700" />
              <span className="text-xs font-bold">Meja:</span>
              <select 
                value={selectedTableId} 
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="bg-transparent font-black text-xs sm:text-sm text-neutral-900 outline-none cursor-pointer"
              >
                {tables.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.zone}) - {t.status.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-neutral-100 px-2.5 py-1.5 rounded-xl">
              <Users className="w-3.5 h-3.5 text-neutral-500" />
              <span className="text-xs text-neutral-600 font-medium">Tamu:</span>
              <button 
                onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                className="w-5 h-5 rounded bg-white text-neutral-700 font-bold flex items-center justify-center text-xs"
              >
                -
              </button>
              <span className="text-xs font-bold w-4 text-center">{guestCount}</span>
              <button 
                onClick={() => setGuestCount(guestCount + 1)}
                className="w-5 h-5 rounded bg-white text-neutral-700 font-bold flex items-center justify-center text-xs"
              >
                +
              </button>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-neutral-400 block font-semibold">PRAMUNIAGA ON-DUTY</span>
            <span className="text-xs font-bold text-neutral-800">Andi Pratama • #STF-04</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input 
              type="text"
              placeholder="Cari menu cepat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-xs pl-9 pr-3 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-amber-600"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === c ? 'bg-amber-800 text-white' : 'bg-white text-neutral-600 border border-neutral-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pb-20 md:pb-2">
            {filteredProducts.map(p => {
              const inOrder = orderItems.find(i => i.product.id === p.id);
              return (
                <div 
                  key={p.id}
                  onClick={() => addItem(p)}
                  className={`bg-white p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between active:scale-97 ${
                    inOrder ? 'border-amber-600 bg-amber-50/40 shadow-xs' : 'border-neutral-200/80 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-neutral-400">{p.code}</span>
                      <h4 className="text-xs font-bold text-neutral-900 line-clamp-1">{p.name}</h4>
                    </div>
                    {inOrder && (
                      <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-black text-[10px] flex items-center justify-center">
                        {inOrder.qty}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-100">
                    <span className="text-xs font-extrabold text-amber-700">{formatCurrency(p.price)}</span>
                    <span className="text-[10px] text-neutral-400 font-medium">Stok: {p.stock}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="w-full md:w-88 lg:w-96 bg-white border-l border-neutral-200 flex flex-col h-full shadow-lg md:shadow-none">
        <div className="p-4 border-b border-neutral-200 bg-neutral-900 text-white flex items-center justify-between">
          <div>
            <h3 className="font-black text-sm">Pesanan Meja: {selectedTable?.name}</h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">Area: {selectedTable?.zone} • {guestCount} Tamu</p>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 uppercase">
            Pramuniaga
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {orderItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-400 py-10">
              <Coffee className="w-8 h-8 stroke-1 mb-2" />
              <p className="text-xs font-medium">Belum ada item untuk dikirim</p>
            </div>
          ) : (
            orderItems.map(item => (
              <div key={item.product.id} className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-200/80 space-y-1.5">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-xs font-bold text-neutral-900">{item.product.name}</h5>
                    <span className="text-[11px] text-neutral-500">{formatCurrency(item.product.price * item.qty)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-lg p-0.5">
                    <button 
                      onClick={() => updateItemQty(item.product.id, -1)}
                      className="w-5 h-5 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 rounded"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                    <button 
                      onClick={() => updateItemQty(item.product.id, 1)}
                      className="w-5 h-5 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 rounded"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <input 
                  type="text"
                  placeholder="Instruksi masak (misal: pedas, es dipisah)..."
                  value={item.notes}
                  onChange={(e) => updateNotes(item.product.id, e.target.value)}
                  className="w-full bg-white text-[11px] px-2 py-1 rounded-md border border-neutral-200 outline-none text-amber-900 focus:border-amber-600"
                />
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-neutral-200 bg-neutral-50 space-y-3">
          <div className="flex justify-between text-xs text-neutral-600">
            <span>Estimasi Tagihan</span>
            <span className="font-bold text-neutral-900">{formatCurrency(subtotal)}</span>
          </div>

          {firedSuccess ? (
            <div className="bg-emerald-600 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4" />
              <span>Terkirim ke Kitchen Display!</span>
            </div>
          ) : (
            <button 
              disabled={orderItems.length === 0}
              onClick={handleSendToKitchen}
              className="w-full bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 text-white font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
            >
              <Send className="w-4 h-4 text-amber-500" />
              <span>Kirim Tiket ke Dapur (Fire)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
