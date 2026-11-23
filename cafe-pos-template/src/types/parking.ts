export interface ParkingRate {
  id: number;
  tenant_id: number;
  vehicle_type: 'motorcycle' | 'car' | 'bus' | 'truck';
  name: string;
  base_rate: number;
  hourly_rate: number;
  daily_max_rate: number;
  grace_period_minutes: number;
  is_active: number;
}

export interface ParkingGate {
  id: number;
  tenant_id: number;
  gate_code: string;
  gate_name: string;
  gate_type: 'in' | 'out' | 'bidirectional';
  vehicle_type_allowed: string;
  ip_address: string | null;
  relay_pin: number | null;
  status: 'online' | 'offline' | 'error';
  is_active: number;
}

export interface ParkingTicket {
  id: number;
  tenant_id: number;
  ticket_number: string;
  barcode_code: string;
  vehicle_type: 'motorcycle' | 'car' | 'bus' | 'truck';
  plate_number: string;
  entry_time: string;
  exit_time: string | null;
  entry_gate_id: number;
  exit_gate_id: number | null;
  entry_gate_name?: string;
  exit_gate_name?: string;
  duration_minutes: number;
  parking_fee: number;
  paid_amount: number;
  payment_method: 'cash' | 'qris' | 'hotel_complimentary' | 'banquet_pass' | 'unpaid';
  hotel_booking_id: number | null;
  banquet_booking_id: number | null;
  status: 'parked' | 'paid' | 'exited' | 'lost_ticket';
  current_duration_minutes?: number;
  current_estimated_fee?: number;
  created_at: string;
}

export interface SmartLock {
  id: number;
  tenant_id: number;
  device_code: string;
  device_name: string;
  lock_type: 'barrier_gate' | 'hotel_room' | 'meeting_room' | 'entrance_door';
  target_id: number | null;
  device_model: string;
  mac_address: string | null;
  ip_address: string | null;
  battery_level: number;
  is_locked: number;
  current_passcode: string | null;
  passcode_expires_at: string | null;
  last_synced_at: string | null;
  is_active: number;
}

export interface SmartLockLog {
  id: number;
  tenant_id: number;
  smart_lock_id: number;
  device_name?: string;
  device_code?: string;
  lock_type?: string;
  auth_method: 'pin' | 'rfid' | 'remote_api' | 'webhook' | 'manual_key';
  credential_identifier: string | null;
  access_status: 'granted' | 'denied';
  notes: string | null;
  timestamp: string;
}
