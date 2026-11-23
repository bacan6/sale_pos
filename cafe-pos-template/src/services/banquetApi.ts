import type { BanquetRoom, BanquetPackage, BanquetBooking } from '../types/banquet';

const API_BASE = '/sale_pos/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('token') || '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export const banquetApi = {
  // Rooms
  async getRooms(): Promise<BanquetRoom[]> {
    const res = await fetch(`${API_BASE}/v1/banquet/rooms`, { headers: getAuthHeader() });
    const json = await res.json();
    return json.data || [];
  },

  async createRoom(data: Partial<BanquetRoom>): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/banquet/rooms`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateRoom(id: number, data: Partial<BanquetRoom>): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/banquet/rooms/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteRoom(id: number): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/banquet/rooms/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return res.json();
  },

  // Packages
  async getPackages(): Promise<BanquetPackage[]> {
    const res = await fetch(`${API_BASE}/v1/banquet/packages`, { headers: getAuthHeader() });
    const json = await res.json();
    return json.data || [];
  },

  async createPackage(data: Partial<BanquetPackage>): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/banquet/packages`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updatePackage(id: number, data: Partial<BanquetPackage>): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/banquet/packages/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deletePackage(id: number): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/banquet/packages/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return res.json();
  },

  // Bookings & Conflict
  async getBookings(params?: { room_id?: number; status?: string; date?: string }): Promise<BanquetBooking[]> {
    const query = new URLSearchParams();
    if (params?.room_id) query.append('room_id', String(params.room_id));
    if (params?.status) query.append('status', params.status);
    if (params?.date) query.append('date', params.date);

    const res = await fetch(`${API_BASE}/v1/banquet/bookings?${query.toString()}`, { headers: getAuthHeader() });
    const json = await res.json();
    return json.data || [];
  },

  async getBooking(id: number): Promise<BanquetBooking> {
    const res = await fetch(`${API_BASE}/v1/banquet/bookings/${id}`, { headers: getAuthHeader() });
    const json = await res.json();
    return json.data;
  },

  async checkConflict(roomId: number, startTime: string, endTime: string, excludeBookingId?: number): Promise<{ conflict: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/v1/banquet/check-conflict`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({
        banquet_room_id: roomId,
        start_time: startTime,
        end_time: endTime,
        exclude_booking_id: excludeBookingId
      }),
    });
    const json = await res.json();
    return json.data || { conflict: false, message: '' };
  },

  async createBooking(data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/banquet/bookings`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateBookingStatus(id: number, status: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/banquet/bookings/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  async recordPayment(id: number, data: { amount: number; payment_method: string; hotel_booking_id?: number }): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/banquet/bookings/${id}/payments`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getTimeline(date?: string): Promise<{ date: string; rooms: BanquetRoom[]; bookings: BanquetBooking[] }> {
    const res = await fetch(`${API_BASE}/v1/banquet/timeline${date ? `?date=${date}` : ''}`, { headers: getAuthHeader() });
    const json = await res.json();
    return json.data || { date: '', rooms: [], bookings: [] };
  }
};
