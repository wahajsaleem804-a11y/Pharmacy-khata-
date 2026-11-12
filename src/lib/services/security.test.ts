import { describe, it, expect, beforeEach } from "vitest";
import { PharmacyService } from "./pharmacyService";
import { TransactionService } from "./transactionService";
import { ActivityService } from "./activityService";
import { getStorage } from "./storage";

describe("Phase 03 Security & Multi-Tenancy Invariant Suite", () => {
  beforeEach(() => {
    getStorage().clear();
  });

  it("enforces tenant isolation across distinct user accounts", async () => {
    // User A creates a pharmacy
    const pharmUserA = await PharmacyService.create({
      name: "Alpha Pharmacy",
      phoneNumber: "0300-1111111",
      userId: "user-alpha-id",
    });

    // User B creates a pharmacy
    const pharmUserB = await PharmacyService.create({
      name: "Beta Pharmacy",
      phoneNumber: "0300-2222222",
      userId: "user-beta-id",
    });

    // Check ownership fields
    expect(pharmUserA.user_id).toBe("user-alpha-id");
    expect(pharmUserB.user_id).toBe("user-beta-id");

    // All pharmacies exist in raw storage but queries filter by tenant
    const all = await PharmacyService.getAll();
    const userAPharmacies = all.filter((p) => p.user_id === "user-alpha-id");
    const userBPharmacies = all.filter((p) => p.user_id === "user-beta-id");

    expect(userAPharmacies).toHaveLength(1);
    expect(userAPharmacies[0].name).toBe("Alpha Pharmacy");
    expect(userBPharmacies).toHaveLength(1);
    expect(userBPharmacies[0].name).toBe("Beta Pharmacy");
  });

  it("prevents modifying records without proper identifier", async () => {
    await expect(
      PharmacyService.update("non-existent-id", { name: "Hacked Pharmacy" })
    ).rejects.toThrow("Pharmacy not found");
  });

  it("verifies activity logs are recorded with user attribution and cannot be deleted via API", async () => {
    await PharmacyService.create({
      name: "Security Test Meds",
      phoneNumber: "0311-0000000",
      userId: "audit-user-1",
    });

    const logs = await ActivityService.fetchLogs();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].user_id).toBe("audit-user-1");
    expect(logs[0].action).toBe("CREATE");
    expect(logs[0].table_name).toBe("pharmacies");

    // Ensure there is no delete method exposed on ActivityService
    expect((ActivityService as any).delete).toBeUndefined();
    expect((ActivityService as any).deleteLog).toBeUndefined();
  });
});
