import React, { useState } from 'react';
import { 
  Search, Plus, Minus, Trash2, CreditCard, Banknote, QrCode, 
  Printer, Percent, ShoppingBag, Coffee, X,
  Clock, CheckCircle, FileText, Send, Bed
} from 'lucide-react';
import { getStoredTenant } from '../services/api';
import type { Product, TableItem } from '../data/mockData';
import { INITIAL_PRODUCTS, CATEGORIES, formatCurrency, INITIAL_TABLES } from '../data/mockData';

interface ActiveBill {
  id: string;
  orderNumber: string;
  tableId: string;
  tableName: string;
  orderType: 'Dine-In' | 'Take-Away';
  waiter: string;
  time: string;
  status: 'billing' | 'occupied';
  items: { product: Product; qty: number; notes: string }[];
  discountPercent: number;
}

const INITIAL_ACTIVE_BILLS: ActiveBill[] = [
  {
    id: 'b1',
    orderNumber: 'ORD-105',
    tableId: 't3',
    tableName: 'Meja 03',
    orderType: 'Dine-In',
    waiter: 'Andi (Pramuniaga)',
    time: '14:15',
    status: 'billing',
    discountPercent: 0,
    items: [
      { product: INITIAL_PRODUCTS[6], qty: 2, notes: '1 Pedas, 1 Sedang' },
      { product: INITIAL_PRODUCTS[1], qty: 2, notes: 'Less sugar' },
      { product: INITIAL_PRODUCTS[8], qty: 1, notes: 'Hangatkan' }
    ]
  },
  {
    id: 'b2',
    orderNumber: 'ORD-108',
    tableId: 't1',
    tableName: 'Meja 01',
    orderType: 'Dine-In',
    waiter: 'Andi (Pramuniaga)',
    time: '14:20',
    status: 'occupied',
    discountPercent: 5,
    items: [
      { product: INITIAL_PRODUCTS[6], qty: 1, notes: 'Pedas Banget' },
      { product: INITIAL_PRODUCTS[4], qty: 1, notes: 'Saus dipisah' },
      { product: INITIAL_PRODUCTS[1], qty: 1, notes: 'Normal' }
    ]
  },
  {
    id: 'b3',
    orderNumber: 'ORD-109',
    tableId: 't5',
    tableName: 'Meja 05',
    orderType: 'Dine-In',
    waiter: 'Self-Order Meja',
    time: '14:26',
    status: 'occupied',
    discountPercent: 0,
    items: [
      { product: INITIAL_PRODUCTS[2], qty: 1, notes: 'Iced' },
      { product: INITIAL_PRODUCTS[8], qty: 1, notes: '' }
    ]
  }
];

