import type { TenantInfo, UserInfo } from '../types/auth';
import type {
  AccountingAccount,
  JournalEntry,
  AccountLedgerResponse,
  TrialBalanceResponse,
  IncomeStatementResponse,
  BalanceSheetResponse,
  CashFlowResponse,
  AccountingPeriod,
  AccountingSettings,
} from '../types/accounting';

const API_BASE = 'http://localhost/sale_pos/api';

export const getStoredToken = (): string | null => {
  return localStorage.getItem('backoffice_bearer_token') || localStorage.getItem('pos_bearer_token');
};

export const setStoredToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('backoffice_bearer_token', token);
    localStorage.setItem('pos_bearer_token', token);
  } else {
    localStorage.removeItem('backoffice_bearer_token');
    localStorage.removeItem('pos_bearer_token');
  }
};

export const getStoredTenant = (): TenantInfo | null => {
  const raw = localStorage.getItem('backoffice_tenant_info') || localStorage.getItem('pos_tenant_info');
  return raw ? JSON.parse(raw) : null;
};

export const setStoredTenant = (tenant: TenantInfo | null) => {
  if (tenant) {
    localStorage.setItem('backoffice_tenant_info', JSON.stringify(tenant));
  } else {
    localStorage.removeItem('backoffice_tenant_info');
  }
};

export const getStoredUser = (): UserInfo | null => {
  const raw = localStorage.getItem('backoffice_user_info') || localStorage.getItem('pos_user_info');
  return raw ? JSON.parse(raw) : null;
};

export const setStoredUser = (user: UserInfo | null) => {
  if (user) {
    localStorage.setItem('backoffice_user_info', JSON.stringify(user));
  } else {
    localStorage.removeItem('backoffice_user_info');
  }
};

export async function fetchApi(path: string, options: RequestInit = {}) {
  const token = getStoredToken();
  const tenant = getStoredTenant();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (tenant?.slug) {
    headers['X-Tenant-Slug'] = tenant.slug;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `HTTP ${res.status}: Terjadi kesalahan`);
  }
  return data.data;
}

export const authApi = {
  login: async (credentials: { username: string; password?: string; tenant_slug: string }) => {
    const data = await fetchApi('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    setStoredToken(data.token);
    setStoredTenant(data.tenant);
    setStoredUser(data.user);
    return data;
  },
  me: async () => {
    return fetchApi('/v1/auth/me');
  },
  logout: () => {
    setStoredToken(null);
    setStoredTenant(null);
    setStoredUser(null);
  },
};

export const accountingApi = {
  // Chart of Accounts
  getAccounts: async (params?: { type?: string; search?: string }): Promise<AccountingAccount[]> => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return fetchApi(`/v1/accounting/coa${query ? `?${query}` : ''}`);
  },
  createAccount: async (body: Partial<AccountingAccount>) => {
    return fetchApi('/v1/accounting/coa', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  updateAccount: async (id: number, body: Partial<AccountingAccount>) => {
    return fetchApi(`/v1/accounting/coa/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },
  deleteAccount: async (id: number) => {
    return fetchApi(`/v1/accounting/coa/${id}`, {
      method: 'DELETE',
    });
  },

  // Journal Entries
  getJournals: async (params?: { start_date?: string; end_date?: string; reference_type?: string; status?: string; limit?: number }): Promise<JournalEntry[]> => {
    const query = new URLSearchParams(params as unknown as Record<string, string>).toString();
    return fetchApi(`/v1/accounting/journals${query ? `?${query}` : ''}`);
  },
  getJournalDetail: async (id: number): Promise<JournalEntry> => {
    return fetchApi(`/v1/accounting/journals/${id}`);
  },
  createJournal: async (body: { entry_date: string; notes: string; items: { account_id: number; debit: number; credit: number; memo?: string }[] }) => {
    return fetchApi('/v1/accounting/journals', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  voidJournal: async (id: number) => {
    return fetchApi(`/v1/accounting/journals/${id}/void`, {
      method: 'POST',
    });
  },

  // General Ledger & Trial Balance
  getGeneralLedger: async (params: { account_id?: number; start_date?: string; end_date?: string }): Promise<AccountLedgerResponse> => {
    const query = new URLSearchParams(params as unknown as Record<string, string>).toString();
    return fetchApi(`/v1/accounting/ledger${query ? `?${query}` : ''}`);
  },
  getTrialBalance: async (asOfDate?: string): Promise<TrialBalanceResponse> => {
    const query = asOfDate ? `?as_of_date=${asOfDate}` : '';
    return fetchApi(`/v1/accounting/trial-balance${query}`);
  },

  // Financial Reports
  getIncomeStatement: async (startDate?: string, endDate?: string): Promise<IncomeStatementResponse> => {
    const query = new URLSearchParams({ start_date: startDate || '', end_date: endDate || '' }).toString();
    return fetchApi(`/v1/accounting/reports/income-statement?${query}`);
  },
  getBalanceSheet: async (asOfDate?: string): Promise<BalanceSheetResponse> => {
    const query = asOfDate ? `?as_of_date=${asOfDate}` : '';
    return fetchApi(`/v1/accounting/reports/balance-sheet${query}`);
  },
  getCashFlow: async (startDate?: string, endDate?: string): Promise<CashFlowResponse> => {
    const query = new URLSearchParams({ start_date: startDate || '', end_date: endDate || '' }).toString();
    return fetchApi(`/v1/accounting/reports/cash-flow?${query}`);
  },

  // Settings
  getSettings: async (): Promise<AccountingSettings> => {
    return fetchApi('/v1/accounting/settings');
  },
  updateSettings: async (body: Partial<AccountingSettings>) => {
    return fetchApi('/v1/accounting/settings', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  // Periods & Closing
  getPeriods: async (): Promise<AccountingPeriod[]> => {
    return fetchApi('/v1/accounting/periods');
  },
  createPeriod: async (body: { period_name: string; start_date: string; end_date: string }) => {
    return fetchApi('/v1/accounting/periods', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  closePeriod: async (id: number) => {
    return fetchApi(`/v1/accounting/periods/${id}/close`, {
      method: 'POST',
    });
  },
};
