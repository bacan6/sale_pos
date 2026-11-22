import type { TenantInfo, UserInfo, SubscriptionInvoice } from '../types/auth';

const API_BASE = 'http://localhost/sale_pos/api';

export const getStoredToken = (): string | null => {
  return localStorage.getItem('pos_bearer_token');
};

export const setStoredToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('pos_bearer_token', token);
  } else {
    localStorage.removeItem('pos_bearer_token');
  }
};

export const getStoredTenant = (): TenantInfo | null => {
  const raw = localStorage.getItem('pos_tenant_info');
  return raw ? JSON.parse(raw) : null;
};

export const setStoredTenant = (tenant: TenantInfo | null) => {
  if (tenant) {
    localStorage.setItem('pos_tenant_info', JSON.stringify(tenant));
  } else {
    localStorage.removeItem('pos_tenant_info');
  }
};

export const getStoredUser = (): UserInfo | null => {
  const raw = localStorage.getItem('pos_user_info');
  return raw ? JSON.parse(raw) : null;
};

export const setStoredUser = (user: UserInfo | null) => {
  if (user) {
    localStorage.setItem('pos_user_info', JSON.stringify(user));
  } else {
    localStorage.removeItem('pos_user_info');
  }
};

async function fetchApi(path: string, options: RequestInit = {}) {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request gagal (${res.status})`);
  }
  return data;
}

export const authApi = {
  async login(account: string, pass: string) {
    const res = await fetchApi('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: account, password: pass }),
    });
    setStoredToken(res.data.token);
    setStoredUser(res.data.user);
    setStoredTenant(res.data.tenant);
    return res.data;
  },

  async signup(data: { name: string; slug: string; email: string; username: string; password: string }) {
    const res = await fetchApi('/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setStoredToken(res.data.token);
    setStoredUser(res.data.user);
    setStoredTenant(res.data.tenant);
    return res.data;
  },

  async logout() {
    try {
      await fetchApi('/v1/auth/logout', { method: 'POST' });
    } catch {}
    setStoredToken(null);
    setStoredUser(null);
    setStoredTenant(null);
  },

  async me() {
    const res = await fetchApi('/v1/auth/me');
    setStoredUser(res.data.user);
    setStoredTenant(res.data.tenant);
    return res.data;
  },
};

export const billingApi = {
  async simulateActivation(amount = 250000, payment_method = 'simulation_qris') {
    return fetchApi('/v1/billing/simulate-activation', {
      method: 'POST',
      body: JSON.stringify({ amount, payment_method }),
    });
  },

  async simulateRecurring(amount = 150000, duration_days = 30) {
    return fetchApi('/v1/billing/simulate-recurring', {
      method: 'POST',
      body: JSON.stringify({ amount, duration_days }),
    });
  },

  async simulateStatus(status: 'waiting_activation' | 'active' | 'on_hold' | 'terminated') {
    return fetchApi('/v1/billing/simulate-status', {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },

  async getInvoices(): Promise<{ data: SubscriptionInvoice[] }> {
    return fetchApi('/v1/billing/invoices');
  },
};
