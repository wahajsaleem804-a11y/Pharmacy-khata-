import { ActivityLog } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client";
import { getStorage } from "./storage";

const LOCAL_STORAGE_KEY = "pharmacy_khata_activity_logs";

export class ActivityService {
  /**
   * Log an activity record.
   */
  static async log(entry: {
    userId?: string;
    action: "CREATE" | "UPDATE" | "SOFT_DELETE" | "RESTORE" | "LOGIN" | "SETTINGS_UPDATE";
    tableName: string;
    recordId: string;
    oldData?: Record<string, any> | null;
    newData?: Record<string, any> | null;
    description: string;
  }): Promise<ActivityLog> {
    const logItem: ActivityLog = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      user_id: entry.userId || "authenticated-user",
      action: entry.action,
      table_name: entry.tableName,
      record_id: entry.recordId,
      old_data: entry.oldData || null,
      new_data: entry.newData || null,
      description: entry.description,
      ip_address: "127.0.0.1",
      created_at: new Date().toISOString(),
    };

    // If Supabase is configured with real credentials, insert into Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes("placeholder")) {
      try {
        const supabase = createClient();
        await supabase.from("activity_logs").insert([
          {
            user_id: logItem.user_id,
            action: logItem.action,
            table_name: logItem.table_name,
            record_id: logItem.record_id,
            old_data: logItem.old_data,
            new_data: logItem.new_data,
            description: logItem.description,
          },
        ]);
      } catch (err) {
        console.error("Supabase activity log error:", err);
      }
    }

    // Persist locally for seamless offline audit review
    try {
      const storage = getStorage();
      const existing = this.getAllLocal();
      existing.unshift(logItem);
      storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing.slice(0, 500)));
    } catch (err) {
      console.error("Storage log error:", err);
    }

    return logItem;
  }

  static getAllLocal(): ActivityLog[] {
    try {
      const storage = getStorage();
      const stored = storage.getItem(LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static async fetchLogs(): Promise<ActivityLog[]> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes("placeholder")) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("activity_logs")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data) return data as ActivityLog[];
      } catch (err) {
        console.warn("Could not fetch remote activity logs, falling back to local:", err);
      }
    }
    return this.getAllLocal();
  }
}
