import React, { useState } from 'react';
import { 
  Search, Plus, Minus, Trash2, CreditCard, Banknote, QrCode, 
  Printer, Percent, ShoppingBag, Coffee, ChevronRight, X
} from 'lucide-react';
import type { Product, TableItem } from '../data/mockData';
import { INITIAL_PRODUCTS, CATEGORIES, formatCurrency, INITIAL_TABLES } from '../data/mockData';

export const CashierView: React.FC = () => {
  const [products] = useState<Product[]>(INITIAL_PRODUCTS);
  const [tables] = useState<TableItem[]>(INITIAL_TABLES);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState('t1');
  const [orderType, setOrderType] = useState<'Dine-In' | 'Take-Away'>('Dine-In');
  
  const [cart, setCart] = useState<{ product: Product; qty: number; notes: string }[]>([
    { product: INITIAL_PRODUCTS[1], qty: 2, notes: 'Less sugar, fresh milk' },
    { product: INITIAL_PRODUCTS[5], qty: 1, notes: 'Saus dipisah' },
  ]);

  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'card'>('cash');
  const [cashTendered, setCashTendered] = useState<number>(100000);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const filteredProducts = products.filter(p => {
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchQuery = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       p.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1, notes: '' }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean) as { product: Product; qty: number; notes: string }[]);
  };

  const removeItem = (id: string) => {
    setCart(prev => prev.filter(item => item.product.id !== id));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.qty), 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const pb1Tax = (subtotal - discountAmount) * 0.10;
  const total = subtotal - discountAmount + pb1Tax;
  const change = Math.max(0, cashTendered - total);

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-neutral-100 overflow-hidden relative">
      <div className="flex-1 flex flex-col h-full overflow-hidden p-3 md:p-5">
        <div className="bg-white rounded-2xl p-4 shadow-xs mb-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex bg-neutral-100 p-1 rounded-xl">
              <button 
                onClick={() => setOrderType('Dine-In')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  orderType === 'Dine-In' ? 'bg-amber-600 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Dine-In
              </button>
              <button 
                onClick={() => setOrderType('Take-Away')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  orderType === 'Take-Away' ? 'bg-amber-600 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Take-Away
              </button>
            </div>

            {orderType === 'Dine-In' && (
              <select 
                value={selectedTable} 
                onChange={(e) => setSelectedTable(e.target.value)}
                className="bg-neutral-100 text-neutral-800 text-xs font-semibold py-2 px-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-amber-500"
              >
                {tables.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.zone}) - {t.status}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 text-neutral-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Cari menu atau kode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-100 text-sm pl-9 pr-3 py-2 rounded-xl border-none focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mb-3">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat 
                  ? 'bg-neutral-900 text-white shadow-sm' 
                  : 'bg-white text-neutral-600 hover:bg-neutral-50 shadow-xs'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4 pb-20 lg:pb-4">
            {filteredProducts.map(product => (
              <div 
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col border border-neutral-100 group active:scale-98"
              >
                <div className="h-32 sm:h-36 w-full relative overflow-hidden bg-neutral-200">
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                  <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded-md">
                    {product.code}
                  </span>
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-neutral-800 line-clamp-1">{product.name}</h4>
                    <p className="text-[11px] text-neutral-400 mt-0.5">{product.category}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-100">
                    <span className="text-xs sm:text-sm font-extrabold text-amber-700">
                      {formatCurrency(product.price)}
                    </span>
                    <button className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`
        fixed lg:static inset-y-0 right-0 z-30 w-full sm:w-96 lg:w-[380px] bg-white border-l border-neutral-200 shadow-xl lg:shadow-none flex flex-col transition-transform duration-300
        ${mobileCartOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
          <div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-neutral-900 text-base">Pesanan Aktif</h3>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              {orderType} • {tables.find(t => t.id === selectedTable)?.name || 'Meja'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCart([])}
              className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded-lg hover:bg-red-50"
            >
              Reset
            </button>
            <button 
              onClick={() => setMobileCartOpen(false)}
              className="lg:hidden p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-400 py-12">
              <Coffee className="w-12 h-12 stroke-[1.2] mb-2 opacity-50" />
              <p className="text-sm font-medium">Belum ada item dipilih</p>
              <p className="text-xs text-neutral-400 mt-0.5">Pilih produk dari menu di sebelah kiri</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="bg-neutral-50 p-3 rounded-xl border border-neutral-100 flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-2">
                    <h5 className="text-xs sm:text-sm font-semibold text-neutral-800 line-clamp-1">{item.product.name}</h5>
                    <p className="text-xs font-bold text-neutral-700 mt-0.5">
                      {formatCurrency(item.product.price * item.qty)}
                    </p>
                  </div>
                  <button 
                    onClick={() => removeItem(item.product.id)}
                    className="text-neutral-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {item.notes && (
                  <p className="text-[11px] text-amber-700 bg-amber-50/80 px-2 py-0.5 rounded-md inline-block">
                    Catatan: {item.notes}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-neutral-400 font-mono">
                    @{formatCurrency(item.product.price)}
                  </span>
                  <div className="flex items-center gap-2 bg-white rounded-lg border border-neutral-200 px-1 py-0.5">
                    <button 
                      onClick={() => updateQty(item.product.id, -1)}
                      className="p-1 text-neutral-500 hover:text-neutral-800 rounded-md"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold w-5 text-center">{item.qty}</span>
                    <button 
                      onClick={() => updateQty(item.product.id, 1)}
                      className="p-1 text-neutral-500 hover:text-neutral-800 rounded-md"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-neutral-200 bg-white space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-500 flex items-center gap-1 font-medium">
              <Percent className="w-3.5 h-3.5 text-amber-600" /> Diskon
            </span>
            <div className="flex gap-1">
              {[0, 5, 10, 15].map(pct => (
                <button
                  key={pct}
                  onClick={() => setDiscountPercent(pct)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                    discountPercent === pct ? 'bg-amber-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-neutral-600 pt-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-neutral-800">{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Diskon ({discountPercent}%)</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Pajak Resto (PB1 10%)</span>
              <span className="font-semibold text-neutral-800">{formatCurrency(pb1Tax)}</span>
            </div>
            <div className="flex justify-between text-sm sm:text-base font-extrabold text-neutral-900 pt-2 border-t border-dashed border-neutral-200">
              <span>Total Tagihan</span>
              <span className="text-amber-700">{formatCurrency(total)}</span>
            </div>
          </div>

          <button 
            disabled={cart.length === 0}
            onClick={() => setShowPayModal(true)}
            className="w-full bg-amber-600 hover:bg-amber-700 active:scale-99 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
          >
            <span>Bayar Sekarang</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="lg:hidden fixed bottom-14 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-neutral-200 flex items-center justify-between z-20 shadow-lg">
        <div>
          <p className="text-[11px] text-neutral-500">{cart.length} Item • Total</p>
          <p className="text-sm font-extrabold text-amber-700">{formatCurrency(total)}</p>
        </div>
        <button 
          onClick={() => setMobileCartOpen(true)}
          className="bg-amber-600 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5"
        >
          <ShoppingBag className="w-4 h-4" />
          Lihat Pesanan
        </button>
      </div>

      {showPayModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-lg font-bold text-neutral-900">Pembayaran Kasir</h3>
              <button 
                onClick={() => setShowPayModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 text-center">
              <span className="text-xs text-neutral-500">Total Yang Harus Dibayar</span>
              <p className="text-2xl font-black text-amber-700 mt-0.5">{formatCurrency(total)}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 border text-xs font-bold transition-all ${
                  paymentMethod === 'cash' 
                    ? 'border-amber-600 bg-amber-50 text-amber-700' 
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <Banknote className="w-5 h-5" />
                Tunai (Cash)
              </button>

              <button
                onClick={() => setPaymentMethod('qris')}
                className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 border text-xs font-bold transition-all ${
                  paymentMethod === 'qris' 
                    ? 'border-amber-600 bg-amber-50 text-amber-700' 
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <QrCode className="w-5 h-5" />
                QRIS / iPaymu
              </button>

              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 border text-xs font-bold transition-all ${
                  paymentMethod === 'card' 
                    ? 'border-amber-600 bg-amber-50 text-amber-700' 
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                EDC / Kartu
              </button>
            </div>

            {paymentMethod === 'cash' && (
              <div className="space-y-3 bg-neutral-50 p-4 rounded-2xl border border-neutral-100 mb-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-600 font-medium">Uang Diterima:</span>
                  <input 
                    type="number"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(Number(e.target.value))}
                    className="w-32 text-right bg-white border border-neutral-200 rounded-lg px-2 py-1 font-bold text-neutral-800"
                  />
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {[total, 50000, 100000, 150000].map(val => (
                    <button
                      key={val}
                      onClick={() => setCashTendered(val)}
                      className="bg-white border border-neutral-200 hover:bg-neutral-100 py-1.5 rounded-lg font-semibold text-[11px]"
                    >
                      {val === total ? 'Uang Pas' : formatCurrency(val).replace('Rp', '')}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-neutral-200 text-xs">
                  <span className="font-medium text-neutral-600">Kembalian:</span>
                  <span className="font-extrabold text-emerald-600 text-sm">{formatCurrency(change)}</span>
                </div>
              </div>
            )}

            {paymentMethod === 'qris' && (
              <div className="text-center p-4 bg-neutral-50 rounded-2xl border border-neutral-100 mb-4">
                <div className="w-36 h-36 bg-white mx-auto border border-neutral-300 rounded-xl flex items-center justify-center p-2 mb-2">
                  <QrCode className="w-28 h-28 text-neutral-800" />
                </div>
                <p className="text-xs font-semibold text-neutral-700">Scan QRIS via iPaymu / E-Wallet</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">Otomatis verifikasi status pembayaran</p>
              </div>
            )}

            <div className="flex gap-2">
              <button 
                onClick={() => {
                  alert('Transaksi berhasil disimpan & struk dikirim ke kitchen/printer!');
                  setShowPayModal(false);
                  setCart([]);
                }}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Selesai & Cetak Struk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
