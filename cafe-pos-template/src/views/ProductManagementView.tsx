import React, { useState } from 'react';
import { 
  Search, Plus, Edit2, Trash2, 
  CheckCircle2, XCircle, X 
} from 'lucide-react';
import type { Product } from '../data/mockData';
import { INITIAL_PRODUCTS, CATEGORIES, formatCurrency } from '../data/mockData';

export const ProductManagementView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('All');
  
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: 'Coffee' as Product['category'],
    price: 25000,
    cost: 8000,
    stock: 50,
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400&auto=format&fit=crop&q=80',
    description: ''
  });

  const filtered = products.filter(p => {
    const matchCat = selectedCat === 'All' || p.category === selectedCat;
    const matchQuery = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       p.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  const openAddModal = () => {
    setEditProduct(null);
    setFormData({
      name: '',
      code: `CF-00${products.length + 1}`,
      category: 'Coffee',
      price: 25000,
      cost: 8000,
      stock: 50,
      isAvailable: true,
      image: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400&auto=format&fit=crop&q=80',
      description: ''
    });
    setShowModal(true);
  };

  const openEditModal = (p: Product) => {
    setEditProduct(p);
    setFormData({
      name: p.name,
      code: p.code,
      category: p.category,
      price: p.price,
      cost: p.cost,
      stock: p.stock,
      isAvailable: p.isAvailable,
      image: p.image,
      description: p.description || ''
    });
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editProduct) {
      setProducts(prev => prev.map(p => p.id === editProduct.id ? { ...p, ...formData } : p));
    } else {
      const newP: Product = {
        id: `p-${Date.now()}`,
        ...formData
      };
      setProducts(prev => [newP, ...prev]);
    }
    setShowModal(false);
  };

  const toggleAvailability = (id: string) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, isAvailable: !p.isAvailable } : p));
  };

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus produk ini?')) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  return (
    <div className="h-full w-full bg-neutral-100 overflow-y-auto p-4 md:p-6 flex flex-col pb-24 md:pb-6">
      <div className="max-w-6xl w-full mx-auto space-y-4">
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-neutral-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">Pengelolaan Produk & Harga</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Kelola katalog menu cafe, harga jual, margin keuntungan, dan stok harian.</p>
          </div>
          <button 
            onClick={openAddModal}
            className="bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Menu Baru</span>
          </button>
        </div>

        <div className="bg-white p-3 rounded-2xl shadow-xs border border-neutral-200/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input 
              type="text"
              placeholder="Cari nama atau kode produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-50 text-xs pl-9 pr-3 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-amber-600"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCat === cat ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xs border border-neutral-200/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-200 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Menu Produk</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Harga Jual</th>
                  <th className="py-3 px-4">HPP (Modal)</th>
                  <th className="py-3 px-4">Margin</th>
                  <th className="py-3 px-4">Stok</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {filtered.map(product => {
                  const marginPct = Math.round(((product.price - product.cost) / product.price) * 100);
                  return (
                    <tr key={product.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={product.image} 
                            alt={product.name} 
                            className="w-10 h-10 rounded-xl object-cover bg-neutral-100 shrink-0" 
                          />
                          <div>
                            <p className="font-bold text-neutral-900">{product.name}</p>
                            <span className="text-[10px] font-mono text-neutral-400">{product.code}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                          {product.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-extrabold text-neutral-900">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="py-3 px-4 text-neutral-500">
                        {formatCurrency(product.cost)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-extrabold text-[11px]">
                          +{marginPct}%
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-neutral-700">
                        {product.stock} porsi
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleAvailability(product.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                            product.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {product.isAvailable ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          <span>{product.isAvailable ? 'Tersedia' : 'Habis'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-1.5 text-neutral-500 hover:text-amber-700 hover:bg-neutral-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="font-bold text-base text-neutral-900">
                {editProduct ? 'Edit Informasi Produk' : 'Tambah Produk Baru'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="font-bold text-neutral-700 mb-1 block">Nama Menu</label>
                <input 
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Misal: Iced Americano"
                  className="w-full bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 mb-1 block">Kode Menu (SKU)</label>
                <input 
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 mb-1 block">Kategori</label>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200 outline-none"
                >
                  {CATEGORIES.filter(c => c !== 'All').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-neutral-700 mb-1 block">Harga Jual (Rp)</label>
                <input 
                  type="number"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200 outline-none font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 mb-1 block">HPP / Biaya Modal (Rp)</label>
                <input 
                  type="number"
                  required
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                  className="w-full bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 mb-1 block">Stok Harian</label>
                <input 
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                  className="w-full bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input 
                  type="checkbox"
                  id="avail-check"
                  checked={formData.isAvailable}
                  onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                  className="w-4 h-4 accent-amber-600 rounded"
                />
                <label htmlFor="avail-check" className="font-semibold text-neutral-800">Status Tersedia</label>
              </div>

              <div className="col-span-2">
                <label className="font-bold text-neutral-700 mb-1 block">URL Gambar</label>
                <input 
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200 outline-none text-neutral-600 text-[11px]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 flex gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold py-2.5 rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 bg-amber-700 hover:bg-amber-800 text-white font-bold py-2.5 rounded-xl text-xs shadow-md"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
