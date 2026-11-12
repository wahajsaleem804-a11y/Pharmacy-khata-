export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TransactionType = "received" | "given";
export type OpeningBalanceType = "payable" | "receivable" | "neutral";
export type SupportedLanguage = "en" | "ur-ro" | "ur";

export interface UserProfile {
  id: string;
  full_name: string;
  pharmacy_business_name: string | null;
  phone_number: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pharmacy {
  id: string;
  user_id: string;
  name: string;
  contact_person: string | null;
  phone_number: string;
  address: string | null;
  opening_balance: number;
  opening_balance_type: OpeningBalanceType;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  pharmacy_id: string;
  invoice_number: string | null;
  transaction_date: string;
  type: TransactionType;
  notes: string | null;
  subtotal_amount: number;
  discount_amount: number;
  grand_total: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined relation fields
  pharmacy?: Pharmacy;
  items?: TransactionItem[];
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  medicine_name: string;
  quantity: number; // Pack quantity
  loose_quantity?: number; // Loose units (tablets/strips)
  pack_size?: number; // Number of loose units per pack (default 1)
  retail_price: number;
  discount_percentage: number;
  discount_amount: number;
  discounted_unit_price: number;
  line_total: number;
  returned_quantity: number;
  returned_loose_quantity?: number;
  created_at: string;
  updated_at: string;
}

export interface MedicineReturn {
  id: string;
  user_id: string;
  pharmacy_id: string;
  transaction_id: string;
  transaction_item_id: string;
  return_date: string;
  return_quantity: number;
  return_loose_quantity?: number;
  original_discounted_unit_price: number;
  return_amount: number;
  reason: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined relation fields
  pharmacy?: Pharmacy;
  transaction?: Transaction;
  transaction_item?: TransactionItem;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: "CREATE" | "UPDATE" | "SOFT_DELETE" | "RESTORE" | "LOGIN" | "SETTINGS_UPDATE";
  table_name: string;
  record_id: string;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  description: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  language: SupportedLanguage;
  theme: "light" | "dark" | "system";
  currency_symbol: string;
  created_at: string;
  updated_at: string;
}

// Financial Ledger Entry for Pharmacy Statement
export interface LedgerEntry {
  id: string;
  date: string;
  type: "opening_balance" | "received" | "given" | "return_received" | "return_given";
  reference: string;
  description: string;
  debit: number;   // Money given or payable reduction
  credit: number;  // Money received or receivable reduction
  running_balance: number; // Net balance after this entry
  raw_item?: any;
}
