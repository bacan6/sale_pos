import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Calendar,
  Filter,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  FileText,
  X,
} from 'lucide-react';
import { accountingApi } from '../services/api';
import type { JournalEntry, AccountingAccount, JournalItem } from '../types/accounting';

export const JournalEntryView: React.FC = () => {
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<AccountingAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [refType, setRefType] = useState('all');

  // Modal Create
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<JournalItem[]>([
    { account_id: 0, debit: 0, credit: 0, memo: '' },
    { account_id: 0, debit: 0, credit: 0, memo: '' },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal Detail View
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jList, accList] = await Promise.all([
        accountingApi.getJournals({
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          reference_type: refType !== 'all' ? refType : undefined,
        }),
        accountingApi.getAccounts(),
      ]);
      setJournals(jList);
      setAccounts(accList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate, refType]);

  const handleOpenCreate = () => {
    setEntryDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setItems([
      { account_id: accounts[0]?.id || 0, debit: 0, credit: 0, memo: '' },
      { account_id: accounts[1]?.id || 0, debit: 0, credit: 0, memo: '' },
    ]);
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleAddItemRow = () => {
    setItems([...items, { account_id: accounts[0]?.id || 0, debit: 0, credit: 0, memo: '' }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (items.length <= 2) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: keyof JournalItem, val: any) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: val };

    // Prevent both debit and credit having value simultaneously
    if (field === 'debit' && Number(val) > 0) {
      updated[idx].credit = 0;
    } else if (field === 'credit' && Number(val) > 0) {
      updated[idx].debit = 0;
    }
    setItems(updated);
  };

  const totalDebit = items.reduce((sum, it) => sum + (Number(it.debit) || 0), 0);
  const totalCredit = items.reduce((sum, it) => sum + (Number(it.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleSaveJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isBalanced) {
      setFormError('Total Debit dan Kredit harus seimbang dan lebih dari Rp 0');
      return;
    }

    setSaving(true);
    try {
      await accountingApi.createJournal({
        entry_date: entryDate,
        notes,
        items: items.map((it) => ({
          account_id: Number(it.account_id),
          debit: Number(it.debit) || 0,
          credit: Number(it.credit) || 0,
          memo: it.memo,
        })),
      });
      setIsCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan jurnal');
    } finally {
      setSaving(false);
    }
  };

  const handleViewDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const detail = await accountingApi.getJournalDetail(id);
      setSelectedJournal(detail);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleVoidJournal = async (id: number) => {
    if (!confirm('Yakin ingin membatalkan (void) jurnal transaksi ini?')) return;
    try {
      await accountingApi.voidJournal(id);
      loadData();
      if (selectedJournal && selectedJournal.id === id) {
        setSelectedJournal(null);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal membatalkan jurnal');
    }
  };

  const formatRupiah = (val?: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none"
              title="Tanggal Mulai"
            />
            <span className="text-neutral-600">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none"
              title="Tanggal Akhir"
            />
          </div>

          <select
            value={refType}
            onChange={(e) => setRefType(e.target.value)}
            className="px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-300 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">Semua Jenis Jurnal</option>
            <option value="manual">Manual Journal Voucher</option>
            <option value="pos_shift_close">Auto: Tutup Shift POS</option>
            <option value="hotel_night_audit">Auto: Night Audit Hotel</option>
            <option value="period_closing">Tutup Buku Periode</option>
          </select>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Jurnal Manual</span>
        </button>
      </div>

      {/* Journal Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-neutral-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mx-auto mb-2" />
            <span className="text-xs">Memuat Jurnal Transaksi...</span>
          </div>
        ) : journals.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 text-xs">
            Tidak ada jurnal yang sesuai filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-neutral-900/80 border-b border-neutral-800 text-neutral-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">No. Jurnal</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Sumber / Tipe</th>
                  <th className="py-3 px-4">Keterangan</th>
                  <th className="py-3 px-4 text-center">Baris Akun</th>
                  <th className="py-3 px-4 text-right">Total Debit/Kredit</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {journals.map((j) => (
                  <tr key={j.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      {j.entry_number}
                    </td>
                    <td className="py-3 px-4 text-neutral-300">{j.entry_date}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        j.reference_type === 'pos_shift_close' ? 'bg-amber-500/20 text-amber-300' :
                        j.reference_type === 'hotel_night_audit' ? 'bg-indigo-500/20 text-indigo-300' :
                        'bg-neutral-800 text-neutral-300'
                      }`}>
                        {j.reference_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-300 max-w-sm truncate">{j.notes}</td>
                    <td className="py-3 px-4 text-center font-mono text-neutral-400">
                      {j.items_count || '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      {formatRupiah(j.total_amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        j.status === 'posted' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {j.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleViewDetail(j.id)}
                        className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-all"
                        title="Lihat Rincian Debit/Kredit"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {j.status === 'posted' && (
                        <button
                          onClick={() => handleVoidJournal(j.id)}
                          className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded-lg transition-all"
                          title="Void / Batalkan Jurnal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Create Journal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">Buat Jurnal Umum Baru</h3>
                <p className="text-xs text-neutral-400">Pastikan total debit dan kredit seimbang (Double-Entry)</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveJournal} className="flex-1 flex flex-col min-h-0 mt-4">
              <div className="grid grid-cols-2 gap-4 mb-4 shrink-0">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1">Tanggal Transaksi</label>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1">Keterangan / Memo</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    required
                    placeholder="Contoh: Pembayaran Listrik & Air Operasional"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Rows */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-neutral-400 uppercase px-1">
                  <div className="col-span-4">Akun (COA)</div>
                  <div className="col-span-3">Debit (Rp)</div>
                  <div className="col-span-3">Kredit (Rp)</div>
                  <div className="col-span-2 text-right">Aksi</div>
                </div>

                {items.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-neutral-800/40 p-2 rounded-xl">
                    <div className="col-span-4">
                      <select
                        value={row.account_id}
                        onChange={(e) => handleItemChange(idx, 'account_id', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            [{a.code}] {a.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-3">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.debit || ''}
                        onChange={(e) => handleItemChange(idx, 'debit', e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-right font-mono text-white text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="col-span-3">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.credit || ''}
                        onChange={(e) => handleItemChange(idx, 'credit', e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-right font-mono text-white text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="col-span-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        disabled={items.length <= 2}
                        className="p-1 text-neutral-500 hover:text-rose-400 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="w-full py-2 border border-dashed border-neutral-700 hover:border-emerald-500/50 rounded-xl text-neutral-400 hover:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Baris Akun</span>
                </button>
              </div>

              {/* Bottom Summary */}
              <div className="pt-4 border-t border-neutral-800 mt-4 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-6 text-xs font-mono">
                  <div>
                    <span className="text-neutral-500 block text-[10px]">TOTAL DEBIT</span>
                    <span className="font-bold text-white">{formatRupiah(totalDebit)}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px]">TOTAL KREDIT</span>
                    <span className="font-bold text-white">{formatRupiah(totalCredit)}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px]">STATUS</span>
                    {isBalanced ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Seimbang
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Selisih {formatRupiah(Math.abs(totalDebit - totalCredit))}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-xl text-xs font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={!isBalanced || saving}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Posting Jurnal</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail View */}
      {selectedJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase block">
                  VOUCHER JURNAL UMUM
                </span>
                <h3 className="text-lg font-black text-white">{selectedJournal.entry_number}</h3>
              </div>
              <button
                onClick={() => setSelectedJournal(null)}
                className="p-1 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 py-3 text-xs text-neutral-400 border-b border-neutral-800">
              <div>Tanggal: <strong className="text-white">{selectedJournal.entry_date}</strong></div>
              <div>Sumber: <strong className="text-white capitalize">{selectedJournal.reference_type.replace('_', ' ')}</strong></div>
              <div className="col-span-2">Keterangan: <strong className="text-white">{selectedJournal.notes}</strong></div>
            </div>

            <div className="my-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 font-bold uppercase text-[10px]">
                    <th className="py-2">Kode & Akun</th>
                    <th className="py-2 text-right">Debit</th>
                    <th className="py-2 text-right">Kredit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/40 font-mono">
                  {selectedJournal.items?.map((it, i) => (
                    <tr key={i}>
                      <td className="py-2.5 text-neutral-200">
                        <span className="text-emerald-400 font-bold mr-2">[{it.account_code}]</span>
                        <span>{it.account_name}</span>
                        {it.memo && <span className="block text-[10px] text-neutral-500 font-sans">{it.memo}</span>}
                      </td>
                      <td className="py-2.5 text-right font-bold text-white">
                        {it.debit > 0 ? formatRupiah(it.debit) : '-'}
                      </td>
                      <td className="py-2.5 text-right font-bold text-white">
                        {it.credit > 0 ? formatRupiah(it.credit) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-neutral-700 font-bold text-white font-mono">
                    <td className="py-2.5">Total</td>
                    <td className="py-2.5 text-right text-emerald-400">{formatRupiah(selectedJournal.total_amount)}</td>
                    <td className="py-2.5 text-right text-emerald-400">{formatRupiah(selectedJournal.total_amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedJournal(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold"
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
