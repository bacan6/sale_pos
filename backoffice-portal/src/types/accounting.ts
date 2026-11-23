export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'cogs' | 'expense';
export type NormalBalance = 'debit' | 'credit';

export interface AccountingAccount {
  id: number;
  tenant_id: number;
  code: string;
  name: string;
  type: AccountType;
  normal_balance: NormalBalance;
  parent_id: number | null;
  parent_name?: string | null;
  is_active: number;
  is_system: number;
  current_balance?: number;
  created_at: string;
}

export interface JournalItem {
  id?: number;
  account_id: number;
  account_code?: string;
  account_name?: string;
  account_type?: AccountType;
  debit: number;
  credit: number;
  memo?: string;
}

export interface JournalEntry {
  id: number;
  tenant_id: number;
  entry_number: string;
  entry_date: string;
  reference_type: 'manual' | 'pos_shift_close' | 'hotel_night_audit' | 'hotel_folio' | 'period_closing' | 'adjustment';
  reference_id: number | null;
  notes: string;
  status: 'posted' | 'void';
  total_amount: number;
  created_by: number | null;
  creator_name?: string;
  items_count?: number;
  items?: JournalItem[];
  created_at: string;
}

export interface LedgerTransaction {
  id: number;
  debit: number;
  credit: number;
  memo: string;
  journal_id: number;
  entry_number: string;
  entry_date: string;
  reference_type: string;
  reference_id: number | null;
  notes: string;
  running_balance: number;
}

export interface AccountLedgerResponse {
  account: AccountingAccount;
  start_date: string;
  end_date: string;
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  ending_balance: number;
  transactions: LedgerTransaction[];
}

export interface TrialBalanceItem {
  id: number;
  code: string;
  name: string;
  type: AccountType;
  normal_balance: NormalBalance;
  total_debit: number;
  total_credit: number;
  ending_debit: number;
  ending_credit: number;
}

export interface TrialBalanceResponse {
  as_of_date: string;
  is_balanced: boolean;
  total_debit: number;
  total_credit: number;
  difference: number;
  accounts: TrialBalanceItem[];
}

export interface IncomeStatementItem {
  id: number;
  code: string;
  name: string;
  type: AccountType;
  amount: number;
}

export interface IncomeStatementResponse {
  start_date: string;
  end_date: string;
  total_revenue: number;
  total_cogs: number;
  gross_profit: number;
  total_expenses: number;
  net_income: number;
  revenues: IncomeStatementItem[];
  cogs: IncomeStatementItem[];
  expenses: IncomeStatementItem[];
}

export interface BalanceSheetResponse {
  as_of_date: string;
  is_balanced: boolean;
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  total_liabilities_and_equity: number;
  discrepancy: number;
  assets: IncomeStatementItem[];
  liabilities: IncomeStatementItem[];
  equity: IncomeStatementItem[];
}

export interface CashFlowResponse {
  start_date: string;
  end_date: string;
  opening_cash: number;
  cash_in: number;
  cash_out: number;
  net_cash_flow: number;
  closing_cash: number;
}

export interface AccountingPeriod {
  id: number;
  period_name: string;
  start_date: string;
  end_date: string;
  status: 'open' | 'closed';
  closed_at: string | null;
  closed_by_name?: string | null;
}

export interface AccountingSettings {
  tenant_id: number;
  cash_account_id: number | null;
  bank_account_id: number | null;
  pos_revenue_account_id: number | null;
  hotel_room_revenue_account_id: number | null;
  hotel_service_revenue_account_id: number | null;
  guest_ledger_account_id: number | null;
  service_charge_account_id: number | null;
  tax_payable_account_id: number | null;
  cash_over_account_id: number | null;
  cash_short_account_id: number | null;
  cogs_account_id: number | null;
  cash_account?: AccountingAccount;
  bank_account?: AccountingAccount;
  pos_revenue_account?: AccountingAccount;
  hotel_room_revenue_account?: AccountingAccount;
  guest_ledger_account?: AccountingAccount;
}
