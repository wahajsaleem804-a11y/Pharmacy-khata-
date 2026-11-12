import { Transaction, TransactionItem, TransactionType } from "@/types/database.types";
import { calculateLineItem, calculateTransactionTotals, roundToTwoDecimals } from "@/lib/calculations/financial";
import { ActivityService } from "./activityService";
import { createClient } from "@/lib/supabase/client";
import { getStorage } from "./storage";

const LOCAL_STORAGE_KEY_TX = "pharmacy_khata_transactions";
const LOCAL_STORAGE_KEY_ITEMS = "pharmacy_khata_transaction_items";

export interface TransactionItemInput {
  medicineName: string;
  quantity: number; // Pack quantity (>= 0)
  looseQuantity?: number; // Loose units (>= 0, default 0)
  packSize?: number; // Loose units per pack (default 1)
  retailPrice: number;
  discountPercentage: number;
}

export interface CreateTransactionInput {
  pharmacyId: string;
  type: TransactionType;
  transactionDate?: string;
  invoiceNumber?: string;
  notes?: string;
  items: TransactionItemInput[];
  userId?: string;
}

export class TransactionService {
  private static getLocalTransactions(): Transaction[] {
    try {
      const storage = getStorage();
      const raw = storage.getItem(LOCAL_STORAGE_KEY_TX);
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

  private static saveLocalData(txs: Transaction[], items: TransactionItem[]): void {
    try {
      const storage = getStorage();
      storage.setItem(LOCAL_STORAGE_KEY_TX, JSON.stringify(txs));
      storage.setItem(LOCAL_STORAGE_KEY_ITEMS, JSON.stringify(items));
    } catch (err) {
      console.error("Failed to save transactions locally:", err);
    }
  }

  static async getAll(options: {
    pharmacyId?: string;
    type?: TransactionType;
    date?: string;
    includeDeleted?: boolean;
  } = {}): Promise<Transaction[]> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes("placeholder")) {
      try {
        const supabase = createClient();
        let query = supabase
          .from("transactions")
          .select("*, pharmacy:pharmacies(*), items:transaction_items(*)")
          .order("transaction_date", { ascending: false });

        if (!options.includeDeleted) query = query.is("deleted_at", null);
        if (options.pharmacyId) query = query.eq("pharmacy_id", options.pharmacyId);
        if (options.type) query = query.eq("type", options.type);
        if (options.date) query = query.eq("transaction_date", options.date);

        const { data, error } = await query;
        if (!error && data) return data as Transaction[];
      } catch (err) {
        console.warn("Falling back to local transactions:", err);
      }
    }

    const allTx = this.getLocalTransactions();
    const allItems = this.getLocalItems();

    let filtered = options.includeDeleted ? allTx : allTx.filter((t) => !t.deleted_at);
    if (options.pharmacyId) filtered = filtered.filter((t) => t.pharmacy_id === options.pharmacyId);
    if (options.type) filtered = filtered.filter((t) => t.type === options.type);
    if (options.date) filtered = filtered.filter((t) => t.transaction_date === options.date);

    // Attach items
    return filtered.map((tx) => ({
      ...tx,
      items: allItems.filter((i) => i.transaction_id === tx.id),
    }));
  }

  static async getById(id: string): Promise<Transaction | null> {
    const all = await this.getAll({ includeDeleted: true });
    return all.find((t) => t.id === id) || null;
  }

