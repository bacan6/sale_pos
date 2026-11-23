export interface TenantInfo {
  id: number;
  name: string;
  slug: string;
  status: 'active' | 'waiting_activation' | 'on_hold' | 'suspended' | 'terminated';
  plan: string;
  modules: string;
  max_devices: number;
  expires_at: string | null;
  sub_status?: string;
}

export interface UserInfo {
  id: number;
  username: string;
  full_name: string;
  role: 'admin' | 'accountant' | 'manager' | 'cashier' | 'waitstaff' | 'kitchen' | 'kiosk';
  tenant_id: number;
}
