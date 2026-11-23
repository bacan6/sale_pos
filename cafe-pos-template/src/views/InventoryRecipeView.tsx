import React, { useState, useEffect } from 'react';
import { 
  PackageSearch, Plus, AlertTriangle, ArrowUpDown, 
  RefreshCw, X, Search, ArrowDownRight, ArrowUpRight
} from 'lucide-react';
import { posApi } from '../services/posApi';
import type { Ingredient, ProductRecipe, InventoryLog } from '../types/posV2';

interface ProductLite {
  id: number;
  name: string;
  price: number;
  category_name?: string;
}

export const InventoryRecipeView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'recipes' | 'logs'>('ingredients');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productRecipes, setProductRecipes] = useState<ProductRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showAddIngrModal, setShowAddIngrModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedIngrForAdjust, setSelectedIngrForAdjust] = useState<Ingredient | null>(null);
  const [adjustType, setAdjustType] = useState<'in_purchase' | 'waste' | 'opname_adjustment'>('opname_adjustment');
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustNotes, setAdjustNotes] = useState('');

  // New Ingredient Form
  const [newIngrName, setNewIngrName] = useState('');
  const [newIngrCode, setNewIngrCode] = useState('');
  const [newIngrUnit, setNewIngrUnit] = useState('gram');
  const [newIngrStock, setNewIngrStock] = useState<number>(0);
  const [newIngrCost, setNewIngrCost] = useState<number>(0);
  const [newIngrMinAlert, setNewIngrMinAlert] = useState<number>(100);

  // New Recipe Item Form
  const [recipeIngrId, setRecipeIngrId] = useState<number | ''>('');
  const [recipeQtyNeeded, setRecipeQtyNeeded] = useState<number>(1);
  const [recipeUnit, setRecipeUnit] = useState('gram');

  const loadData = async () => {
    setLoading(true);
    try {
      const [ingrData, logData] = await Promise.all([
        posApi.getIngredients(),
        posApi.getInventoryLogs(),
      ]);
      setIngredients(ingrData);
      setLogs(logData);

      // Load products for recipe selector
      const pRes = await fetch('http://localhost/sale_pos/api/v1/pos/products', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('pos_bearer_token') || ''}`
        }
      });
      const pJson = await pRes.json();
      if (pJson?.data && Array.isArray(pJson.data)) {
        setProducts(pJson.data);
        if (!selectedProductId && pJson.data.length > 0) {
          setSelectedProductId(pJson.data[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load inventory data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      posApi.getProductRecipes(selectedProductId).then(setProductRecipes).catch(console.error);
    }
  }, [selectedProductId]);

  const handleCreateIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngrName.trim()) return;
    try {
      await posApi.createIngredient({
        name: newIngrName,
        code: newIngrCode || undefined,
        unit: newIngrUnit,
        stock: newIngrStock,
        cost_per_unit: newIngrCost,
        min_stock_alert: newIngrMinAlert,
      });
      setShowAddIngrModal(false);
      setNewIngrName('');
      setNewIngrCode('');
      setNewIngrStock(0);
      setNewIngrCost(0);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan bahan baku');
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngrForAdjust) return;
    try {
      await posApi.adjustIngredientStock(selectedIngrForAdjust.id, {
        type: adjustType,
        quantity: adjustQty,
        notes: adjustNotes,
      });
      setShowAdjustModal(false);
      setSelectedIngrForAdjust(null);
      setAdjustNotes('');
      setAdjustQty(0);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyesuaikan stok bahan');
    }
  };

  const handleAddRecipeIngredient = () => {
    if (!recipeIngrId || recipeQtyNeeded <= 0) return;
    const ingr = ingredients.find(i => i.id === Number(recipeIngrId));
    if (!ingr) return;

    const exists = productRecipes.some(r => r.ingredient_id === ingr.id);
    if (exists) {
      alert('Bahan ini sudah ada dalam resep produk');
      return;
    }

    setProductRecipes([
      ...productRecipes,
      {
        ingredient_id: ingr.id,
        quantity_needed: recipeQtyNeeded,
        unit: recipeUnit || ingr.unit,
        ingredient_name: ingr.name,
        ingredient_code: ingr.code,
        current_stock: ingr.stock,
        cost_per_unit: ingr.cost_per_unit,
        estimated_cost: Math.round(recipeQtyNeeded * ingr.cost_per_unit),
      }
    ]);
    setRecipeIngrId('');
    setRecipeQtyNeeded(1);
  };

  const handleRemoveRecipeIngredient = (ingrId: number) => {
    setProductRecipes(productRecipes.filter(r => r.ingredient_id !== ingrId));
  };

  const handleSaveRecipe = async () => {
    if (!selectedProductId) return;
    try {
      await posApi.saveProductRecipes(
        selectedProductId,
        productRecipes.map(r => ({
          ingredient_id: r.ingredient_id,
          quantity_needed: r.quantity_needed,
          unit: r.unit,
        }))
      );
      alert('Resep BOM produk berhasil disimpan!');
      const updated = await posApi.getProductRecipes(selectedProductId);
      setProductRecipes(updated);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan resep BOM');
    }
  };

  const filteredIngredients = ingredients.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const totalBOMCost = productRecipes.reduce((acc, r) => acc + (r.estimated_cost || 0), 0);
  const marginEstimate = selectedProduct ? (selectedProduct.price - totalBOMCost) : 0;
  const marginPercent = selectedProduct && selectedProduct.price > 0 
    ? Math.round((marginEstimate / selectedProduct.price) * 100) 
    : 0;

  return (
    <div className="h-full w-full bg-neutral-100 overflow-y-auto p-4 md:p-6 flex flex-col pb-24 md:pb-6">
      <div className="max-w-6xl w-full mx-auto space-y-4">
        {/* Header Banner */}
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-neutral-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <PackageSearch className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">Manajemen Bahan & Resep BOM</h2>
              <p className="text-xs text-neutral-500 mt-0.5">Kelola bahan baku mentah, resep porsi produk, dan mutasi otomatis saat penjualan.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-600 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-500' : ''}`} />
            </button>
            {activeTab === 'ingredients' && (
              <button 
                onClick={() => setShowAddIngrModal(true)}
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4 text-amber-500" />
                <span>Tambah Bahan Baku</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-neutral-200/70 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('ingredients')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ingredients' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Katalog Bahan Baku ({ingredients.length})
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'recipes' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Resep Menu (BOM)
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'logs' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Riwayat Mutasi Stok
          </button>
        </div>

        {/* TAB 1: INGREDIENTS */}
        {activeTab === 'ingredients' && (
          <div className="space-y-4">
            <div className="bg-white p-3.5 rounded-2xl border border-neutral-200/60 shadow-xs flex items-center gap-2">
              <Search className="w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Cari nama atau kode bahan baku..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs font-medium focus:outline-none bg-transparent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredIngredients.map(ingr => (
                <div 
                  key={ingr.id} 
                  className={`bg-white p-4 rounded-2xl border transition-all shadow-xs flex flex-col justify-between ${
                    ingr.is_low_stock ? 'border-amber-400/80 bg-amber-50/20' : 'border-neutral-200/60'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-600">
                        {ingr.code}
                      </span>
                      {ingr.is_low_stock && (
                        <span className="flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Stok Menipis
                        </span>
                      )}
                    </div>
                    <h4 className="font-black text-sm text-neutral-900 mt-2">{ingr.name}</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Est. Biaya: Rp {ingr.cost_per_unit.toLocaleString('id-ID')} / {ingr.unit}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-neutral-400">Sisa Stok Fisik</p>
                      <p className={`text-base font-black ${ingr.stock <= 0 ? 'text-red-600' : ingr.is_low_stock ? 'text-amber-600' : 'text-neutral-900'}`}>
                        {ingr.stock} <span className="text-xs font-semibold text-neutral-500">{ingr.unit}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedIngrForAdjust(ingr);
                        setAdjustQty(ingr.stock);
                        setShowAdjustModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-bold transition-all flex items-center gap-1"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      <span>Opname</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: RECIPES (BOM) */}
        {activeTab === 'recipes' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left Product Selector */}
            <div className="bg-white p-4 rounded-3xl border border-neutral-200/60 shadow-xs space-y-3">
              <h3 className="font-black text-xs uppercase tracking-wider text-neutral-400">Pilih Menu Produk</h3>
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                {products.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProductId(p.id)}
                    className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between text-xs font-bold ${
                      selectedProductId === p.id 
                        ? 'bg-neutral-900 text-white shadow-sm' 
                        : 'hover:bg-neutral-50 text-neutral-700 border border-neutral-100'
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    <span className={`text-[11px] font-semibold ${selectedProductId === p.id ? 'text-amber-400' : 'text-neutral-500'}`}>
                      Rp {p.price.toLocaleString('id-ID')}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right BOM Formula Builder */}
            <div className="md:col-span-2 bg-white p-5 rounded-3xl border border-neutral-200/60 shadow-xs space-y-4">
              {selectedProduct ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                        Resep & Kalkulasi HPP
                      </span>
                      <h3 className="text-base font-black text-neutral-900 mt-1">{selectedProduct.name}</h3>
                      <p className="text-xs text-neutral-500">Harga Jual Menu: Rp {selectedProduct.price.toLocaleString('id-ID')}</p>
                    </div>

                    <div className="flex items-center gap-3 bg-neutral-50 p-2.5 rounded-2xl border border-neutral-200/60">
                      <div>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase">Total HPP Bahan</p>
                        <p className="text-xs font-black text-neutral-900">Rp {totalBOMCost.toLocaleString('id-ID')}</p>
                      </div>
                      <div className="h-6 w-px bg-neutral-200" />
                      <div>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase">Estimasi Margin</p>
                        <p className={`text-xs font-black ${marginEstimate > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          Rp {marginEstimate.toLocaleString('id-ID')} ({marginPercent}%)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Add ingredient to BOM */}
                  <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-200/60 space-y-2">
                    <p className="text-[11px] font-bold text-neutral-700">Tambah Komposisi Bahan ke Menu Ini:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <select
                        value={recipeIngrId}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setRecipeIngrId(val);
                          const sel = ingredients.find(i => i.id === val);
                          if (sel) setRecipeUnit(sel.unit);
                        }}
                        className="sm:col-span-2 text-xs font-medium border border-neutral-200 rounded-xl px-2.5 py-2 bg-white"
                      >
                        <option value="">-- Pilih Bahan Baku --</option>
                        {ingredients.map(i => (
                          <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Jumlah porsi"
                        value={recipeQtyNeeded}
                        onChange={(e) => setRecipeQtyNeeded(parseFloat(e.target.value) || 0)}
                        className="text-xs font-medium border border-neutral-200 rounded-xl px-2.5 py-2 bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddRecipeIngredient}
                        className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all"
                      >
                        + Tambah
                      </button>
                    </div>
                  </div>

                  {/* Recipe Table */}
                  <div className="border border-neutral-200/60 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-50 text-neutral-500 font-bold uppercase text-[10px] border-b border-neutral-200/60">
                        <tr>
                          <th className="p-3">Nama Bahan</th>
                          <th className="p-3">Kebutuhan / Porsi</th>
                          <th className="p-3">Biaya Satuan</th>
                          <th className="p-3">Subtotal HPP</th>
                          <th className="p-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 font-medium">
                        {productRecipes.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-neutral-400">
                              Belum ada bahan baku yang diatur untuk menu ini.
                            </td>
                          </tr>
                        ) : (
                          productRecipes.map(r => (
                            <tr key={r.ingredient_id} className="hover:bg-neutral-50/50">
                              <td className="p-3 font-bold text-neutral-800">{r.ingredient_name}</td>
                              <td className="p-3">{r.quantity_needed} {r.unit}</td>
                              <td className="p-3 text-neutral-500">Rp {(r.cost_per_unit || 0).toLocaleString('id-ID')}</td>
                              <td className="p-3 font-bold text-neutral-900">Rp {(r.estimated_cost || 0).toLocaleString('id-ID')}</td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRecipeIngredient(r.ingredient_id)}
                                  className="text-red-500 hover:text-red-700 p-1 text-xs font-bold"
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSaveRecipe}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-sm transition-all"
                    >
                      Simpan Komposisi Resep
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-10 text-center text-neutral-400 text-xs">Pilih produk di sebelah kiri</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MUTASI & LOGS */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-3xl border border-neutral-200/60 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="font-black text-sm text-neutral-900">Buku Mutasi Stok Bahan</h3>
              <span className="text-xs text-neutral-400 font-semibold">{logs.length} Mutasi Terakhir</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-500 font-bold uppercase text-[10px] border-b border-neutral-200/60">
                  <tr>
                    <th className="p-3">Waktu</th>
                    <th className="p-3">Bahan Baku</th>
                    <th className="p-3">Tipe Mutasi</th>
                    <th className="p-3">Jumlah</th>
                    <th className="p-3">Sisa Akhir</th>
                    <th className="p-3">Catatan / Ref</th>
                    <th className="p-3">Oleh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-neutral-400">Belum ada catatan mutasi bahan</td>
                    </tr>
                  ) : (
                    logs.map(log => {
                      const isMinus = log.quantity < 0;
                      return (
                        <tr key={log.id} className="hover:bg-neutral-50/50">
                          <td className="p-3 text-neutral-500 text-[11px] font-mono">{log.created_at}</td>
                          <td className="p-3 font-bold text-neutral-900">{log.ingredient_name}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              log.type === 'out_order' ? 'bg-amber-100 text-amber-700' :
                              log.type === 'waste' ? 'bg-red-100 text-red-700' :
                              log.type === 'in_purchase' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-neutral-100 text-neutral-700'
                            }`}>
                              {log.type === 'out_order' ? 'Penjualan Menu' :
                               log.type === 'waste' ? 'Waste / Rusak' :
                               log.type === 'in_purchase' ? 'Pembelian' : 'Stock Opname'}
                            </span>
                          </td>
                          <td className={`p-3 font-bold flex items-center gap-1 ${isMinus ? 'text-red-600' : 'text-emerald-600'}`}>
                            {isMinus ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                            {log.quantity > 0 ? `+${log.quantity}` : log.quantity} {log.unit}
                          </td>
                          <td className="p-3 font-semibold text-neutral-700">{log.balance_after} {log.unit}</td>
                          <td className="p-3 text-neutral-600 text-[11px]">{log.notes || log.reference_id || '-'}</td>
                          <td className="p-3 text-neutral-400 text-[11px]">{log.user_name || 'System'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL: TAMBAH BAHAN BAKU */}
        {showAddIngrModal && (
          <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-100 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="font-black text-sm text-neutral-900">Tambah Bahan Baku Baru</h3>
                <button onClick={() => setShowAddIngrModal(false)} className="text-neutral-400 hover:text-neutral-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateIngredient} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-neutral-600 block mb-1">Nama Bahan *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Biji Kopi Arabika, Sirup Karamel, Cup 16oz"
                    value={newIngrName}
                    onChange={(e) => setNewIngrName(e.target.value)}
                    className="w-full text-xs border border-neutral-200 rounded-xl p-2.5 bg-neutral-50 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-neutral-600 block mb-1">Kode Bahan</label>
                    <input
                      type="text"
                      placeholder="Auto jika kosong"
                      value={newIngrCode}
                      onChange={(e) => setNewIngrCode(e.target.value)}
                      className="w-full text-xs border border-neutral-200 rounded-xl p-2.5 bg-neutral-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-neutral-600 block mb-1">Satuan Unit *</label>
                    <select
                      value={newIngrUnit}
                      onChange={(e) => setNewIngrUnit(e.target.value)}
                      className="w-full text-xs border border-neutral-200 rounded-xl p-2.5 bg-neutral-50 focus:bg-white font-medium"
                    >
                      <option value="gram">gram (g)</option>
                      <option value="ml">mililiter (ml)</option>
                      <option value="pcs">pcs / butir</option>
                      <option value="slice">slice / lembar</option>
                      <option value="kg">kilogram (kg)</option>
                      <option value="liter">liter (L)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-neutral-600 block mb-1">Stok Awal</label>
                    <input
                      type="number"
                      step="any"
                      value={newIngrStock}
                      onChange={(e) => setNewIngrStock(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs border border-neutral-200 rounded-xl p-2.5 bg-neutral-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-neutral-600 block mb-1">HPP per Unit</label>
                    <input
                      type="number"
                      placeholder="Rp"
                      value={newIngrCost}
                      onChange={(e) => setNewIngrCost(parseInt(e.target.value) || 0)}
                      className="w-full text-xs border border-neutral-200 rounded-xl p-2.5 bg-neutral-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-neutral-600 block mb-1">Alert Minimal</label>
                    <input
                      type="number"
                      step="any"
                      value={newIngrMinAlert}
                      onChange={(e) => setNewIngrMinAlert(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs border border-neutral-200 rounded-xl p-2.5 bg-neutral-50 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setShowAddIngrModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white"
                  >
                    Simpan Bahan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: STOCK OPNAME / ADJUST */}
        {showAdjustModal && selectedIngrForAdjust && (
          <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-100 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div>
                  <h3 className="font-black text-sm text-neutral-900">Penyesuaian Stok (Opname)</h3>
                  <p className="text-xs text-neutral-500">{selectedIngrForAdjust.name}</p>
                </div>
                <button onClick={() => setShowAdjustModal(false)} className="text-neutral-400 hover:text-neutral-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAdjustStock} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-neutral-600 block mb-1">Tipe Mutasi</label>
                  <select
                    value={adjustType}
                    onChange={(e: any) => setAdjustType(e.target.value)}
                    className="w-full text-xs border border-neutral-200 rounded-xl p-2.5 bg-neutral-50 focus:bg-white font-medium"
                  >
                    <option value="opname_adjustment">Stock Opname Fisik (Koreksi Saldo Akhir)</option>
                    <option value="in_purchase">Pembelian Masuk (+)</option>
                    <option value="waste">Waste / Kerusakan / Kedaluwarsa (-)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-600 block mb-1">
                    {adjustType === 'opname_adjustment' 
                      ? `Hasil Hitung Fisik Sebenarnya (${selectedIngrForAdjust.unit})` 
                      : `Jumlah Ditambah/Dikurang (${selectedIngrForAdjust.unit})`}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs border border-neutral-200 rounded-xl p-2.5 bg-neutral-50 focus:bg-white font-bold"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Stok sistem saat ini: {selectedIngrForAdjust.stock} {selectedIngrForAdjust.unit}
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-600 block mb-1">Alasan / Catatan</label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Kalibrasi grinder, salah input, atau stok fisik opname mingguan"
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                    className="w-full text-xs border border-neutral-200 rounded-xl p-2.5 bg-neutral-50 focus:bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setShowAdjustModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Update Stok
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
