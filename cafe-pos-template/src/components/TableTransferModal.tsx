import React, { useState } from 'react';
import { X, ArrowRightLeft, Merge } from 'lucide-react';
import type { TableItem } from '../data/mockData';
import { formatCurrency } from '../data/mockData';

interface TableTransferModalProps {
  currentTable: TableItem;
  allTables: TableItem[];
  onClose: () => void;
  onMoveSuccess: (toTableId: string, toTableName: string) => void;
  onMergeSuccess: (toTableId: string, toTableName: string) => void;
}

export const TableTransferModal: React.FC<TableTransferModalProps> = ({
  currentTable,
  allTables,
  onClose,
  onMoveSuccess,
  onMergeSuccess,
}) => {
  const [actionType, setActionType] = useState<'move' | 'merge'>('move');
  const [targetTableId, setTargetTableId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const availableTables = allTables.filter(t => t.id !== currentTable.id && t.status === 'available');
  const occupiedTables = allTables.filter(t => t.id !== currentTable.id && t.status === 'occupied');

  const targetList = actionType === 'move' ? availableTables : occupiedTables;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTableId) {
      alert(`Pilih meja tujuan untuk ${actionType === 'move' ? 'pindah' : 'gabung'}`);
      return;
    }

    const target = allTables.find(t => t.id === targetTableId);
    if (!target) return;

    if (actionType === 'move') {
      onMoveSuccess(targetTableId, target.name);
    } else {
      onMergeSuccess(targetTableId, target.name);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-100 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              {actionType === 'move' ? <ArrowRightLeft className="w-5 h-5" /> : <Merge className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-black text-sm text-neutral-900">Operasi Meja (Move / Merge)</h3>
              <p className="text-xs text-neutral-500">Meja Asal: <span className="font-bold text-neutral-800">{currentTable.name}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Type Toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setActionType('move');
              setTargetTableId('');
            }}
            className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              actionType === 'move'
                ? 'bg-neutral-900 border-neutral-900 text-white shadow-xs'
                : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Pindah Meja (Move)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActionType('merge');
              setTargetTableId('');
            }}
            className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              actionType === 'merge'
                ? 'bg-neutral-900 border-neutral-900 text-white shadow-xs'
                : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            <Merge className="w-4 h-4" />
            <span>Gabung Meja (Merge)</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-neutral-700 block mb-1">
              {actionType === 'move' ? 'Pilih Meja Tujuan (Yang Masih Kosong):' : 'Pilih Meja Tujuan (Yang Sedang Terisi):'}
            </label>
            {targetList.length === 0 ? (
              <p className="p-3 bg-neutral-100 rounded-xl text-neutral-400 text-center font-medium">
                {actionType === 'move' ? 'Tidak ada meja kosong tersedia saat ini' : 'Tidak ada meja terisi lain untuk digabung'}
              </p>
            ) : (
              <select
                required
                value={targetTableId}
                onChange={(e) => setTargetTableId(e.target.value)}
                className="w-full text-xs font-bold border border-neutral-300 rounded-xl p-2.5 bg-neutral-50 focus:bg-white"
              >
                <option value="">-- Pilih Meja Tujuan --</option>
                {targetList.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.zone}) - Kapasitas {t.capacity} orang {t.activeOrderNumber ? `[Pesanan: ${t.activeOrderNumber}]` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="font-bold text-neutral-700 block mb-1">Alasan / Catatan</label>
            <input
              type="text"
              placeholder={actionType === 'move' ? 'Contoh: Tamu ingin pindah ke outdoor area' : 'Contoh: Tamu gabung rombongan'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs border border-neutral-300 rounded-xl p-2.5 bg-neutral-50 focus:bg-white"
            />
          </div>

          {currentTable.activeOrderNumber && (
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
              <p className="text-[11px] font-bold text-amber-900">
                Pesanan Aktif: {currentTable.activeOrderNumber}
              </p>
              <p className="text-[10px] text-amber-700 mt-0.5">
                Total Tagihan: {formatCurrency(currentTable.activeOrderTotal || 0)}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={targetList.length === 0}
              className="px-5 py-2 rounded-xl text-xs font-black bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 text-white transition-all shadow-xs"
            >
              Konfirmasi {actionType === 'move' ? 'Pindah Meja' : 'Gabung Meja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
