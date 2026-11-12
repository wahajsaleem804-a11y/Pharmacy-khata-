import { MedicineReturn, Transaction, TransactionItem } from "@/types/database.types";
import { calculateReturnAmount, roundToTwoDecimals } from "@/lib/calculations/financial";
import { ActivityService } from "./activityService";
import { createClient } from "@/lib/supabase/client";
import { getStorage } from "./storage";

const LOCAL_STORAGE_KEY_RETURNS = "pharmacy_khata_medicine_returns";
const LOCAL_STORAGE_KEY_ITEMS = "pharmacy_khata_transaction_items";

export interface CreateReturnInput {
  pharmacyId: string;
  transactionId: string;
  transactionItemId: string;
  returnQuantity: number;
  returnLooseQuantity?: number;
  reason?: string;
  returnDate?: string;
  userId?: string;
}

export class ReturnService {
  private static getLocalReturns(): MedicineReturn[] {
    try {
      const storage = getStorage();
      const raw = storage.getItem(LOCAL_STORAGE_KEY_RETURNS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private static getLocalItems(): TransactionItem[] {
    try {
      const storage = getStorage();
      const raw = storage.getItem(LOCAL_STORAGE_KEY_ITEMS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private static saveLocalData(returns: MedicineReturn[], items: TransactionItem[]): void {
    try {
      const storage = getStorage();
      storage.setItem(LOCAL_STORAGE_KEY_RETURNS, JSON.stringify(returns));
      storage.setItem(LOCAL_STORAGE_KEY_ITEMS, JSON.stringify(items));
    } catch (err) {
      console.error("Failed to save returns locally:", err);
    }
  }

  static async getAll(options: {
    pharmacyId?: string;
    includeDeleted?: boolean;
  } = {}): Promise<MedicineReturn[]> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes("placeholder")) {
      try {
        const supabase = createClient();
        let query = supabase
          .from("medicine_returns")
          .select("*, pharmacy:pharmacies(*), transaction:transactions(*), transaction_item:transaction_items(*)")
          .order("return_date", { ascending: false });

        if (!options.includeDeleted) query = query.is("deleted_at", null);
        if (options.pharmacyId) query = query.eq("pharmacy_id", options.pharmacyId);

        const { data, error } = await query;
        if (!error && data) return data as MedicineReturn[];
      } catch (err) {
        console.warn("Falling back to local returns:", err);
      }
    }

    const allReturns = this.getLocalReturns();
    let filtered = options.includeDeleted ? allReturns : allReturns.filter((r) => !r.deleted_at);
    if (options.pharmacyId) filtered = filtered.filter((r) => r.pharmacy_id === options.pharmacyId);
    return filtered;
  }

  static async create(input: CreateReturnInput): Promise<MedicineReturn> {
    const allItems = this.getLocalItems();
    const itemIndex = allItems.findIndex((i) => i.id === input.transactionItemId);
    if (itemIndex === -1) {
      throw new Error("Original transaction item was not found.");
    }

    const item = allItems[itemIndex];
    const packSize = item.pack_size && item.pack_size > 0 ? item.pack_size : 1;
    const availablePacks = item.quantity - (item.returned_quantity || 0);
    const availableLoose = (item.loose_quantity || 0) - (item.returned_loose_quantity || 0);
    const returnLoose = input.returnLooseQuantity || 0;

    // Precise mathematical and validation check
    const { returnAmount } = calculateReturnAmount(
      input.returnQuantity,
      item.discounted_unit_price,
      availablePacks,
      returnLoose,
      availableLoose,
      packSize
    );

    const now = new Date().toISOString();
    const returnId = crypto.randomUUID ? crypto.randomUUID() : `return_${Date.now()}`;

    // Update item returned quantity atomically
    item.returned_quantity = (item.returned_quantity || 0) + input.returnQuantity;
    item.returned_loose_quantity = (item.returned_loose_quantity || 0) + returnLoose;
    item.updated_at = now;
    allItems[itemIndex] = item;

    const newReturn: MedicineReturn = {
      id: returnId,
      user_id: input.userId || "authenticated-user",
      pharmacy_id: input.pharmacyId,
      transaction_id: input.transactionId,
      transaction_item_id: input.transactionItemId,
      return_date: input.returnDate || now.split("T")[0],
      return_quantity: input.returnQuantity,
      return_loose_quantity: returnLoose,
      original_discounted_unit_price: item.discounted_unit_price,
      return_amount: returnAmount,
      reason: input.reason?.trim() || null,
      deleted_at: null,
      created_at: now,
      updated_at: now,
      transaction_item: item,
    };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes("placeholder")) {
      try {
        const supabase = createClient();
        // Invoke atomic stored procedure
        const { data, error } = await supabase.rpc("process_medicine_return", {
          p_user_id: newReturn.user_id,
          p_pharmacy_id: newReturn.pharmacy_id,
          p_transaction_id: newReturn.transaction_id,
          p_transaction_item_id: newReturn.transaction_item_id,
          p_return_quantity: newReturn.return_quantity,
          p_return_loose_quantity: newReturn.return_loose_quantity || 0,
          p_reason: newReturn.reason,
        });
        if (error) throw error;
        if (data) newReturn.id = data;
      } catch (err) {
        console.error("Supabase RPC return error:", err);
      }
    }

    const currentReturns = this.getLocalReturns();
    currentReturns.unshift(newReturn);
    this.saveLocalData(currentReturns, allItems);

    await ActivityService.log({
      userId: newReturn.user_id,
      action: "CREATE",
      tableName: "medicine_returns",
      recordId: newReturn.id,
      newData: newReturn as any,
      description: `Returned ${newReturn.return_quantity} units of "${item.medicine_name}" (Rs. ${newReturn.return_amount})`,
    });

    return newReturn;
  }
}
