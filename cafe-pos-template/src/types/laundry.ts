export interface LaundryService {
  id: number;
  tenant_id: number;
  name: string;
  type: 'kiloan' | 'satuan';
  unit: string;
  base_price: number | string;
  duration_hours: number;
  description?: string | null;
  is_active: number | boolean;
}

export interface LaundryPerfume {
  id: number;
  tenant_id: number;
  name: string;
  price_extra: number | string;
  is_active: number | boolean;
}

export interface LaundryRack {
  id: number;
  tenant_id: number;
  code: string;
  name: string;
  capacity: number;
  is_active: number | boolean;
  active_orders_count?: number;
}

export interface LaundryOrderItem {
  id?: number;
  order_id?: number;
  service_id?: number | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes?: string;
  service_type?: 'kiloan' | 'satuan';
  service_unit?: string;
}

export interface LaundryPayment {
  id: number;
  order_id: number;
  amount: number | string;
  payment_method: 'cash' | 'card' | 'qris' | 'room_charge' | 'transfer';
  reference_number?: string | null;
  cashier_name?: string | null;
  created_at: string;
}

export interface LaundryStatusLog {
  id: number;
  order_id: number;
  from_status?: string | null;
  to_status: string;
  changed_by_name?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface LaundryOrder {
  id: number;
  tenant_id: number;
  order_number: string;
  tracking_code: string;
  customer_name: string;
  customer_phone?: string | null;
  service_speed: 'regular' | 'express' | 'super_express';
  perfume_id?: number | null;
  perfume_name?: string | null;
  rack_id?: number | null;
  rack_code?: string | null;
  rack_name?: string | null;
  total_weight: number | string;
  subtotal_amount: number | string;
  speed_surcharge: number | string;
  perfume_surcharge: number | string;
  discount_amount: number | string;
  total_amount: number | string;
  paid_amount: number | string;
  payment_status: 'unpaid' | 'partial' | 'paid';
  status: 'received' | 'washing' | 'drying' | 'ironing' | 'ready' | 'picked_up' | 'cancelled';
  hotel_booking_id?: number | null;
  booking_number?: string | null;
  hotel_guest_name?: string | null;
  estimated_completion_at?: string | null;
  completed_at?: string | null;
  picked_up_at?: string | null;
  notes?: string | null;
  created_by_name?: string | null;
  created_at: string;
  items?: LaundryOrderItem[];
  payments?: LaundryPayment[];
  logs?: LaundryStatusLog[];
}

export interface CreateLaundryOrderPayload {
  customer_name: string;
  customer_phone?: string;
  service_speed: 'regular' | 'express' | 'super_express';
  perfume_id?: number | null;
  rack_id?: number | null;
  hotel_booking_id?: number | null;
  notes?: string;
  items: Array<{
    service_id?: number | null;
    item_name: string;
    quantity: number;
    unit_price: number;
    notes?: string;
  }>;
  payment_method?: string;
  paid_amount?: number;
  payment_reference?: string;
  discount_amount?: number;
}
