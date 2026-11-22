export interface TenantInfo {
  id: number;
  name: string;
  slug: string;
  status: 'waiting_activation' | 'active' | 'on_hold' | 'terminated';
  plan: string;
  modules?: string; // 'pos' | 'hotel' | 'combo'
  max_devices: number;
  subscription_expires_at?: string;
  expires_at?: string;
}

export interface UserInfo {
  id: number;
  username: string;
  full_name?: string;
  role: string;
}

export interface SubscriptionInvoice {
  id: number;
  invoice_number: string;
  tenant_id: number;
  type: 'activation' | 'recurring' | 'upgrade';
  plan: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  payment_method: string;
  paid_at: string;
  period_start: string;
  period_end: string;
  created_at: string;
}
