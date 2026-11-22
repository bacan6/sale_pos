import React, { useState } from 'react';
import { 
  ShoppingBag, Search, Plus, Minus, X, 
  Sparkles, CheckCircle2, ChevronRight, MessageSquare
} from 'lucide-react';
import type { Product } from '../data/mockData';
import { INITIAL_PRODUCTS, CATEGORIES, formatCurrency } from '../data/mockData';

export const CustomerMenuView: React.FC = () => {
  const [products] = useState<Product[]>(INITIAL_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [itemNotes, setItemNotes] = useState('');
  const [modalQty, setModalQty] = useState(1);

  const [cart, setCart] = useState<{
    id: string;
    product: Product;
    qty: number;
    options: Record<string, string>;
    notes: string;
  }[]>([]);

  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);

  const filteredProducts = products.filter(p => {
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchQuery = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery && p.isAvailable;
  });

  const openCustomizer = (product: Product) => {
    setSelectedProduct(product);
    setModalQty(1);
    setItemNotes('');
    const defaultOpts: Record<string, string> = {};
    if (product.options) {
      product.options.forEach(opt => {
        defaultOpts[opt.name] = opt.choices[0];
      });
    }
    setSelectedOptions(defaultOpts);
  };

  const handleAddToCartFromModal = () => {
    if (!selectedProduct) return;
    const newItem = {
      id: `${selectedProduct.id}-${Date.now()}`,
      product: selectedProduct,
      qty: modalQty,
      options: selectedOptions,
      notes: itemNotes
    };
    setCart(prev => [...prev, newItem]);
    setSelectedProduct(null);
  };

  const totalItems = cart.reduce((acc, i) => acc + i.qty, 0);
  const totalPrice = cart.reduce((acc, i) => acc + (i.product.price * i.qty), 0);

  return (
    <div className="h-full w-full bg-neutral-50 overflow-y-auto pb-24 lg:pb-8 flex flex-col items-center">
      <div className="w-full max-w-4xl px-4 py-4 sm:py-6">
        <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 rounded-3xl p-6 text-white shadow-lg mb-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-amber-100 text-xs font-semibold backdrop-blur-md mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Self-Order Table Kiosk
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">Kopi Senja Utama</h1>
              <p className="text-xs sm:text-sm text-amber-200 mt-1">
                Silakan pilih menu favorit Anda langsung dari meja ini.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-2xl text-center self-start sm:self-auto">
              <span className="text-[10px] uppercase font-bold text-amber-200 tracking-wider">Nomor Meja</span>
              <p className="text-lg sm:text-xl font-black text-white">Meja 02</p>
            </div>
          </div>
        </div>

        <div className="relative mb-5">
          <Search className="absolute left-4 top-3.5 text-neutral-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="Cari kopi, makanan ringan, atau dessert..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white text-sm pl-12 pr-4 py-3 rounded-2xl shadow-xs border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none mb-6">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat 
                  ? 'bg-amber-700 text-white shadow-md shadow-amber-700/20' 
                  : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200/70'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredProducts.map(product => (
            <div 
              key={product.id}
              className="bg-white rounded-3xl p-3 shadow-xs border border-neutral-100 hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div className="relative h-44 rounded-2xl overflow-hidden bg-neutral-100 mb-3">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute bottom-2 left-2 bg-neutral-900/70 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                  {product.category}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-neutral-900 text-sm sm:text-base leading-snug">{product.name}</h3>
                <p className="text-xs text-neutral-500 line-clamp-2 mt-1 leading-relaxed">
                  {product.description || 'Pilihan lezat dengan bahan berkualitas tinggi.'}
                </p>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-100">
                <span className="text-sm sm:text-base font-black text-amber-700">
                  {formatCurrency(product.price)}
                </span>
                <button
                  onClick={() => openCustomizer(product)}
                  className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1 shadow-xs transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Pesan</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {totalItems > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-xl mx-auto z-40">
          <div className="bg-neutral-900 text-white p-3.5 rounded-3xl shadow-2xl flex items-center justify-between border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-3 pl-2">
              <div className="w-10 h-10 rounded-2xl bg-amber-600 flex items-center justify-center font-bold text-sm text-white">
                {totalItems}
              </div>
              <div>
                <p className="text-xs text-neutral-400">Total Sementara</p>
                <p className="text-sm font-extrabold text-white">{formatCurrency(totalPrice)}</p>
              </div>
            </div>

            <button 
              onClick={() => setShowCartDrawer(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-4 py-2.5 rounded-2xl flex items-center gap-1.5 transition-all shadow-md"
            >
              <span>Keranjang</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="font-bold text-base text-neutral-900">Kustomisasi Pesanan</h3>
              <button 
                onClick={() => setSelectedProduct(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 py-3 space-y-4">
              <div className="flex gap-3 items-center">
                <img 
                  src={selectedProduct.image} 
                  alt={selectedProduct.name} 
                  className="w-16 h-16 rounded-2xl object-cover"
                />
                <div>
                  <h4 className="font-bold text-neutral-800 text-sm">{selectedProduct.name}</h4>
                  <p className="text-xs font-black text-amber-700 mt-0.5">{formatCurrency(selectedProduct.price)}</p>
                </div>
              </div>

              {selectedProduct.options?.map(optGroup => (
                <div key={optGroup.name} className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700">{optGroup.name}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {optGroup.choices.map(choice => (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => setSelectedOptions(prev => ({ ...prev, [optGroup.name]: choice }))}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold text-center border transition-all ${
                          selectedOptions[optGroup.name] === choice
                            ? 'border-amber-600 bg-amber-50 text-amber-800'
                            : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-neutral-400" /> Catatan Khusus
                </label>
                <input 
                  type="text"
                  placeholder="Misal: Jangan pakai sedotan plastik, es sedikit"
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  className="w-full bg-neutral-50 text-xs px-3 py-2.5 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-neutral-700">Jumlah:</span>
                <div className="flex items-center gap-3 bg-neutral-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setModalQty(Math.max(1, modalQty - 1))}
                    className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center font-bold text-neutral-700"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-sm w-6 text-center">{modalQty}</span>
                  <button 
                    onClick={() => setModalQty(modalQty + 1)}
                    className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center font-bold text-neutral-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100">
              <button 
                onClick={handleAddToCartFromModal}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-2xl text-xs shadow-md"
              >
                Tambahkan Ke Pesanan • {formatCurrency(selectedProduct.price * modalQty)}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCartDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col p-5 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-neutral-900">Review Pesanan Meja 02</h3>
              </div>
              <button onClick={() => setShowCartDrawer(false)} className="p-1 text-neutral-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {cart.map((item, idx) => (
                <div key={item.id} className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100 flex flex-col gap-1.5">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-xs text-neutral-800">{item.product.name} ({item.qty}x)</span>
                    <span className="font-extrabold text-xs text-amber-700">{formatCurrency(item.product.price * item.qty)}</span>
                  </div>
                  {Object.entries(item.options).length > 0 && (
                    <p className="text-[11px] text-neutral-500">
                      {Object.entries(item.options).map(([k, v]) => `${k}: ${v}`).join(', ')}
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-[11px] text-amber-700 italic">"{item.notes}"</p>
                  )}
                  <button 
                    onClick={() => setCart(prev => prev.filter((_, i) => i !== idx))}
                    className="text-[11px] text-red-500 self-end font-semibold mt-1"
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-neutral-100 space-y-2">
              <div className="flex justify-between text-xs text-neutral-600">
                <span>Subtotal</span>
                <span>{formatCurrency(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-xs text-neutral-600">
                <span>Pajak (PB1 10%)</span>
                <span>{formatCurrency(totalPrice * 0.1)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-neutral-900 pt-1 border-t border-dashed">
                <span>Total Estimasi</span>
                <span className="text-amber-700">{formatCurrency(totalPrice * 1.1)}</span>
              </div>

              <button 
                onClick={() => {
                  setOrderSubmitted(true);
                  setShowCartDrawer(false);
                  setCart([]);
                }}
                className="w-full bg-amber-700 hover:bg-amber-800 text-white font-bold py-3.5 rounded-2xl text-xs shadow-lg mt-3"
              >
                Kirim Pesanan ke Dapur
              </button>
            </div>
          </div>
        </div>
      )}

      {orderSubmitted && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 text-center max-w-sm w-full shadow-2xl">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-black text-neutral-900">Pesanan Berhasil Dikirim!</h3>
            <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
              Instruksi pesanan Anda sudah langsung diteruskan ke tim dapur Kopi Senja. Silakan tunggu di meja Anda.
            </p>
            <button 
              onClick={() => setOrderSubmitted(false)}
              className="w-full bg-neutral-900 text-white font-bold text-xs py-3 rounded-2xl mt-5"
            >
              Kembali ke Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
