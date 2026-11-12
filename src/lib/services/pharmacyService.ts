import { Pharmacy, OpeningBalanceType } from "@/types/database.types";
import { ActivityService } from "./activityService";
import { createClient } from "@/lib/supabase/client";
import { getStorage } from "./storage";

const LOCAL_STORAGE_KEY = "pharmacy_khata_pharmacies";

export interface CreatePharmacyInput {
  name: string;
  contactPerson?: string;
  phoneNumber: string;
  address?: string;
  openingBalance?: number;
  openingBalanceType?: OpeningBalanceType;
  notes?: string;
  userId?: string;
}

export class PharmacyService {
  private static getLocalData(): Pharmacy[] {
    try {
      const storage = getStorage();
      const raw = storage.getItem(LOCAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private static saveLocalData(pharmacies: Pharmacy[]): void {
    try {
      const storage = getStorage();
      storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pharmacies));
    } catch (err) {
      console.error("Failed to save pharmacies locally:", err);
    }
  }

  static async getAll(includeDeleted: boolean = false): Promise<Pharmacy[]> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes("placeholder")) {
      try {
        const supabase = createClient();
        let query = supabase.from("pharmacies").select("*").order("name", { ascending: true });
        if (!includeDeleted) {
          query = query.is("deleted_at", null);
        }
        const { data, error } = await query;
        if (!error && data) return data as Pharmacy[];
      } catch (err) {
        console.warn("Falling back to local pharmacies:", err);
      }
    }

    const local = this.getLocalData();
    return includeDeleted ? local : local.filter((p) => !p.deleted_at);
  }

  static async getById(id: string): Promise<Pharmacy | null> {
    const all = await this.getAll(true);
    return all.find((p) => p.id === id) || null;
  }

  static async create(input: CreatePharmacyInput): Promise<Pharmacy> {
    if (!input.name || input.name.trim() === "") {
      throw new Error("Pharmacy name is required.");
    }
    if (!input.phoneNumber || input.phoneNumber.trim() === "") {
      throw new Error("Phone number is required.");
    }

    const now = new Date().toISOString();
    const newPharmacy: Pharmacy = {
      id: crypto.randomUUID ? crypto.randomUUID() : `pharmacy_${Date.now()}`,
      user_id: input.userId || "authenticated-user",
      name: input.name.trim(),
      contact_person: input.contactPerson?.trim() || null,
      phone_number: input.phoneNumber.trim(),
      address: input.address?.trim() || null,
      opening_balance: Number(input.openingBalance) || 0,
      opening_balance_type: input.openingBalanceType || "neutral",
      notes: input.notes?.trim() || null,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes("placeholder")) {
      try {
        const supabase = createClient();
        await supabase.from("pharmacies").insert([newPharmacy]);
      } catch (err) {
        console.error("Supabase pharmacy insert error:", err);
      }
    }

    const current = this.getLocalData();
    current.push(newPharmacy);
    this.saveLocalData(current);

    await ActivityService.log({
      userId: newPharmacy.user_id,
      action: "CREATE",
      tableName: "pharmacies",
      recordId: newPharmacy.id,
      newData: newPharmacy as any,
      description: `Added new pharmacy: "${newPharmacy.name}"`,
    });

    return newPharmacy;
  }

  static async update(id: string, updates: Partial<CreatePharmacyInput>): Promise<Pharmacy> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error("Pharmacy not found.");
    }

    const now = new Date().toISOString();
    const updated: Pharmacy = {
      ...existing,
      name: updates.name !== undefined ? updates.name.trim() : existing.name,
      contact_person: updates.contactPerson !== undefined ? updates.contactPerson?.trim() || null : existing.contact_person,
      phone_number: updates.phoneNumber !== undefined ? updates.phoneNumber.trim() : existing.phone_number,
      address: updates.address !== undefined ? updates.address?.trim() || null : existing.address,
      opening_balance: updates.openingBalance !== undefined ? Number(updates.openingBalance) : existing.opening_balance,
      opening_balance_type: updates.openingBalanceType || existing.opening_balance_type,
      notes: updates.notes !== undefined ? updates.notes?.trim() || null : existing.notes,
      updated_at: now,
    };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes("placeholder")) {
      try {
        const supabase = createClient();
        await supabase.from("pharmacies").update(updated).eq("id", id);
      } catch (err) {
        console.error("Supabase pharmacy update error:", err);
      }
    }

    const current = this.getLocalData();
    const idx = current.findIndex((p) => p.id === id);
    if (idx !== -1) {
      current[idx] = updated;
      this.saveLocalData(current);
    }

    await ActivityService.log({
      userId: updated.user_id,
      action: "UPDATE",
      tableName: "pharmacies",
      recordId: updated.id,
      oldData: existing as any,
      newData: updated as any,
      description: `Updated pharmacy: "${updated.name}"`,
    });

    return updated;
  }

  static async softDelete(id: string, hasTransactions: boolean = false): Promise<void> {
    if (hasTransactions) {
      throw new Error(
        "Cannot delete pharmacy with active transaction history. Archive transactions first or use soft-delete with caution."
      );
    }

    const existing = await this.getById(id);
    if (!existing) throw new Error("Pharmacy not found.");

    const now = new Date().toISOString();
    existing.deleted_at = now;
    existing.updated_at = now;

    const current = this.getLocalData();
    const idx = current.findIndex((p) => p.id === id);
    if (idx !== -1) {
      current[idx] = existing;
      this.saveLocalData(current);
    }

    await ActivityService.log({
      userId: existing.user_id,
      action: "SOFT_DELETE",
      tableName: "pharmacies",
      recordId: existing.id,
      oldData: { deleted_at: null },
      newData: { deleted_at: now },
      description: `Soft-deleted pharmacy: "${existing.name}"`,
    });
  }

  static async restore(id: string): Promise<Pharmacy> {
    const existing = await this.getById(id);
    if (!existing) throw new Error("Pharmacy not found.");

    const now = new Date().toISOString();
    existing.deleted_at = null;
    existing.updated_at = now;

    const current = this.getLocalData();
    const idx = current.findIndex((p) => p.id === id);
    if (idx !== -1) {
      current[idx] = existing;
      this.saveLocalData(current);
    }

    await ActivityService.log({
      userId: existing.user_id,
      action: "RESTORE",
      tableName: "pharmacies",
      recordId: existing.id,
      oldData: { deleted_at: "previously_deleted" },
      newData: { deleted_at: null },
      description: `Restored pharmacy: "${existing.name}"`,
    });

    return existing;
  }
}
