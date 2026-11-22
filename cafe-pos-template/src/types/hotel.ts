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
}

export interface HotelGuest {
  id: number;
  full_name: string;
  id_card_type: 'KTP' | 'Passport' | 'SIM' | 'Other';
  id_card_number: string;
  phone?: string;
  email?: string;
  address?: string;
}

export type BookingStatus = 'reserved' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
export type BookingSource = 'walk_in' | 'ota_traveloka' | 'ota_agoda' | 'ota_booking_com' | 'direct_web' | 'phone_call' | 'corporate';

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
}

export interface HotelFolioItem {
  id: number;
  tenant_id: number;
  folio_id: number;
  category: 'room_charge' | 'pos_restaurant' | 'laundry' | 'minibar' | 'extra_bed' | 'amenity' | 'payment' | 'other';
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
  room_number?: string;
  room_type_name?: string;
  check_in_date?: string;
  check_out_date?: string;
  items?: HotelFolioItem[];
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