export const CashierView: React.FC = () => {
  const [products] = useState<Product[]>(INITIAL_PRODUCTS);
  const [tables] = useState<TableItem[]>(INITIAL_TABLES);
  const [activeBills, setActiveBills] = useState<ActiveBill[]>(INITIAL_ACTIVE_BILLS);
  
  const [cashierMode, setCashierMode] = useState<'order' | 'billing'>('order');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState('t2');
  const [orderType, setOrderType] = useState<'Dine-In' | 'Take-Away'>('Dine-In');
  const [activeOrderNumber, setActiveOrderNumber] = useState<string>('ORD-' + Math.floor(100 + Math.random() * 900));

  const [cart, setCart] = useState<{ product: Product; qty: number; notes: string }[]>([
    { product: INITIAL_PRODUCTS[1], qty: 2, notes: 'Less sugar, fresh milk' },
    { product: INITIAL_PRODUCTS[5], qty: 1, notes: 'Saus dipisah' },
  ]);

  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isProformaReceipt, setIsProformaReceipt] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'card' | 'room_charge'>('cash');
  const [roomNumberCharge, setRoomNumberCharge] = useState<string>('101');
  const tenantInfo = getStoredTenant();
  const hasHotelModule = tenantInfo?.modules === 'combo' || tenantInfo?.modules === 'hotel' || !tenantInfo?.modules;
  const [cashTendered, setCashTendered] = useState<number>(100000);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [kitchenSentToast, setKitchenSentToast] = useState(false);

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

  const loadBillToCashier = (bill: ActiveBill) => {
    setCart(bill.items);
    setSelectedTable(bill.tableId);
    setOrderType(bill.orderType);
    setDiscountPercent(bill.discountPercent);
    setActiveOrderNumber(bill.orderNumber);
    setCashierMode('order');
  };

  const handleSendToKitchen = () => {
    if (cart.length === 0) return;
    setKitchenSentToast(true);
    setTimeout(() => {
      setKitchenSentToast(false);
    }, 2500);
  };

  const handleFinishPayment = () => {
    setShowPayModal(false);
    setIsProformaReceipt(false);
    setShowReceiptModal(true);
    setActiveBills(prev => prev.filter(b => b.orderNumber !== activeOrderNumber));
  };

  const handlePrintProforma = () => {
    setIsProformaReceipt(true);
    setShowReceiptModal(true);
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.qty), 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const pb1Tax = (subtotal - discountAmount) * 0.10;
  const total = subtotal - discountAmount + pb1Tax;
  const change = Math.max(0, cashTendered - total);

  const selectedTableObj = tables.find(t => t.id === selectedTable);
  const currentTableName = orderType === 'Take-Away' ? 'Take-Away' : selectedTableObj?.name || 'Meja';

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-neutral-100 overflow-hidden relative">
      <div className="flex-1 flex flex-col h-full overflow-hidden p-3 md:p-5">
        <div className="bg-white rounded-2xl p-3 shadow-xs mb-3 flex flex-wrap items-center justify-between gap-2.5 border border-neutral-200/70">
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl shrink-0">
            <button 
              onClick={() => setCashierMode('order')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                cashierMode === 'order' 
                  ? 'bg-amber-700 text-white shadow-xs' 
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Pesan Menu</span>
            </button>
            <button 
              onClick={() => setCashierMode('billing')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                cashierMode === 'billing' 
                  ? 'bg-amber-700 text-white shadow-xs' 
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Tagihan Meja</span>
              {activeBills.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none ${
                  cashierMode === 'billing' ? 'bg-white text-amber-800' : 'bg-red-500 text-white'
                }`}>
                  {activeBills.length}
                </span>
              )}
            </button>
          </div>

          {cashierMode === 'order' ? (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex bg-neutral-100 p-1 rounded-xl shrink-0">
                <button 
                  onClick={() => setOrderType('Dine-In')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                    orderType === 'Dine-In' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Dine-In
                </button>
                <button 
                  onClick={() => setOrderType('Take-Away')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                    orderType === 'Take-Away' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Take-Away
                </button>
              </div>

              {orderType === 'Dine-In' && (
                <select 
                  value={selectedTable} 
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="bg-neutral-100 text-neutral-800 text-xs font-bold py-1.5 px-3 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shrink-0"
                >
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.zone})
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl shrink-0">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{activeBills.length} Meja Menunggu Pembayaran</span>
            </div>
          )}
        </div>

        {cashierMode === 'order' && (
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="relative flex-1 sm:max-w-xs shrink-0">
              <Search className="absolute left-3 top-2.5 text-neutral-400 w-3.5 h-3.5 shrink-0" />
              <input 
                type="text"
                placeholder="Cari menu atau kode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white text-xs pl-8 pr-3 py-2 rounded-xl border border-neutral-200 shadow-xs outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>

            <div className="flex-1 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                    selectedCategory === cat 
                      ? 'bg-neutral-900 text-white shadow-xs' 
                      : 'bg-white text-neutral-600 hover:bg-neutral-50 border border-neutral-200/60 shadow-xs'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {kitchenSentToast && (
          <div className="mb-3 p-3 bg-emerald-600 text-white rounded-xl shadow-md flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-200" />
              <span className="font-bold">Pesanan berhasil dikirim ke antrian Kitchen Display ({activeOrderNumber})!</span>
            </div>
            <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-md font-mono">{currentTableName}</span>
          </div>
        )}

        {cashierMode === 'billing' ? (
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-neutral-800 text-sm">Daftar Tagihan Aktif (Menunggu Pembayaran)</h3>
                <p className="text-xs text-neutral-500">Pilih meja pelanggan untuk langsung memproses pembayaran di kasir</p>
              </div>
              <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                {activeBills.length} Meja Belum Dibayar
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {activeBills.map(bill => {
                const bSubtotal = bill.items.reduce((acc, i) => acc + (i.product.price * i.qty), 0);
                const bDisc = (bSubtotal * bill.discountPercent) / 100;
                const bTax = (bSubtotal - bDisc) * 0.10;
                const bTotal = bSubtotal - bDisc + bTax;

                return (
                  <div 
                    key={bill.id}
                    className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs hover:border-amber-500 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between pb-2 border-b border-neutral-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold bg-neutral-900 text-white px-2 py-0.5 rounded-md">
                              #{bill.orderNumber}
                            </span>
                            <h4 className="text-sm font-black text-neutral-900">{bill.tableName}</h4>
                          </div>
                          <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Masuk {bill.time} • {bill.waiter}
                          </p>
                        </div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wide ${
                          bill.status === 'billing' 
                            ? 'bg-red-100 text-red-700 border border-red-200 animate-pulse' 
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {bill.status === 'billing' ? 'Minta Bill' : 'Sedang Makan'}
                        </span>
                      </div>

                      <div className="py-2.5 space-y-1.5 text-xs">
                        {bill.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center text-neutral-700">
                            <span className="truncate pr-2 font-medium">{it.qty}x {it.product.name}</span>
                            <span className="font-mono text-neutral-500">{formatCurrency(it.product.price * it.qty)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-dashed border-neutral-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-neutral-400 block font-semibold">TOTAL TAGIHAN</span>
                        <span className="text-sm font-black text-amber-800">{formatCurrency(bTotal)}</span>
                      </div>
                      <button
                        onClick={() => loadBillToCashier(bill)}
                        className="bg-amber-700 hover:bg-amber-800 active:scale-95 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1 shadow-xs transition-all"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Proses Bayar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 pb-20 lg:pb-4">
                {filteredProducts.map(product => (
                  <div 
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col border border-neutral-100 group active:scale-98"
                  >
                    <div className="h-28 sm:h-32 w-full relative overflow-hidden bg-neutral-200">
                      <img 
                        src={product.image} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                      <span className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-mono px-1.5 py-0.5 rounded-md">
                        {product.code}
                      </span>
                    </div>
                    <div className="p-2.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-neutral-800 line-clamp-1">{product.name}</h4>
                        <p className="text-[10px] text-neutral-400 mt-0.5">{product.category}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-100">
                        <span className="text-xs font-extrabold text-amber-700">
                          {formatCurrency(product.price)}
                        </span>
                        <button className="w-5 h-5 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
        )}
      </div>

      <div className={`
        fixed lg:static inset-y-0 right-0 z-30 w-full sm:w-96 lg:w-[380px] bg-white border-l border-neutral-200 shadow-xl lg:shadow-none flex flex-col transition-transform duration-300
        ${mobileCartOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-3.5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
          <div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-600" />
              <h3 className="font-black text-neutral-900 text-sm">Kasir: Order #{activeOrderNumber}</h3>
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Tipe: <span className="font-bold text-neutral-700">{orderType}</span> • <span className="font-bold text-amber-800">{currentTableName}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => {
                setCart([]);
                setActiveOrderNumber('ORD-' + Math.floor(100 + Math.random() * 900));
              }}
              className="text-[11px] text-neutral-500 hover:text-red-600 font-semibold px-2 py-1 rounded-lg hover:bg-neutral-100"
            >
              Reset
            </button>
            <button 
              onClick={() => setMobileCartOpen(false)}
              className="lg:hidden p-1 text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-400 py-12">
              <Coffee className="w-10 h-10 stroke-[1.2] mb-2 opacity-50" />
              <p className="text-xs font-medium">Belum ada item dipilih</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Pilih produk atau pilih Tagihan Meja</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-100 flex flex-col gap-1.5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-2">
                    <h5 className="text-xs font-bold text-neutral-800 line-clamp-1">{item.product.name}</h5>
                    <p className="text-xs font-black text-neutral-700 mt-0.5">
                      {formatCurrency(item.product.price * item.qty)}
                    </p>
                  </div>
                  <button 
                    onClick={() => removeItem(item.product.id)}
                    className="text-neutral-400 hover:text-red-500 p-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {item.notes && (
                  <p className="text-[10px] text-amber-700 bg-amber-50/80 px-2 py-0.5 rounded-md inline-block">
                    Catatan: {item.notes}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-neutral-400 font-mono">
                    @{formatCurrency(item.product.price)}
                  </span>
                  <div className="flex items-center gap-1.5 bg-white rounded-lg border border-neutral-200 px-1 py-0.5">
                    <button 
                      onClick={() => updateQty(item.product.id, -1)}
                      className="p-0.5 text-neutral-500 hover:text-neutral-800 rounded"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                    <button 
                      onClick={() => updateQty(item.product.id, 1)}
                      className="p-0.5 text-neutral-500 hover:text-neutral-800 rounded"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3.5 border-t border-neutral-200 bg-white space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-500 flex items-center gap-1 font-medium">
              <Percent className="w-3 h-3 text-amber-600" /> Diskon
            </span>
            <div className="flex gap-1">
              {[0, 5, 10, 15].map(pct => (
                <button
                  key={pct}
                  onClick={() => setDiscountPercent(pct)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                    discountPercent === pct ? 'bg-amber-700 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1 text-xs text-neutral-600 pt-0.5">
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
            <div className="flex justify-between text-sm font-black text-neutral-900 pt-1.5 border-t border-dashed border-neutral-200">
              <span>Total Tagihan</span>
              <span className="text-amber-800 font-black">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button 
              disabled={cart.length === 0}
              onClick={handleSendToKitchen}
              className="bg-neutral-100 hover:bg-neutral-200 active:scale-98 disabled:opacity-50 text-neutral-800 font-bold py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs border border-neutral-200"
              title="Kirim pesanan ke dapur tanpa langsung bayar (Open Bill)"
            >
              <Send className="w-3.5 h-3.5 text-amber-700" />
              <span>Kirim Kitchen</span>
            </button>

            <button 
              disabled={cart.length === 0}
              onClick={handlePrintProforma}
              className="bg-neutral-100 hover:bg-neutral-200 active:scale-98 disabled:opacity-50 text-neutral-800 font-bold py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs border border-neutral-200"
              title="Cetak struk tagihan sementara sebelum bayar"
            >
              <Printer className="w-3.5 h-3.5 text-neutral-600" />
              <span>Contoh Struk</span>
            </button>
          </div>

          <button 
            disabled={cart.length === 0}
            onClick={() => setShowPayModal(true)}
            className="w-full bg-amber-700 hover:bg-amber-800 active:scale-98 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-extrabold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs sm:text-sm"
          >
            <CreditCard className="w-4 h-4" />
            <span>Bayar Sekarang ({formatCurrency(total)})</span>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-base font-bold text-neutral-900">Pembayaran Kasir #{activeOrderNumber}</h3>
                <p className="text-[11px] text-neutral-500">{orderType} • {currentTableName}</p>
              </div>
              <button 
                onClick={() => setShowPayModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-3 text-center bg-amber-50/50 py-3 rounded-2xl border border-amber-100">
              <span className="text-[11px] font-bold text-amber-900/80 uppercase tracking-wider">Total Yang Harus Dibayar</span>
              <p className="text-2xl font-black text-amber-800 mt-0.5">{formatCurrency(total)}</p>
            </div>

            <div className={`grid ${hasHotelModule ? 'grid-cols-4' : 'grid-cols-3'} gap-2 mb-3.5`}>
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-2 rounded-xl flex flex-col items-center gap-1 border text-xs font-bold transition-all ${
                  paymentMethod === 'cash' 
                    ? 'border-amber-700 bg-amber-50 text-amber-800 ring-2 ring-amber-700/20' 
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <Banknote className="w-4 h-4" />
                Tunai
              </button>

              <button
                onClick={() => setPaymentMethod('qris')}
                className={`p-2 rounded-xl flex flex-col items-center gap-1 border text-xs font-bold transition-all ${
                  paymentMethod === 'qris' 
                    ? 'border-amber-700 bg-amber-50 text-amber-800 ring-2 ring-amber-700/20' 
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <QrCode className="w-4 h-4" />
                QRIS
              </button>

              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-2 rounded-xl flex flex-col items-center gap-1 border text-xs font-bold transition-all ${
                  paymentMethod === 'card' 
                    ? 'border-amber-700 bg-amber-50 text-amber-800 ring-2 ring-amber-700/20' 
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Kartu / EDC
              </button>

              {hasHotelModule && (
                <button
                  onClick={() => setPaymentMethod('room_charge')}
                  className={`p-2 rounded-xl flex flex-col items-center gap-1 border text-xs font-bold transition-all ${
                    paymentMethod === 'room_charge' 
                      ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-600/20' 
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <Bed className="w-4 h-4 text-blue-600" />
                  Tagih Kamar
                </button>
              )}
            </div>

            {paymentMethod === 'room_charge' && (
              <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200 mb-3.5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-blue-900 font-bold">Nomor Kamar Hotel:</span>
                  <input
                    type="text"
                    placeholder="Contoh: 101"
                    value={roomNumberCharge}
                    onChange={(e) => setRoomNumberCharge(e.target.value)}
                    className="w-28 text-center bg-white border border-blue-300 rounded-lg px-2 py-1 font-black text-blue-900 outline-none"
                  />
                </div>
                <p className="text-[11px] text-blue-700 leading-tight">
                  ℹ️ Tagihan sebesar <strong>{formatCurrency(total)}</strong> otomatis dibukukan ke Folio Kamar #{roomNumberCharge} untuk pelunasan saat tamu Check-Out.
                </p>
              </div>
            )}

            {paymentMethod === 'cash' && (
              <div className="space-y-2.5 bg-neutral-50 p-3.5 rounded-2xl border border-neutral-100 mb-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-600 font-medium">Uang Diterima:</span>
                  <input 
                    type="number"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(Number(e.target.value))}
                    className="w-32 text-right bg-white border border-neutral-200 rounded-lg px-2 py-1 font-bold text-neutral-800 outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-4 gap-1 text-xs">
                  {[total, 50000, 100000, 150000].map(val => (
                    <button
                      key={val}
                      onClick={() => setCashTendered(val)}
                      className="bg-white border border-neutral-200 hover:bg-neutral-100 py-1 rounded-lg font-semibold text-[10px]"
                    >
                      {val === total ? 'Uang Pas' : formatCurrency(val).replace('Rp', '').trim()}
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
              <div className="text-center p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100 mb-3.5">
                <div className="w-32 h-32 bg-white mx-auto border border-neutral-300 rounded-xl flex items-center justify-center p-2 mb-1.5">
                  <QrCode className="w-24 h-24 text-neutral-800" />
                </div>
                <p className="text-xs font-semibold text-neutral-700">Scan QRIS Dinamis Toko</p>
                <p className="text-[10px] text-neutral-400">Verifikasi status transaksi otomatis</p>
              </div>
            )}

            {paymentMethod === 'card' && (
              <div className="text-center p-4 bg-neutral-50 rounded-2xl border border-neutral-100 mb-3.5">
                <CreditCard className="w-8 h-8 text-neutral-600 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-neutral-700">Gesek / Tap Kartu Debit/Kredit pada Mesin EDC</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">Masukkan approval code setelah transaksi berhasil</p>
              </div>
            )}

            <button 
              onClick={handleFinishPayment}
              className="w-full bg-amber-700 hover:bg-amber-800 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
            >
              <Printer className="w-4 h-4" /> Selesaikan & Buka Struk Kasir
            </button>
          </div>
        </div>
      )}

      {showReceiptModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-4 sm:p-5 shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-amber-700" />
                <h3 className="font-extrabold text-sm text-neutral-900">
                  {isProformaReceipt ? 'Contoh Tagihan (Pro-forma Bill)' : 'Struk Resmi Pembayaran'}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setShowReceiptModal(false);
                  if (!isProformaReceipt) {
                    setCart([]);
                    setActiveOrderNumber('ORD-' + Math.floor(100 + Math.random() * 900));
                  }
                }}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 my-3 bg-neutral-100 p-3 rounded-2xl flex justify-center">
              <div 
                id="thermal-receipt"
                className="w-full max-w-[280px] bg-white p-4 shadow-sm border border-neutral-300 font-mono text-[11px] text-neutral-900 leading-tight space-y-2 select-text"
              >
                <div className="text-center pb-2 border-b border-dashed border-neutral-400">
                  <h4 className="font-black text-sm uppercase">KOPI SENJA UTAMA</h4>
                  <p className="text-[10px] text-neutral-600">Jl. Kaliurang KM 5.5, Yogyakarta</p>
                  <p className="text-[9px] text-neutral-500">Telp: 0812-3456-7890 • NPWP: 98.765.432.1-012</p>
                  <p className="text-[9px] font-bold mt-1 text-neutral-700 uppercase">
                    {isProformaReceipt ? '** BILL SEMENTARA (BELUM LUNAS) **' : '** STRUK PEMBAYARAN KASIR **'}
                  </p>
                </div>

                <div className="space-y-0.5 text-[10px] py-1 border-b border-dashed border-neutral-300">
                  <div className="flex justify-between">
                    <span>No. Order:</span>
                    <span className="font-bold">#{activeOrderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Waktu:</span>
                    <span>22/11/2026 16:05</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kasir:</span>
                    <span>Siti Rahma (#KSR-01)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Meja/Tipe:</span>
                    <span className="font-bold">{currentTableName} ({orderType})</span>
                  </div>
                </div>

                <div className="py-2 space-y-2 border-b border-dashed border-neutral-400 text-[10px]">
                  {cart.map((it, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between font-bold">
                        <span>{it.product.name}</span>
                        <span>{formatCurrency(it.product.price * it.qty)}</span>
                      </div>
                      <div className="flex justify-between text-neutral-500 text-[9px]">
                        <span>{it.qty} x @{formatCurrency(it.product.price)}</span>
                      </div>
                      {it.notes && (
                        <p className="text-[9px] text-amber-700 italic pl-1">- {it.notes}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-1 text-[10px] py-1 border-b border-dashed border-neutral-400">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-neutral-600">
                      <span>Diskon ({discountPercent}%):</span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Pajak (PB1 10%):</span>
                    <span>{formatCurrency(pb1Tax)}</span>
                  </div>
                  <div className="flex justify-between font-black text-xs pt-1 border-t border-dashed border-neutral-300">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>

                {!isProformaReceipt ? (
                  <div className="space-y-0.5 text-[10px] py-1 border-b border-dashed border-neutral-300">
                    <div className="flex justify-between">
                      <span>Metode Bayar:</span>
                      <span className="font-bold uppercase">{paymentMethod}</span>
                    </div>
                    {paymentMethod === 'cash' && (
                      <>
                        <div className="flex justify-between">
                          <span>Tunai Diterima:</span>
                          <span>{formatCurrency(cashTendered)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Kembalian:</span>
                          <span>{formatCurrency(change)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between text-emerald-700 font-black mt-1">
                      <span>STATUS:</span>
                      <span>LUNAS (PAID)</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-1 text-[10px] text-amber-800 font-bold bg-amber-50 border border-dashed border-amber-300 rounded">
                    Harap bawa bill ini ke kasir untuk pembayaran
                  </div>
                )}

                <div className="text-center pt-2 text-[9px] text-neutral-500 space-y-0.5">
                  <p className="font-bold text-neutral-700">TERIMA KASIH ATAS KUNJUNGAN ANDA</p>
                  <p>Wifi: KopiSenja_Guest | Pass: senja123</p>
                  <p>Instagram: @kopisenja.utama</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button 
                onClick={() => window.print()}
                className="flex-1 bg-amber-700 hover:bg-amber-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all"
              >
                <Printer className="w-4 h-4" /> Cetak (Print Thermal)
              </button>
              <button 
                onClick={() => {
                  setShowReceiptModal(false);
                  if (!isProformaReceipt) {
                    setCart([]);
                    setActiveOrderNumber('ORD-' + Math.floor(100 + Math.random() * 900));
                  }
                }}
                className="px-4 bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-2.5 rounded-xl text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
