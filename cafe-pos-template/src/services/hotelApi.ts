import type {
  RoomType,
  HotelRoom,
  HotelBooking,
  HotelFolio,
  HousekeepingTask,
  NightAuditMetrics,
  NightAuditRecord,
  RoomStatus,
} from '../types/hotel';
import { fetchApi } from './api';

export const hotelApi = {
  // Room Types
  async getRoomTypes(): Promise<RoomType[]> {
    const res = await fetchApi('/v1/hotel/room-types');
    return res.data || [];
  },

  async createRoomType(data: Partial<RoomType>): Promise<{ id: number }> {
    const res = await fetchApi('/v1/hotel/room-types', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async updateRoomType(id: number, data: Partial<RoomType>): Promise<void> {
    await fetchApi(`/v1/hotel/room-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteRoomType(id: number): Promise<void> {
    await fetchApi(`/v1/hotel/room-types/${id}`, { method: 'DELETE' });
  },

  // Rooms
  async getRooms(): Promise<HotelRoom[]> {
    const res = await fetchApi('/v1/hotel/rooms');
    return res.data || [];
  },

  async getRoom(id: number): Promise<HotelRoom> {
    const res = await fetchApi(`/v1/hotel/rooms/${id}`);
    return res.data;
  },

  async createRoom(data: { room_number: string; floor: number; room_type_id: number; status?: RoomStatus }): Promise<{ id: number }> {
    const res = await fetchApi('/v1/hotel/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async updateRoom(id: number, data: { room_number: string; floor: number; room_type_id: number }): Promise<void> {
    await fetchApi(`/v1/hotel/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async updateRoomStatus(id: number, status: RoomStatus): Promise<void> {
    await fetchApi(`/v1/hotel/rooms/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  async deleteRoom(id: number): Promise<void> {
    await fetchApi(`/v1/hotel/rooms/${id}`, { method: 'DELETE' });
  },

  // Bookings & Front Desk
  async getBookings(): Promise<HotelBooking[]> {
    const res = await fetchApi('/v1/hotel/bookings');
    return res.data || [];
  },

  async getBooking(id: number): Promise<HotelBooking> {
    const res = await fetchApi(`/v1/hotel/bookings/${id}`);
    return res.data;
  },

  async createBooking(data: {
    room_id: number;
    guest_name: string;
    id_card_type?: string;
    id_card_number: string;
    phone?: string;
    email?: string;
    source?: string;
    ota_reference_code?: string;
    check_in_date: string;
    check_out_date: string;
    deposit_amount?: number;
    notes?: string;
    auto_check_in?: boolean;
  }): Promise<{ booking_id: number; folio_id: number }> {
    const res = await fetchApi('/v1/hotel/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async checkIn(bookingId: number): Promise<void> {
    await fetchApi(`/v1/hotel/bookings/${bookingId}/check-in`, { method: 'POST' });
  },

  async checkOut(bookingId: number): Promise<void> {
    await fetchApi(`/v1/hotel/bookings/${bookingId}/check-out`, { method: 'POST' });
  },

  async cancelBooking(bookingId: number): Promise<void> {
    await fetchApi(`/v1/hotel/bookings/${bookingId}/cancel`, { method: 'POST' });
  },

  // Folio & Billing
  async getFolio(idOrBookingId: number): Promise<HotelFolio> {
    const res = await fetchApi(`/v1/hotel/folios/${idOrBookingId}`);
    return res.data;
  },

  async addFolioItem(folioId: number, data: {
    category: string;
    description: string;
    amount: number;
    quantity?: number;
  }): Promise<void> {
    await fetchApi(`/v1/hotel/folios/${folioId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async settleFolio(folioId: number, data: {
    amount: number;
    method: string;
    notes?: string;
  }): Promise<void> {
    await fetchApi(`/v1/hotel/folios/${folioId}/settle`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Housekeeping
  async getHousekeeping(): Promise<{
    rooms: HotelRoom[];
    tasks: HousekeepingTask[];
    staff: Array<{ id: number; full_name: string; username: string; role: string }>;
  }> {
    const res = await fetchApi('/v1/hotel/housekeeping');
    return res.data || { rooms: [], tasks: [], staff: [] };
  },

  async createHousekeepingTask(data: {
    room_id: number;
    assigned_user_id?: number | null;
    task_type: string;
    priority: string;
    notes?: string;
  }): Promise<{ id: number }> {
    const res = await fetchApi('/v1/hotel/housekeeping/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async updateTaskStatus(taskId: number, status: string): Promise<void> {
    await fetchApi(`/v1/hotel/housekeeping/tasks/${taskId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  async quickCleanRoom(roomId: number): Promise<{ status: string }> {
    const res = await fetchApi(`/v1/hotel/housekeeping/rooms/${roomId}/quick-clean`, {
      method: 'POST',
    });
    return res.data;
  },

  // Night Audit
  async getNightAudit(): Promise<{
    metrics: NightAuditMetrics;
    recent_audits: NightAuditRecord[];
  }> {
    const res = await fetchApi('/v1/hotel/night-audit');
    return res.data;
  },

  async runNightAudit(auditDate?: string): Promise<{
    audit_id: number;
    occupancy_rate: number;
    adr: number;
    revpar: number;
    total_revenue: number;
  }> {
    const res = await fetchApi('/v1/hotel/night-audit/run', {
      method: 'POST',
      body: JSON.stringify({ audit_date: auditDate || new Date().toISOString().split('T')[0] }),
    });
    return res.data;
  },
};
