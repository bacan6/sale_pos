import React, { useState } from 'react';
import { 
  Table, Users, Plus, CheckCircle, 
  CreditCard, X 
} from 'lucide-react';
import type { TableItem } from '../data/mockData';
import { INITIAL_TABLES, formatCurrency } from '../data/mockData';

export const TableManagementView: React.FC = () => {
  const [tables, setTables] = useState<TableItem[]>(INITIAL_TABLES);
  const [selectedZone, setSelectedZone] = useState<'All' | 'Indoor' | 'Outdoor' | 'VIP Area'>('All');
  
  const [showModal, setShowModal] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [newTableZone, setNewTableZone] = useState<'Indoor' | 'Outdoor' | 'VIP Area'>('Indoor');

  const filteredTables = tables.filter(t => selectedZone === 'All' || t.zone === selectedZone);

  const occupiedCount = tables.filter(t => t.status === 'occupied').length;
  const availableCount = tables.filter(t => t.status === 'available').length;
  const billingCount = tables.filter(t => t.status === 'billing').length;

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    const newT: TableItem = {
      id: `t-${Date.now()}`,
      name: newTableName,
      capacity: newTableCapacity,
      zone: newTableZone,
      status: 'available'
    };
    setTables([...tables, newT]);
    setShowModal(false);
    setNewTableName('');
  };

  const updateTableStatus = (id: string, newStatus: TableItem['status']) => {
    setTables(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  return (
    <div className="h-full w-full bg-neutral-100 overflow-y-auto p-4 md:p-6 flex flex-col pb-24 md:pb-6">
      <div className="max-w-6xl w-full mx-auto space-y-4">
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-neutral-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">Master Data & Denah Meja</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Kelola status meja, zona layout cafe, kapasitas kursi, dan pesanan aktif.</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-amber-500" />
            <span>Tambah Meja Baru</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-neutral-200/60 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-neutral-400 font-bold uppercase">Total Meja</p>
              <h4 className="text-xl font-black text-neutral-900 mt-0.5">{tables.length}</h4>
            </div>
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700">
              <Table className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-neutral-200/60 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-emerald-600 font-bold uppercase">Meja Kosong</p>
              <h4 className="text-xl font-black text-emerald-600 mt-0.5">{availableCount}</h4>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-neutral-200/60 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-red-600 font-bold uppercase">Meja Terisi</p>
              <h4 className="text-xl font-black text-red-600 mt-0.5">{occupiedCount}</h4>
            </div>
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-neutral-200/60 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-blue-600 font-bold uppercase">Minta Billing</p>
              <h4 className="text-xl font-black text-blue-600 mt-0.5">{billingCount}</h4>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {(['All', 'Indoor', 'Outdoor', 'VIP Area'] as const).map(zone => (
            <button
              key={zone}
              onClick={() => setSelectedZone(zone)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedZone === zone 
                  ? 'bg-amber-800 text-white shadow-xs' 
                  : 'bg-white text-neutral-600 hover:bg-neutral-50 border border-neutral-200/80'
              }`}
            >
              {zone}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTables.map(t => {
            const isAvailable = t.status === 'available';
            const isOccupied = t.status === 'occupied';
            const isBilling = t.status === 'billing';

            return (
              <div 
                key={t.id}
                className={`bg-white rounded-3xl p-4 border-2 shadow-xs flex flex-col justify-between transition-all ${
                  isAvailable ? 'border-emerald-200 hover:border-emerald-400' :
                  isOccupied ? 'border-red-200 bg-red-50/20' :
                  isBilling ? 'border-blue-300 bg-blue-50/30' :
                  'border-amber-200 bg-amber-50/20'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-md">
                      {t.zone}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      isAvailable ? 'bg-emerald-100 text-emerald-800' :
                      isOccupied ? 'bg-red-100 text-red-800' :
                      isBilling ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {t.status}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-neutral-900">{t.name}</h3>
                  <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                    <Users className="w-3.5 h-3.5 text-neutral-400" /> Kapasitas {t.capacity} Orang
                  </p>

                  {t.activeOrderNumber && (
                    <div className="mt-3 p-2.5 rounded-xl bg-neutral-100/80 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-neutral-800">
                        <span>{t.activeOrderNumber}</span>
                        <span className="text-amber-800">{formatCurrency(t.activeOrderTotal || 0)}</span>
                      </div>
                      <p className="text-[10px] text-neutral-500">{t.guestCount} Tamu Aktif</p>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-neutral-100 flex items-center justify-between gap-1 text-[11px]">
                  <select 
                    value={t.status}
                    onChange={(e) => updateTableStatus(t.id, e.target.value as TableItem['status'])}
                    className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold py-1.5 px-2 rounded-xl border-none outline-none cursor-pointer"
                  >
                    <option value="available">🟢 Set Kosong</option>
                    <option value="occupied">🔴 Set Terisi</option>
                    <option value="billing">🔵 Set Minta Billing</option>
                    <option value="reserved">🟡 Set Reserved</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleAddTable} className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <h3 className="font-bold text-base text-neutral-900">Tambah Meja Baru</h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-neutral-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-neutral-700 block mb-1">Nama Meja</label>
                <input 
                  type="text"
                  required
                  placeholder="Misal: Meja 10 atau VIP 03"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">Kapasitas Kursi</label>
                <input 
                  type="number"
                  required
                  min={1}
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(Number(e.target.value))}
                  className="w-full bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">Zona / Area</label>
                <select 
                  value={newTableZone}
                  onChange={(e) => setNewTableZone(e.target.value as any)}
                  className="w-full bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200 outline-none"
                >
                  <option value="Indoor">Indoor (AC)</option>
                  <option value="Outdoor">Outdoor (Smoking)</option>
                  <option value="VIP Area">VIP Area</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                className="flex-1 bg-neutral-100 py-2.5 rounded-xl text-xs font-bold text-neutral-700"
              >
                Batal
              </button>
              <button 
                type="submit" 
                className="flex-1 bg-amber-700 hover:bg-amber-800 py-2.5 rounded-xl text-xs font-bold text-white shadow-md"
              >
                Simpan Meja
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
