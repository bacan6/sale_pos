import React, { useEffect, useState } from 'react';
import {
  FolderTree,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { accountingApi } from '../services/api';
import type { AccountingAccount, AccountType, NormalBalance } from '../types/accounting';

export const CoaManagementView: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountingAccount | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<AccountType>('asset');
  const [formBalance, setFormBalance] = useState<NormalBalance>('debit');
  const [formParentId, setFormParentId] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await accountingApi.getAccounts({
        type: selectedType !== 'all' ? selectedType : undefined,
        search: search || undefined,
      });
      setAccounts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [selectedType]);

  const handleOpenCreate = () => {
    setEditingAccount(null);
    setFormCode('');
    setFormName('');
    setFormType('asset');
    setFormBalance('debit');
    setFormParentId('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (acc: AccountingAccount) => {
    setEditingAccount(acc);
    setFormCode(acc.code);
    setFormName(acc.name);
    setFormType(acc.type);
    setFormBalance(acc.normal_balance);
    setFormParentId(acc.parent_id ? String(acc.parent_id) : '');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSaving(true);

    try {
      if (editingAccount) {
        await accountingApi.updateAccount(editingAccount.id, {
          name: formName,
          type: formType,
          normal_balance: formBalance,
          parent_id: formParentId ? Number(formParentId) : null,
        });
      } else {
        await accountingApi.createAccount({
          code: formCode,
          name: formName,
          type: formType,
          normal_balance: formBalance,
          parent_id: formParentId ? Number(formParentId) : null,
        });
      }
      setIsModalOpen(false);
      loadAccounts();
    } catch (err: any) {
      setModalError(err.message || 'Gagal menyimpan akun');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (acc: AccountingAccount) => {
    if (!confirm(`Hapus atau nonaktifkan akun [${acc.code}] ${acc.name}?`)) return;
    try {
      await accountingApi.deleteAccount(acc.id);
      loadAccounts();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus akun');
    }
  };

  const formatRupiah = (val?: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const filtered = accounts.filter(
    (a) =>
      a.code.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode atau nama akun..."
              className="w-full pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="pl-3 pr-8 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-300 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">Semua Tipe Akun</option>
              <option value="asset">Aset (1xxx)</option>
              <option value="liability">Kewajiban (2xxx)</option>
              <option value="equity">Ekuitas (3xxx)</option>
              <option value="revenue">Pendapatan (4xxx/7xxx)</option>
              <option value="cogs">HPP / COGS (5xxx)</option>
              <option value="expense">Beban Operasional (6xxx)</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Akun Baru</span>
        </button>
      </div>

      {/* Account Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-neutral-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mx-auto mb-2" />
            <span className="text-xs">Memuat Bagan Akun...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 text-xs">
            Tidak ada akun yang sesuai kriteria pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-neutral-900/80 border-b border-neutral-800 text-neutral-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Kode</th>
                  <th className="py-3 px-4">Nama Akun</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 text-center">Saldo Normal</th>
                  <th className="py-3 px-4 text-right">Saldo Saat Ini</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filtered.map((acc) => (
                  <tr key={acc.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">{acc.code}</td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {acc.name}
                      {acc.is_system === 1 && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-neutral-800 text-neutral-400">
                          Sistem
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        acc.type === 'asset' ? 'bg-cyan-500/20 text-cyan-300' :
                        acc.type === 'liability' ? 'bg-amber-500/20 text-amber-300' :
                        acc.type === 'equity' ? 'bg-purple-500/20 text-purple-300' :
                        acc.type === 'revenue' ? 'bg-emerald-500/20 text-emerald-300' :
                        acc.type === 'cogs' ? 'bg-orange-500/20 text-orange-300' :
                        'bg-rose-500/20 text-rose-300'
                      }`}>
                        {acc.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center uppercase font-mono text-[10px] text-neutral-400">
                      {acc.normal_balance}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-neutral-200">
                      {formatRupiah(acc.current_balance)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {acc.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                          <CheckCircle className="w-3 h-3" /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-neutral-500 font-bold">
                          <XCircle className="w-3 h-3" /> Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(acc)}
                        className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-all"
                        title="Edit Akun"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {acc.is_system !== 1 && (
                        <button
                          onClick={() => handleDelete(acc)}
                          className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded-lg transition-all"
                          title="Hapus / Nonaktifkan"
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

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              {editingAccount ? 'Edit Akun' : 'Tambah Akun Baru'}
            </h3>
            <p className="text-xs text-neutral-400 mb-4">
              Konfigurasikan kode dan klasifikasi bagan akun (COA)
            </p>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1">
                    Kode Akun
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    disabled={!!editingAccount}
                    required
                    placeholder="Contoh: 1115"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1">
                    Klasifikasi Tipe
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => {
                      const t = e.target.value as AccountType;
                      setFormType(t);
                      if (t === 'liability' || t === 'equity' || t === 'revenue') {
                        setFormBalance('credit');
                      } else {
                        setFormBalance('debit');
                      }
                    }}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="asset">Aset (Asset)</option>
                    <option value="liability">Kewajiban (Liability)</option>
                    <option value="equity">Ekuitas (Equity)</option>
                    <option value="revenue">Pendapatan (Revenue)</option>
                    <option value="cogs">HPP (COGS)</option>
                    <option value="expense">Beban (Expense)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">
                  Nama Akun
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  placeholder="Contoh: Kas Operasional Cabang"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1">
                    Saldo Normal
                  </label>
                  <select
                    value={formBalance}
                    onChange={(e) => setFormBalance(e.target.value as NormalBalance)}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="debit">Debit</option>
                    <option value="credit">Kredit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1">
                    Akun Induk (Opsional)
                  </label>
                  <select
                    value={formParentId}
                    onChange={(e) => setFormParentId(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="">-- Tanpa Induk --</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        [{a.code}] {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingAccount ? 'Simpan Perubahan' : 'Buat Akun'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
