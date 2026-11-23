export interface BanquetRoom {
  id: number;
  tenant_id: number;
  name: string;
  code: string;
  floor: string | null;
  area_sqm: number;
  capacity_theater: number;
  capacity_classroom: number;
  capacity_u_shape: number;
  capacity_banquet: number;
  rate_per_hour: number;
  rate_half_day: number;
  rate_full_day: number;
  facilities?: string[];
  facilities_json?: string;
  is_active: number;
}

export interface BanquetPackage {
  id: number;
  tenant_id: number;
  name: string;
  code: string;
  category: 'meeting' | 'wedding' | 'social' | 'equipment' | 'catering';
  price_per_pax: number;
  min_pax: number;
  includes?: string[];
  includes_json?: string;
  description: string | null;
  is_active: number;
}

export interface BanquetBookingItem {
  id?: number;
  banquet_booking_id?: number;
  item_type: 'package' | 'equipment' | 'catering' | 'extra_hours' | 'other';
  name: string;
  qty: number;
  unit_price: number;
  total_price: number;
}

export interface BanquetBooking {
  id: number;
  tenant_id: number;
  booking_number: string;
  banquet_room_id: number;
  room_name?: string;
  room_code?: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  company_name: string | null;
  event_name: string;
  event_type: 'meeting' | 'seminar' | 'workshop' | 'wedding' | 'gathering' | 'other';
  layout_type: 'theater' | 'classroom' | 'u_shape' | 'banquet_round' | 'hollow_square';
  pax_count: number;
  start_time: string;
  end_time: string;
  package_id: number | null;
  package_name?: string;
  subtotal_amount: number;
  equipment_amount: number;
  catering_amount: number;
  tax_amount: number;
  total_amount: number;
  deposit_amount: number;
  paid_amount: number;
  payment_status: 'pending' | 'partial' | 'paid' | 'folio_charge';
  status: 'draft' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled';
  hotel_booking_id: number | null;
  notes: string | null;
  items?: BanquetBookingItem[];
  created_at: string;
}
