export interface Ingredient {
  id: number;
  code: string;
  name: string;
  unit: string;
  stock: number;
  cost_per_unit: number;
  min_stock_alert: number;
  is_active: number;
  is_low_stock?: boolean;
}

export interface ProductRecipe {
  id?: number;
  product_id?: number;
  ingredient_id: number;
  quantity_needed: number;
  unit: string;
  ingredient_name?: string;
  ingredient_code?: string;
  base_unit?: string;
  current_stock?: number;
  cost_per_unit?: number;
  estimated_cost?: number;
}

export interface InventoryLog {
  id: number;
  ingredient_id: number;
  ingredient_name: string;
  unit: string;
  type: 'in_purchase' | 'out_order' | 'waste' | 'opname_adjustment';
  quantity: number;
  balance_after: number;
  reference_id: string | null;
  notes: string | null;
  user_name: string | null;
  created_at: string;
}

export interface ShiftMovement {
  id: number;
  shift_id: number;
  type: 'cash_in' | 'cash_out';
  amount: number;
  reason: string;
  user_name?: string;
  created_at: string;
}

export interface CashierShift {
  id: number;
  user_name: string;
  opened_at: string;
  closed_at?: string | null;
  opening_cash: number;
  closing_cash_system?: number;
  closing_cash_actual?: number;
  cash_discrepancy?: number;
  total_cash_sales?: number;
  total_non_cash_sales?: number;
  live_cash_sales?: number;
  live_non_cash_sales?: number;
  total_cash_in?: number;
  total_cash_out?: number;
  expected_cash_drawer?: number;
  status?: 'open' | 'closed';
  notes?: string | null;
  movements?: ShiftMovement[];
}

export interface ShiftCurrentResponse {
  has_active_shift: boolean;
  shift: CashierShift | null;
}
