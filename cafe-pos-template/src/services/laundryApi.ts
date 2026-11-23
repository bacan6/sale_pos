import type {
  LaundryService,
  LaundryPerfume,
  LaundryRack,
  LaundryOrder,
  CreateLaundryOrderPayload,
} from '../types/laundry';
import { fetchApi } from './api';

export const laundryApi = {
  // Master Services
  async getServices(params?: { type?: string; active_only?: number }): Promise<LaundryService[]> {
    const query = new URLSearchParams();
    if (params?.type) query.append('type', params.type);
    if (params?.active_only !== undefined) query.append('active_only', String(params.active_only));
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetchApi(`/v1/laundry/services${qs}`);
    return res.data || [];
  },

  async getService(id: number): Promise<LaundryService> {
    const res = await fetchApi(`/v1/laundry/services/${id}`);
    return res.data;
  },

  async createService(data: Partial<LaundryService>): Promise<{ id: number }> {
    const res = await fetchApi('/v1/laundry/services', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async updateService(id: number, data: Partial<LaundryService>): Promise<void> {
    await fetchApi(`/v1/laundry/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteService(id: number): Promise<void> {
    await fetchApi(`/v1/laundry/services/${id}`, { method: 'DELETE' });
  },

  // Master Perfumes
  async getPerfumes(): Promise<LaundryPerfume[]> {
    const res = await fetchApi('/v1/laundry/perfumes');
    return res.data || [];
  },

  async createPerfume(data: Partial<LaundryPerfume>): Promise<{ id: number }> {
    const res = await fetchApi('/v1/laundry/perfumes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async updatePerfume(id: number, data: Partial<LaundryPerfume>): Promise<void> {
    await fetchApi(`/v1/laundry/perfumes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deletePerfume(id: number): Promise<void> {
    await fetchApi(`/v1/laundry/perfumes/${id}`, { method: 'DELETE' });
  },

  // Master Racks
  async getRacks(): Promise<LaundryRack[]> {
    const res = await fetchApi('/v1/laundry/racks');
    return res.data || [];
  },

  async createRack(data: Partial<LaundryRack>): Promise<{ id: number }> {
    const res = await fetchApi('/v1/laundry/racks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async updateRack(id: number, data: Partial<LaundryRack>): Promise<void> {
    await fetchApi(`/v1/laundry/racks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteRack(id: number): Promise<void> {
    await fetchApi(`/v1/laundry/racks/${id}`, { method: 'DELETE' });
  },

  // Laundry Orders
  async getOrders(params?: {
    status?: string;
    search?: string;
    rack_id?: number;
    speed?: string;
    limit?: number;
  }): Promise<LaundryOrder[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    if (params?.rack_id) query.append('rack_id', String(params.rack_id));
    if (params?.speed) query.append('speed', params.speed);
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetchApi(`/v1/laundry/orders${qs}`);
    return res.data || [];
  },

  async getOrder(id: number): Promise<LaundryOrder> {
    const res = await fetchApi(`/v1/laundry/orders/${id}`);
    return res.data;
  },

  async createOrder(data: CreateLaundryOrderPayload): Promise<{
    id: number;
    order_number: string;
    tracking_code: string;
    total_amount: number;
    estimated_completion_at: string;
  }> {
    const res = await fetchApi('/v1/laundry/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async updateOrderStatus(id: number, status: string, notes?: string): Promise<void> {
    await fetchApi(`/v1/laundry/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  async assignRack(id: number, rack_id: number | null): Promise<void> {
    await fetchApi(`/v1/laundry/orders/${id}/rack`, {
      method: 'PUT',
      body: JSON.stringify({ rack_id }),
    });
  },

  // Payments
  async processPayment(payload: {
    order_id: number;
    amount: number;
    payment_method: string;
    reference_number?: string;
  }): Promise<any> {
    const res = await fetchApi('/v1/laundry/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  // Public Order Tracking
  async trackOrder(code: string): Promise<any> {
    const res = await fetchApi(`/v1/laundry/track/${encodeURIComponent(code)}`);
    return res.data;
  },
};
