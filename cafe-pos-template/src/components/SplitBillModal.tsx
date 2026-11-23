import React, { useState } from 'react';
import { X, Scissors, Users } from 'lucide-react';
import { formatCurrency } from '../data/mockData';
import type { Product } from '../data/mockData';

interface SplitBillModalProps {
  orderNumber: string;
  tableName: string;
  items: { product: Product; qty: number; notes: string }[];
  total: number;
  onClose: () => void;
  onSplitConfirm: (splitResult: {
    splitType: 'by_item' | 'equal';
    splitItems?: { product: Product; qty: number }[];
    splitShares?: { payer: number; amount: number }[];
  }) => void;
}

export const SplitBillModal: React.FC<SplitBillModalProps> = ({
  orderNumber,
  tableName,
  items,
  total,
  onClose,
  onSplitConfirm,
}) => {
  const [splitType, setSplitType] = useState<'by_item' | 'equal'>('by_item');
  const [equalCount, setEqualCount] = useState<number>(2);

  // Selected items for split by item
  const [itemSelections, setItemSelections] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    items.forEach(i => {
      init[i.product.id] = 0;
    });
    return init;
  });

  const handleQtyChange = (prodId: string, maxQty: number, val: number) => {
    const safeVal = Math.max(0, Math.min(maxQty, val));
    setItemSelections(prev => ({
      ...prev,
      [prodId]: safeVal,
    }));
  };

  // Calculations for Split by item
  const splitSubtotal = items.reduce((acc, it) => {
    const selQty = itemSelections[it.product.id] || 0;
    return acc + (it.product.price * selQty);
  }, 0);
  const splitTax = splitSubtotal * 0.10;
  const splitTotal = splitSubtotal + splitTax;

  const remainingTotal = Math.max(0, total - splitTotal);

  // Calculations for Equal split
  const baseEqualShare = Math.floor(total / equalCount);
  const remainder = total % equalCount;
  const equalShares = Array.from({ length: equalCount }, (_, idx) => ({
    payer: idx + 1,
    amount: baseEqualShare + (idx < remainder ? 1 : 0),
  }));

  const handleConfirm = () => {
    if (splitType === 'equal') {
      onSplitConfirm({
        splitType: 'equal',
        splitShares: equalShares,
      });
    } else {
      const selectedList = items
        .filter(it => (itemSelections[it.product.id] || 0) > 0)
        .map(it => ({
          product: it.product,
          qty: itemSelections[it.product.id],
        }));

      if (selectedList.length === 0) {
        alert('Pilih minimal 1 porsi menu untuk dipisahkan ke bill baru.');
        return;
      }

      onSplitConfirm({
        splitType: 'by_item',
        splitItems: selectedList,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-neutral-900">Split Bill (Pisah Tagihan)</h3>
              <p className="text-xs text-neutral-500">{orderNumber} • {tableName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2 mt-4 shrink-0">
          <button
            type="button"
            onClick={() => setSplitType('by_item')}
            className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              splitType === 'by_item' 
                ? 'bg-neutral-900 border-neutral-900 text-white shadow-xs' 
                : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>Pilih Item per Porsi</span>
          </button>
          <button
            type="button"
            onClick={() => setSplitType('equal')}
            className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              splitType === 'equal' 
                ? 'bg-neutral-900 border-neutral-900 text-white shadow-xs' 
                : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Bagi Rata (Equal Split)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-1 text-xs">
          {splitType === 'by_item' ? (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-neutral-500">
                Tentukan berapa porsi yang akan dibayar pada bill terpisah ini:
              </p>
              {items.map(it => {
                const sel = itemSelections[it.product.id] || 0;
                return (
                  <div key={it.product.id} className="p-3 rounded-2xl border border-neutral-200/80 bg-neutral-50 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-neutral-900">{it.product.name}</p>
                      <p className="text-[11px] text-neutral-500">
                        {formatCurrency(it.product.price)} • Total di meja: {it.qty} porsi
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-neutral-400 font-semibold">Pisahkan:</span>
                      <select
                        value={sel}
                        onChange={(e) => handleQtyChange(it.product.id, it.qty, parseInt(e.target.value) || 0)}
                        className="bg-white border border-neutral-300 font-black rounded-xl px-2.5 py-1 text-xs outline-none"
                      >
                        {Array.from({ length: it.qty + 1 }, (_, i) => (
                          <option key={i} value={i}>{i} porsi</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}

              {/* Split Summary Box */}
              <div className="mt-3 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5 font-bold">
                <div className="flex justify-between text-amber-900">
                  <span>Tagihan Sub-Bill yang Dipisah:</span>
                  <span>{formatCurrency(splitTotal)}</span>
                </div>
                <div className="flex justify-between text-neutral-500 font-medium">
                  <span>Sisa Tagihan di Meja:</span>
                  <span>{formatCurrency(remainingTotal)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                  Bagi total tagihan menjadi berapa orang?
                </label>
                <div className="flex items-center gap-2">
                  {[2, 3, 4, 5, 6].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setEqualCount(n)}
                      className={`flex-1 py-2 rounded-xl text-xs font-black transition-all border ${
                        equalCount === n 
                          ? 'bg-amber-600 border-amber-600 text-white' 
                          : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      {n} Orang
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2">
                <p className="text-[11px] font-black uppercase tracking-wider text-neutral-500">
                  Alokasi Pembayaran ({equalCount} Bagian):
                </p>
                <div className="divide-y divide-neutral-200/60 font-medium">
                  {equalShares.map(sh => (
                    <div key={sh.payer} className="py-2 flex items-center justify-between">
                      <span className="font-bold text-neutral-800">Pembayar #{sh.payer}</span>
                      <span className="font-black text-amber-800">{formatCurrency(sh.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-neutral-200 flex justify-between font-black text-neutral-900">
                  <span>Total Tagihan Meja:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all"
          >
            {splitType === 'by_item' ? `Proses Split Bill (${formatCurrency(splitTotal)})` : 'Konfirmasi Bagi Rata'}
          </button>
        </div>
      </div>
    </div>
  );
};
