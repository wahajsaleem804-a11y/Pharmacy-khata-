import { describe, it, expect, beforeEach } from "vitest";
import { PharmacyService } from "./pharmacyService";
import { TransactionService } from "./transactionService";
import { ReturnService } from "./returnService";
import { ActivityService } from "./activityService";
import { calculatePharmacyAccountSummary } from "@/lib/calculations/financial";

// Mock localStorage for node environment during vitest
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, val: string) => storageMap.set(key, val),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};
Object.defineProperty(global, "localStorage", { value: localStorageMock });

describe("Phase 02 Database & Service Operations Invariant Suite", () => {
  beforeEach(() => {
    storageMap.clear();
  });

  it("creates a pharmacy with default balances and validates constraints", async () => {
    const pharmacy = await PharmacyService.create({
      name: "City Pharmacy",
      phoneNumber: "0300-1234567",
      address: "Main Market, Lahore",
      openingBalance: 1500,
      openingBalanceType: "payable",
      userId: "user-123",
    });

    expect(pharmacy.id).toBeDefined();
    expect(pharmacy.name).toBe("City Pharmacy");
    expect(pharmacy.opening_balance).toBe(1500);
    expect(pharmacy.opening_balance_type).toBe("payable");
    expect(pharmacy.deleted_at).toBeNull();

    // Verify activity log was recorded
    const logs = ActivityService.getAllLocal();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].table_name).toBe("pharmacies");
    expect(logs[0].action).toBe("CREATE");
  });

  it("rejects invalid pharmacy creation missing name or phone", async () => {
    await expect(
      PharmacyService.create({
        name: "",
        phoneNumber: "0300-1234567",
      })
    ).rejects.toThrow("Pharmacy name is required");

    await expect(
      PharmacyService.create({
        name: "Test Pharmacy",
        phoneNumber: "",
      })
    ).rejects.toThrow("Phone number is required");
  });

  it("creates a multi-item transaction and computes financial totals atomically", async () => {
    const pharmacy = await PharmacyService.create({
      name: "Al-Shifa Pharmacy",
      phoneNumber: "0321-9876543",
    });

    // Create transaction with 2 medicines:
    // Medicine 1: Panadol, qty 10, retail 100, discount 10% -> 90 * 10 = 900
    // Medicine 2: Augmentin, qty 5, retail 200, discount 15% -> 170 * 5 = 850
    // Grand Total = 1750
    const tx = await TransactionService.create({
      pharmacyId: pharmacy.id,
      type: "received",
      invoiceNumber: "INV-001",
      userId: "user-123",
      items: [
        { medicineName: "Panadol", quantity: 10, retailPrice: 100, discountPercentage: 10 },
        { medicineName: "Augmentin", quantity: 5, retailPrice: 200, discountPercentage: 15 },
      ],
    });

    expect(tx.id).toBeDefined();
    expect(tx.grand_total).toBe(1750);
    expect(tx.items).toHaveLength(2);
    expect(tx.items![0].line_total).toBe(900);
    expect(tx.items![1].line_total).toBe(850);

    // Verify activity log was recorded
    const logs = ActivityService.getAllLocal();
    const txLog = logs.find((l) => l.table_name === "transactions" && l.action === "CREATE");
    expect(txLog).toBeDefined();
  });

  it("rejects transactions with negative prices or invalid quantities", async () => {
    const pharmacy = await PharmacyService.create({
      name: "Health First",
      phoneNumber: "0333-5555555",
    });

    await expect(
      TransactionService.create({
        pharmacyId: pharmacy.id,
        type: "received",
        items: [
          { medicineName: "Invalid Price", quantity: 5, retailPrice: -50, discountPercentage: 0 },
        ],
      })
    ).rejects.toThrow("Retail price cannot be negative");

    await expect(
      TransactionService.create({
        pharmacyId: pharmacy.id,
        type: "received",
        items: [
          { medicineName: "Invalid Qty", quantity: 0, retailPrice: 100, discountPercentage: 0 },
        ],
      })
    ).rejects.toThrow("Quantity must be a positive integer");
  });

  it("processes a partial return, enforces quantity boundaries, and reverses liability", async () => {
    const pharmacy = await PharmacyService.create({
      name: "Metro Meds",
      phoneNumber: "0345-1122334",
    });

    const tx = await TransactionService.create({
      pharmacyId: pharmacy.id,
      type: "received",
      items: [
        { medicineName: "Panadol", quantity: 10, retailPrice: 100, discountPercentage: 10 },
      ],
    });

    const item = tx.items![0];
    expect(item.quantity).toBe(10);
    expect(item.returned_quantity).toBe(0);

    // Return 2 units @ discounted unit price of Rs. 90 = Rs. 180
    const returnRecord = await ReturnService.create({
      pharmacyId: pharmacy.id,
      transactionId: tx.id,
      transactionItemId: item.id,
      returnQuantity: 2,
      reason: "Near expiry exchange",
    });

    expect(returnRecord.return_quantity).toBe(2);
    expect(returnRecord.original_discounted_unit_price).toBe(90);
    expect(returnRecord.return_amount).toBe(180);

    // Verify item returned_quantity incremented
    const updatedItems = JSON.parse(storageMap.get("pharmacy_khata_transaction_items")!);
    const updatedItem = updatedItems.find((i: any) => i.id === item.id);
    expect(updatedItem.returned_quantity).toBe(2);

    // Second partial return: Return 3 more units
    const secondReturn = await ReturnService.create({
      pharmacyId: pharmacy.id,
      transactionId: tx.id,
      transactionItemId: item.id,
      returnQuantity: 3,
    });
    expect(secondReturn.return_quantity).toBe(3);
    expect(secondReturn.return_amount).toBe(270);

    // Now available returnable is 10 - 2 - 3 = 5
    // Attempting to return 6 must fail!
    await expect(
      ReturnService.create({
        pharmacyId: pharmacy.id,
        transactionId: tx.id,
        transactionItemId: item.id,
        returnQuantity: 6,
      })
    ).rejects.toThrow("cannot exceed remaining returnable quantity");
  });

  it("handles soft deletion and restoration of transactions", async () => {
    const pharmacy = await PharmacyService.create({
      name: "Care Pharmacy",
      phoneNumber: "0300-9998877",
    });

    const tx = await TransactionService.create({
      pharmacyId: pharmacy.id,
      type: "given",
      items: [{ medicineName: "Disprin", quantity: 20, retailPrice: 10, discountPercentage: 0 }],
    });

    // Soft delete
    await TransactionService.softDelete(tx.id);
    let activeTxs = await TransactionService.getAll({ includeDeleted: false });
    expect(activeTxs.find((t) => t.id === tx.id)).toBeUndefined();

    // Verify it still exists in all records
    let allTxs = await TransactionService.getAll({ includeDeleted: true });
    expect(allTxs.find((t) => t.id === tx.id)?.deleted_at).toBeTruthy();

    // Restore
    await TransactionService.restore(tx.id);
    activeTxs = await TransactionService.getAll({ includeDeleted: false });
    expect(activeTxs.find((t) => t.id === tx.id)).toBeDefined();
  });
});
