import type {
  RoomType,
  HotelRoom,
  HotelBooking,
  HotelFolio,
  HousekeepingTask,
  NightAuditMetrics,
  NightAuditRecord,
  RoomStatus,
  HotelService,
  HotelGuest,
  LostAndFoundItem,
  HotelShiftHandover,
  ShiftSummary,
  TimelineCalendarData,
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
    override_blacklist?: boolean;
  }): Promise<{ booking_id: number; folio_id: number; booking_number: string }> {
    const res = await fetchApi('/v1/hotel/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async checkIn(id: number): Promise<void> {
    await fetchApi(`/v1/hotel/bookings/${id}/check-in`, { method: 'POST' });
  },

  async checkOut(id: number): Promise<void> {
    await fetchApi(`/v1/hotel/bookings/${id}/check-out`, { method: 'POST' });
  },

  async cancelBooking(id: number): Promise<void> {
    await fetchApi(`/v1/hotel/bookings/${id}/cancel`, { method: 'POST' });
  },

  async transferRoom(id: number, data: { target_room_id: number; reason?: string; apply_new_rate?: boolean }): Promise<void> {
    await fetchApi(`/v1/hotel/bookings/${id}/transfer-room`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async extendStay(id: number, extraNights: number): Promise<void> {
    await fetchApi(`/v1/hotel/bookings/${id}/extend-stay`, {
      method: 'POST',
      body: JSON.stringify({ extra_nights: extraNights }),
    });
  },

  async addEarlyLateCharge(id: number, data: { type: 'late_checkout' | 'early_checkin'; amount: number; notes?: string }): Promise<void> {
    await fetchApi(`/v1/hotel/bookings/${id}/early-late-charge`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Folio & Cashier
  async getFolio(id: number): Promise<HotelFolio> {
    const res = await fetchApi(`/v1/hotel/folios/${id}`);
    return res.data;
  },

  async addFolioItem(folioId: number, data: { category: string; description: string; amount: number; quantity?: number }): Promise<void> {
    await fetchApi(`/v1/hotel/folios/${folioId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async addServiceToFolio(folioId: number, data: { service_id: number; quantity?: number; notes?: string }): Promise<void> {
    await fetchApi(`/v1/hotel/folios/${folioId}/add-service`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async refundDeposit(folioId: number, data: { amount?: number; notes?: string }): Promise<void> {
    await fetchApi(`/v1/hotel/folios/${folioId}/refund-deposit`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async settleFolio(folioId: number, data: { amount: number; method: string; notes?: string }): Promise<void> {
    await fetchApi(`/v1/hotel/folios/${folioId}/settle`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Hotel Services Catalog
  async getServices(): Promise<HotelService[]> {
    const res = await fetchApi('/v1/hotel/services');
    return res.data || [];
  },

  async createService(data: Partial<HotelService>): Promise<{ id: number }> {
    const res = await fetchApi('/v1/hotel/services', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async updateService(id: number, data: Partial<HotelService>): Promise<void> {
    await fetchApi(`/v1/hotel/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteService(id: number): Promise<void> {
    await fetchApi(`/v1/hotel/services/${id}`, { method: 'DELETE' });
  },

  // Guest CRM
  async getGuests(params?: { search?: string; vip_tier?: string; is_blacklisted?: number }): Promise<HotelGuest[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.vip_tier) query.append('vip_tier', params.vip_tier);
    if (params?.is_blacklisted !== undefined) query.append('is_blacklisted', String(params.is_blacklisted));

    const qs = query.toString();
    const res = await fetchApi(`/v1/hotel/guests${qs ? '?' + qs : ''}`);
    return res.data || [];
  },

  async getGuest(id: number): Promise<HotelGuest> {
    const res = await fetchApi(`/v1/hotel/guests/${id}`);
    return res.data;
  },

  async updateGuest(id: number, data: Partial<HotelGuest>): Promise<void> {
    await fetchApi(`/v1/hotel/guests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Timeline Gantt Calendar
  async getTimelineCalendar(startDate?: string, days = 14): Promise<TimelineCalendarData> {
    const query = new URLSearchParams();
    if (startDate) query.append('start_date', startDate);
    query.append('days', String(days));

    const res = await fetchApi(`/v1/hotel/calendar/timeline?${query.toString()}`);
    return res.data;
  },

  // Lost & Found
  async getLostAndFound(status?: string): Promise<LostAndFoundItem[]> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetchApi(`/v1/hotel/lost-and-found${qs}`);
    return res.data || [];
  },

  async createLostAndFound(data: { room_id: number; item_name: string; description?: string; storage_location?: string; found_date?: string }): Promise<{ id: number }> {
    const res = await fetchApi('/v1/hotel/lost-and-found', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async updateLostAndFoundStatus(id: number, data: { status: 'stored' | 'claimed' | 'disposed'; claimed_by_name?: string }): Promise<void> {
    await fetchApi(`/v1/hotel/lost-and-found/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Shift Handover
  async getShifts(): Promise<HotelShiftHandover[]> {
    const res = await fetchApi('/v1/hotel/shifts');
    return res.data || [];
  },

  async getShiftSummary(): Promise<ShiftSummary> {
    const res = await fetchApi('/v1/hotel/shifts/current-summary');
    return res.data;
  },

  async openShift(data: { shift_type: string; cash_opening: number; handover_notes?: string }): Promise<{ id: number }> {
    const res = await fetchApi('/v1/hotel/shifts/open', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async closeShift(id: number, data: { cash_closing: number; cash_collected: number; handover_notes?: string }): Promise<void> {
    await fetchApi(`/v1/hotel/shifts/${id}/close`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Housekeeping
  async getHousekeeping(): Promise<{ rooms: HotelRoom[]; tasks: HousekeepingTask[]; staff: any[] }> {
    const res = await fetchApi('/v1/hotel/housekeeping');
    return res.data || { rooms: [], tasks: [], staff: [] };
  },

  async createHousekeepingTask(data: { room_id: number; assigned_user_id?: number | null; task_type: string; priority: string; notes?: string }): Promise<{ id: number }> {
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

  async quickCleanRoom(roomId: number): Promise<void> {
    await fetchApi(`/v1/hotel/housekeeping/rooms/${roomId}/quick-clean`, { method: 'POST' });
  },

  // Night Audit
  async getNightAudit(): Promise<{ metrics: NightAuditMetrics; recent_audits: NightAuditRecord[] }> {
    const res = await fetchApi('/v1/hotel/night-audit');
    return res.data;
  },

  async getNightAuditOverview(): Promise<{ metrics: NightAuditMetrics; recent_audits: NightAuditRecord[] }> {
    const res = await fetchApi('/v1/hotel/night-audit');
    return res.data;
  },

  async runNightAudit(auditDate?: string): Promise<{ audit_id: number; metrics: any }> {
    const res = await fetchApi('/v1/hotel/night-audit/run', {
      method: 'POST',
      body: JSON.stringify({ audit_date: auditDate }),
    });
    return res.data;
  },
};
