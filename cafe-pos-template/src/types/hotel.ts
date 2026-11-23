export interface RoomType {
  id: number;
  tenant_id: number;
  name: string;
  code: string;
  base_price: number;
  max_adults: number;
  max_children: number;
  amenities_json?: string;
  amenities?: string[];
  description?: string;
  is_active: number;
  total_rooms?: number;
}

export type RoomStatus = 
  | 'vacant_clean' 
  | 'vacant_dirty' 
  | 'occupied_clean' 
  | 'occupied_dirty' 
  | 'inspected' 
  | 'maintenance' 
  | 'out_of_service';

export interface HotelRoom {
  id: number;
  tenant_id: number;
  room_type_id: number;
  room_number: string;
  floor: number;
  status: RoomStatus;
  active_booking_id?: number | null;
  room_type_name?: string;
  room_type_code?: string;
  base_price?: number;
  amenities?: string[];
  guest_name?: string;
  guest_phone?: string;
  booking_number?: string;
  booking_source?: string;
  check_in_date?: string;
  check_out_date?: string;
  bookings?: CalendarBookingSpan[];
}

export type VipTier = 'regular' | 'silver' | 'gold' | 'platinum';

export interface HotelGuest {
  id: number;
  tenant_id?: number;
  full_name: string;
  id_card_type: 'KTP' | 'Passport' | 'SIM' | 'Other';
  id_card_number: string;
  phone?: string;
  email?: string;
  address?: string;
  vip_tier?: VipTier;
  is_blacklisted?: number;
  blacklist_reason?: string;
  total_stays?: number;
  total_spent?: number;
  preferences?: string;
  booking_history?: HotelBooking[];
}

export type BookingStatus = 'reserved' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
export type BookingSource = 'walk_in' | 'ota_traveloka' | 'ota_agoda' | 'ota_booking_com' | 'direct_web' | 'phone_call' | 'corporate';

export interface RoomTransferRecord {
  id: number;
  booking_id: number;
  from_room_id: number;
  to_room_id: number;
  from_room?: string;
  to_room?: string;
  transfer_date: string;
  reason: string;
  rate_adjusted: number;
  old_rate: number;
  new_rate: number;
  staff_name?: string;
}

export interface HotelBooking {
  id: number;
  tenant_id: number;
  booking_number: string;
  guest_id: number;
  room_id: number;
  source: BookingSource;
  ota_reference_code?: string;
  check_in_date: string;
  check_out_date: string;
  actual_check_in_at?: string;
  actual_check_out_at?: string;
  status: BookingStatus;
  night_count: number;
  rate_per_night: number;
  deposit_amount: number;
  total_amount: number;
  notes?: string;
  guest_name: string;
  guest_phone?: string;
  guest_email?: string;
  guest_address?: string;
  id_card_type?: string;
  id_card_number?: string;
  vip_tier?: VipTier;
  is_blacklisted?: number;
  blacklist_reason?: string;
  room_number: string;
  floor: number;
  room_type_name: string;
  room_type_code: string;
  folio_id?: number;
  folio_number?: string;
  folio_balance?: number;
  folio_status?: string;
  total_charges?: number;
  total_payments?: number;
  balance?: number;
  folio_items?: HotelFolioItem[];
  transfers?: RoomTransferRecord[];
}

export interface HotelFolioItem {
  id: number;
  tenant_id: number;
  folio_id: number;
  category: 'room_charge' | 'pos_restaurant' | 'laundry' | 'minibar' | 'extra_bed' | 'amenity' | 'payment' | 'penalty' | 'other';
  source_order_id?: number | null;
  description: string;
  amount: number;
  quantity: number;
  created_at: string;
}

export interface HotelFolio {
  id: number;
  tenant_id: number;
  booking_id: number;
  folio_number: string;
  status: 'open' | 'settled' | 'closed';
  total_charges: number;
  total_payments: number;
  balance: number;
  booking_number?: string;
  guest_name?: string;
  guest_phone?: string;
  id_card_number?: string;
  id_card_type?: string;
  vip_tier?: VipTier;
  room_number?: string;
  floor?: number;
  room_type_name?: string;
  check_in_date?: string;
  check_out_date?: string;
  night_count?: number;
  rate_per_night?: number;
  deposit_amount?: number;
  booking_status?: BookingStatus;
  items?: HotelFolioItem[];
}

export type HotelServiceCategory = 'extra_bed' | 'laundry' | 'minibar' | 'breakfast' | 'transport' | 'amenity' | 'penalty' | 'other';

export interface HotelService {
  id: number;
  tenant_id: number;
  category: HotelServiceCategory;
  code: string;
  name: string;
  price: number;
  unit: string;
  description?: string;
  is_active: number;
}

export interface LostAndFoundItem {
  id: number;
  tenant_id: number;
  room_id: number;
  room_number: string;
  floor: number;
  item_name: string;
  description?: string;
  storage_location: string;
  status: 'stored' | 'claimed' | 'disposed';
  found_date: string;
  found_by_staff_name?: string;
  claimed_by_name?: string;
  claimed_at?: string;
  created_at: string;
}

export interface HotelShiftHandover {
  id: number;
  tenant_id: number;
  shift_date: string;
  shift_type: 'morning' | 'evening' | 'night';
  user_id: number;
  receptionist_name?: string;
  cash_opening: number;
  cash_closing: number;
  cash_collected: number;
  pending_checkouts: number;
  pending_checkins: number;
  handover_notes?: string;
  status: 'open' | 'submitted';
  created_at: string;
}

export interface ShiftSummary {
  date: string;
  pending_arrivals: number;
  pending_departures: number;
  payments_collected_today: number;
  active_shift: HotelShiftHandover | null;
}

export interface CalendarBookingSpan {
  id: number;
  booking_number: string;
  guest_id: number;
  room_id: number;
  check_in_date: string;
  check_out_date: string;
  status: BookingStatus;
  source: BookingSource;
  night_count: number;
  rate_per_night: number;
  total_amount: number;
  guest_name: string;
  guest_phone?: string;
  vip_tier?: VipTier;
  folio_id?: number;
  folio_balance?: number;
}

export interface TimelineCalendarData {
  start_date: string;
  end_date: string;
  days: number;
  rooms: HotelRoom[];
}

export interface HousekeepingTask {
  id: number;
  room_id: number;
  room_number: string;
  floor: number;
  assigned_user_id?: number | null;
  assigned_staff_name?: string | null;
  task_type: 'daily_cleaning' | 'checkout_cleaning' | 'deep_cleaning' | 'maintenance';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'inspected';
  notes?: string;
  completed_at?: string;
  created_at: string;
}

export interface NightAuditMetrics {
  total_rooms: number;
  occupied_rooms: number;
  vacant_clean: number;
  vacant_dirty: number;
  out_of_order: number;
  occupancy_rate: number;
  room_revenue: number;
  pos_revenue: number;
  other_revenue: number;
  total_revenue: number;
  adr: number;
  revpar: number;
}

export interface NightAuditRecord {
  id: number;
  audit_date: string;
  total_rooms: number;
  occupied_rooms: number;
  occupancy_rate: number;
  room_revenue: number;
  pos_revenue: number;
  other_revenue: number;
  total_revenue: number;
  adr: number;
  revpar: number;
  auditor_name?: string;
  created_at: string;
}