  static async create(input: CreateTransactionInput): Promise<Transaction> {
    if (!input.pharmacyId) throw new Error("Pharmacy selection is required.");
    if (!input.items || input.items.length === 0) {
      throw new Error("Transaction must contain at least one medicine item.");
    }

    const transactionId = crypto.randomUUID ? crypto.randomUUID() : `tx_${Date.now()}`;
    const now = new Date().toISOString();
    const txDate = input.transactionDate || now.split("T")[0];

    // Compute line items rigorously
    const calculatedItems: TransactionItem[] = input.items.map((item) => {
      if (!item.medicineName || item.medicineName.trim() === "") {
        throw new Error("Medicine name is required.");
      }
      const calc = calculateLineItem({
        quantity: item.quantity,
        looseQuantity: item.looseQuantity ?? 0,
        packSize: item.packSize && item.packSize > 0 ? item.packSize : 1,
        retailPrice: item.retailPrice,
        discountPercentage: item.discountPercentage || 0,
      });

      return {
        id: crypto.randomUUID ? crypto.randomUUID() : `item_${Date.now()}_${Math.random()}`,
        transaction_id: transactionId,
        medicine_name: item.medicineName.trim(),
        quantity: calc.quantity,
        loose_quantity: calc.looseQuantity,
        pack_size: calc.packSize,
        retail_price: calc.retailPrice,
        discount_percentage: calc.discountPercentage,
        discount_amount: calc.discountAmount,
        discounted_unit_price: calc.discountedUnitPrice,
        line_total: calc.lineTotal,
        returned_quantity: 0,
        returned_loose_quantity: 0,
        created_at: now,
        updated_at: now,
      };
    });

    const totals = calculateTransactionTotals(
      calculatedItems.map((ci) => {
        const packSize = ci.pack_size && ci.pack_size > 0 ? ci.pack_size : 1;
        const loose = ci.loose_quantity || 0;
        const packDiscount = roundToTwoDecimals(ci.retail_price * (ci.discount_percentage / 100));
        const lineDiscountAmount = roundToTwoDecimals(
          (ci.quantity * packDiscount) + (loose * (packDiscount / packSize))
        );
        return {
          quantity: ci.quantity,
          looseQuantity: loose,
          packSize: packSize,
          totalPacks: roundToTwoDecimals(ci.quantity + (loose / packSize)),
          totalUnits: (ci.quantity * packSize) + loose,
          retailPrice: ci.retail_price,
          discountPercentage: ci.discount_percentage,
          discountAmount: ci.discount_amount,
          lineDiscountAmount,
          discountedUnitPrice: ci.discounted_unit_price,
          discountedUnitPricePerUnit: roundToTwoDecimals(ci.discounted_unit_price / packSize),
          lineTotal: ci.line_total,
        };
      })
    );

    const newTx: Transaction = {
      id: transactionId,
      user_id: input.userId || "authenticated-user",
      pharmacy_id: input.pharmacyId,
      invoice_number: input.invoiceNumber?.trim() || null,
      transaction_date: txDate,
      type: input.type,
      notes: input.notes?.trim() || null,
      subtotal_amount: totals.subtotalAmount,
      discount_amount: totals.discountAmount,
      grand_total: totals.grandTotal,
      deleted_at: null,
      created_at: now,
      updated_at: now,
      items: calculatedItems,
    };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes("placeholder")) {
      try {
        const supabase = createClient();
        await supabase.from("transactions").insert([
          {
            id: newTx.id,
            user_id: newTx.user_id,
            pharmacy_id: newTx.pharmacy_id,
            invoice_number: newTx.invoice_number,
            transaction_date: newTx.transaction_date,
            type: newTx.type,
            notes: newTx.notes,
            subtotal_amount: newTx.subtotal_amount,
            discount_amount: newTx.discount_amount,
            grand_total: newTx.grand_total,
          },
        ]);

        await supabase.from("transaction_items").insert(
          calculatedItems.map((ci) => ({
            id: ci.id,
            transaction_id: ci.transaction_id,
            medicine_name: ci.medicine_name,
            quantity: ci.quantity,
            loose_quantity: ci.loose_quantity || 0,
            pack_size: ci.pack_size || 1,
            retail_price: ci.retail_price,
            discount_percentage: ci.discount_percentage,
            discount_amount: ci.discount_amount,
            discounted_unit_price: ci.discounted_unit_price,
            line_total: ci.line_total,
            returned_quantity: ci.returned_quantity,
            returned_loose_quantity: ci.returned_loose_quantity || 0,
          }))
        );
      } catch (err) {
        console.error("Supabase transaction insert error:", err);
      }
    }

    const currentTxs = this.getLocalTransactions();
    const currentItems = this.getLocalItems();
    currentTxs.unshift(newTx);
    currentItems.push(...calculatedItems);
    this.saveLocalData(currentTxs, currentItems);

    await ActivityService.log({
      userId: newTx.user_id,
      action: "CREATE",
      tableName: "transactions",
      recordId: newTx.id,
      newData: { ...newTx, itemsCount: calculatedItems.length } as any,
      description: `Created ${newTx.type.toUpperCase()} transaction of Rs. ${newTx.grand_total} with ${calculatedItems.length} items`,
    });

    return newTx;
  }

  static async softDelete(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) throw new Error("Transaction not found.");

    const now = new Date().toISOString();
    existing.deleted_at = now;

    const currentTxs = this.getLocalTransactions();
    const idx = currentTxs.findIndex((t) => t.id === id);
    if (idx !== -1) {
      currentTxs[idx].deleted_at = now;
      this.saveLocalData(currentTxs, this.getLocalItems());
    }

    await ActivityService.log({
      userId: existing.user_id,
      action: "SOFT_DELETE",
      tableName: "transactions",
      recordId: existing.id,
      oldData: { deleted_at: null },
      newData: { deleted_at: now },
      description: `Soft-deleted transaction ${existing.id}`,
    });
  }

  static async restore(id: string): Promise<Transaction> {
    const existing = await this.getById(id);
    if (!existing) throw new Error("Transaction not found.");

    existing.deleted_at = null;

    const currentTxs = this.getLocalTransactions();
    const idx = currentTxs.findIndex((t) => t.id === id);
    if (idx !== -1) {
      currentTxs[idx].deleted_at = null;
      this.saveLocalData(currentTxs, this.getLocalItems());
    }

    await ActivityService.log({
      userId: existing.user_id,
      action: "RESTORE",
      tableName: "transactions",
      recordId: existing.id,
      oldData: { deleted_at: "deleted" },
      newData: { deleted_at: null },
      description: `Restored transaction ${existing.id}`,
    });

    return existing;
  }
}
