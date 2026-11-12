import { createClient } from "@/lib/supabase/client";
import { getStorage } from "./storage";
import { ActivityService } from "./activityService";

export interface RealUser {
  id: string;
  email: string;
  fullName: string;
  pharmacyName: string;
  createdAt: string;
}

const AUTH_USER_KEY = "pharmacy_khata_auth_user";

export class AuthService {
  /**
   * Get the currently logged-in real user.
   */
  static async getCurrentUser(): Promise<RealUser | null> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes("placeholder")) {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          return {
            id: user.id,
            email: user.email || "",
            fullName: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Pharmacy User",
            pharmacyName: profile?.pharmacy_business_name || "My Pharmacy",
            createdAt: user.created_at || new Date().toISOString(),
          };
        }
      } catch (err) {
        console.warn("Supabase user check error:", err);
      }
    }

    // Check local real session storage
    try {
      const storage = getStorage();
      const raw = storage.getItem(AUTH_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /**
   * Sign In with real email & password.
   */
  static async signIn(email: string, password: string): Promise<RealUser> {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      throw new Error("Email and password are required.");
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes("placeholder")) {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (error) throw error;
      if (!data.user) throw new Error("No user returned from authentication.");

      const realUser: RealUser = {
        id: data.user.id,
        email: data.user.email || trimmedEmail,
        fullName: data.user.user_metadata?.full_name || "Pharmacy Owner",
        pharmacyName: "Pharmacy Store",
        createdAt: data.user.created_at || new Date().toISOString(),
      };

      this.saveLocalUser(realUser);
      await ActivityService.log({
        userId: realUser.id,
        action: "LOGIN",
        tableName: "user_profiles",
        recordId: realUser.id,
        description: `Real user signed in: ${trimmedEmail}`,
      });

      return realUser;
    }

    // Real local credentials verification
    const storage = getStorage();
    const storedUsersRaw = storage.getItem("pharmacy_khata_registered_accounts");
    const registeredUsers: Array<{ email: string; passwordHash: string; user: RealUser }> = storedUsersRaw
      ? JSON.parse(storedUsersRaw)
      : [];

    const matched = registeredUsers.find((u) => u.email === trimmedEmail);
    if (!matched) {
      throw new Error("No account found with this email. Please click 'Create Account' to sign up.");
    }
    if (matched.passwordHash !== password) {
      throw new Error("Incorrect password. Please try again.");
    }

    this.saveLocalUser(matched.user);
    await ActivityService.log({
      userId: matched.user.id,
      action: "LOGIN",
      tableName: "user_profiles",
      recordId: matched.user.id,
      description: `User signed in: ${trimmedEmail}`,
    });

    return matched.user;
  }

  /**
   * Sign Up a new real pharmacy account.
   */
  static async signUp(params: {
    email: string;
    password: string;
    fullName: string;
    pharmacyName: string;
  }): Promise<RealUser> {
    const trimmedEmail = params.email.trim().toLowerCase();
    if (!trimmedEmail || !params.password) {
      throw new Error("Email and password are required.");
    }
    if (params.password.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }
    if (!params.fullName.trim()) {
      throw new Error("Full name is required.");
    }
    if (!params.pharmacyName.trim()) {
      throw new Error("Pharmacy business name is required.");
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes("placeholder")) {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: params.password,
        options: {
          data: {
            full_name: params.fullName.trim(),
            pharmacy_business_name: params.pharmacyName.trim(),
          },
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error("Could not create user account.");

      const realUser: RealUser = {
        id: data.user.id,
        email: data.user.email || trimmedEmail,
        fullName: params.fullName.trim(),
        pharmacyName: params.pharmacyName.trim(),
        createdAt: data.user.created_at || new Date().toISOString(),
      };

      this.saveLocalUser(realUser);
      await ActivityService.log({
        userId: realUser.id,
        action: "CREATE",
        tableName: "user_profiles",
        recordId: realUser.id,
        description: `Created new real user account: ${trimmedEmail} (${params.pharmacyName})`,
      });

      return realUser;
    }

    const storage = getStorage();
    const storedUsersRaw = storage.getItem("pharmacy_khata_registered_accounts");
    const registeredUsers: Array<{ email: string; passwordHash: string; user: RealUser }> = storedUsersRaw
      ? JSON.parse(storedUsersRaw)
      : [];

    if (registeredUsers.some((u) => u.email === trimmedEmail)) {
      throw new Error("An account with this email already exists. Please Sign In.");
    }

    const realUser: RealUser = {
      id: crypto.randomUUID ? crypto.randomUUID() : `usr_${Date.now()}`,
      email: trimmedEmail,
      fullName: params.fullName.trim(),
      pharmacyName: params.pharmacyName.trim(),
      createdAt: new Date().toISOString(),
    };

    registeredUsers.push({
      email: trimmedEmail,
      passwordHash: params.password,
      user: realUser,
    });
    storage.setItem("pharmacy_khata_registered_accounts", JSON.stringify(registeredUsers));

    this.saveLocalUser(realUser);
    await ActivityService.log({
      userId: realUser.id,
      action: "CREATE",
      tableName: "user_profiles",
      recordId: realUser.id,
      description: `Registered new pharmacy account: ${trimmedEmail} (${params.pharmacyName})`,
    });

    return realUser;
  }

  /**
   * Real user sign out.
   */
  static async signOut(): Promise<void> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes("placeholder")) {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch (err) {
        console.error("Supabase sign out error:", err);
      }
    }

    try {
      const storage = getStorage();
      storage.removeItem(AUTH_USER_KEY);
    } catch (err) {
      console.error("Storage sign out error:", err);
    }
  }

  private static saveLocalUser(user: RealUser): void {
    try {
      const storage = getStorage();
      storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } catch (err) {
      console.error("Error saving user:", err);
    }
  }
}
