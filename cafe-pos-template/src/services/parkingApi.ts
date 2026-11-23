import type { ParkingRate, ParkingGate, ParkingTicket, SmartLock, SmartLockLog } from '../types/parking';

const API_BASE = '/sale_pos/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('token') || '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export const parkingApi = {
  // Rates
  async getRates(): Promise<ParkingRate[]> {
    const res = await fetch(`${API_BASE}/v1/parking/rates`, { headers: getAuthHeader() });
    const json = await res.json();
    return json.data || [];
  },

  async updateRate(id: number, data: Partial<ParkingRate>): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/parking/rates/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Gates
  async getGates(): Promise<ParkingGate[]> {
    const res = await fetch(`${API_BASE}/v1/parking/gates`, { headers: getAuthHeader() });
    const json = await res.json();
    return json.data || [];
  },

  async pulseGate(id: number, action: 'open' | 'close' = 'open'): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/parking/gates/${id}/pulse`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ action }),
    });
    return res.json();
  },

  // Tickets
  async getTickets(params?: { status?: string; plate?: string; date?: string }): Promise<ParkingTicket[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.plate) query.append('plate', params.plate);
    if (params?.date) query.append('date', params.date);

    const res = await fetch(`${API_BASE}/v1/parking/tickets?${query.toString()}`, { headers: getAuthHeader() });
    const json = await res.json();
    return json.data || [];
  },

  async getTicket(idOrBarcode: string | number): Promise<ParkingTicket> {
    const res = await fetch(`${API_BASE}/v1/parking/tickets/${idOrBarcode}`, { headers: getAuthHeader() });
    const json = await res.json();
    return json.data;
  },

  async checkIn(plateNumber: string, vehicleType: string = 'car', entryGateId: number = 1): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/parking/tickets/check-in`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({
        plate_number: plateNumber,
        vehicle_type: vehicleType,
        entry_gate_id: entryGateId
      }),
    });
    return res.json();
  },

  async checkOut(ticketId: number, data: { payment_method: string; exit_gate_id?: number; hotel_booking_id?: number; banquet_booking_id?: number }): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/parking/tickets/${ticketId}/check-out`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Smart Locks
  async getSmartLocks(lockType?: string): Promise<SmartLock[]> {
    const res = await fetch(`${API_BASE}/v1/parking/smart-locks${lockType ? `?lock_type=${lockType}` : ''}`, { headers: getAuthHeader() });
    const json = await res.json();
    return json.data || [];
  },

  async remoteUnlock(lockId: number, durationSeconds: number = 5): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/parking/smart-locks/${lockId}/unlock`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ duration_seconds: durationSeconds }),
    });
    return res.json();
  },

  async generatePasscode(lockId: number, validHours: number = 24, passcode?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/v1/parking/smart-locks/${lockId}/generate-passcode`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ valid_hours: validHours, passcode }),
    });
    return res.json();
  },

  async getAccessLogs(lockId?: number): Promise<SmartLockLog[]> {
    const res = await fetch(`${API_BASE}/v1/parking/smart-locks/logs${lockId ? `?smart_lock_id=${lockId}` : ''}`, { headers: getAuthHeader() });
    const json = await res.json();
    return json.data || [];
  }
};
