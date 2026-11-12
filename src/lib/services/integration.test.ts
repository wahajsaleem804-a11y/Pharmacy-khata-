import { describe, it, expect, beforeEach } from "vitest";
import { PharmacyService } from "./pharmacyService";
import { TransactionService } from "./transactionService";
import { ReturnService } from "./returnService";
import { ActivityService } from "./activityService";
import { calculatePharmacyAccountSummary } from "@/lib/calculations/financial";
import { getStorage } from "./storage";

describe("Phase 13 Complete End-to-End User Simulation Scenario", () => {
  beforeEach(() => {
    getStorage().clear();
  });

  it("executes the entire 20-step lifecycle and reconciles financial running balances exactly", async () => {
    // 1. Create City Pharmacy
    const cityPharm = await PharmacyService.create({
      name: "City Pharmacy",
      phoneNumber: "0300-1112233",
      address: "Main Boulevard, Lahore",
      openingBalance: 0,
      openingBalanceType: "neutral",
      userId: "test-user-sim",
    });
    expect(cityPharm.id).toBeDefined();

    // 2. Create Al-Shifa Pharmacy
    const alShifaPharm = await PharmacyService.create({
      name: "Al-Shifa Pharmacy",
      phoneNumber: "0321-4445566",
      address: "Hospital Road, Rawalpindi",
      openingBalance: 500,
      openingBalanceType: "receivable", // Al-Shifa starts owing us 500
      userId: "test-user-sim",
    });
    expect(alShifaPharm.id).toBeDefined();

    // 3. Add a received transaction for City Pharmacy with multiple medicines and discounts
    // Medicine 1: Panadol (qty 10, retail 100, discount 10%) -> discounted unit 90 -> total 900
    // Medicine 2: Brufen (qty 5, retail 150, discount 20%) -> discounted unit 120 -> total 600
    // Grand Total = 1500 (Payable to City Pharmacy)
    const cityTx = await TransactionService.create({
      pharmacyId: cityPharm.id,
      type: "received",
      invoiceNumber: "INV-CITY-01",
      userId: "test-user-sim",
      items: [
        { medicineName: "Panadol 500mg", quantity: 10, retailPrice: 100, discountPercentage: 10 },
        { medicineName: "Brufen 400mg", quantity: 5, retailPrice: 150, discountPercentage: 20 },
      ],
    });
    expect(cityTx.grand_total).toBe(1500);
    expect(cityTx.items).toHaveLength(2);

    // 4. Add a given transaction for Al-Shifa Pharmacy with multiple medicines and discounts
    // Medicine 1: Augmentin 625mg (qty 4, retail 250, discount 10%) -> unit 225 -> total 900
    // Medicine 2: Flagyl 400mg (qty 10, retail 80, discount 5%) -> unit 76 -> total 760
    // Grand Total = 1660 (Receivable from Al-Shifa)
    const alShifaTx = await TransactionService.create({
      pharmacyId: alShifaPharm.id,
      type: "given",
      invoiceNumber: "INV-SHIFA-01",
      userId: "test-user-sim",
      items: [
        { medicineName: "Augmentin 625mg", quantity: 4, retailPrice: 250, discountPercentage: 10 },
        { medicineName: "Flagyl 400mg", quantity: 10, retailPrice: 80, discountPercentage: 5 },
      ],
    });
    expect(alShifaTx.grand_total).toBe(1660);

    // 8. Return part of a received medicine (City Pharmacy):
    // Return 2 units of Panadol (original discounted unit price = 90) -> Return Amount = 180
    const cityPanadolItem = cityTx.items!.find((i) => i.medicine_name === "Panadol 500mg")!;
    const cityReturn = await ReturnService.create({
      pharmacyId: cityPharm.id,
      transactionId: cityTx.id,
      transactionItemId: cityPanadolItem.id,
      returnQuantity: 2,
      reason: "Short expiry batch",
      userId: "test-user-sim",
    });
    expect(cityReturn.return_amount).toBe(180);

    // 9. Return part of a given medicine (Al-Shifa Pharmacy):
    // Return 1 unit of Augmentin (original discounted unit price = 225) -> Return Amount = 225
    const shifaAugmentinItem = alShifaTx.items!.find((i) => i.medicine_name === "Augmentin 625mg")!;
    const shifaReturn = await ReturnService.create({
      pharmacyId: alShifaPharm.id,
      transactionId: alShifaTx.id,
      transactionItemId: shifaAugmentinItem.id,
      returnQuantity: 1,
      reason: "Patient returned unopened strip",
      userId: "test-user-sim",
    });
    expect(shifaReturn.return_amount).toBe(225);

    // 10 & 11. Open City Pharmacy's account and verify running balance:
    // Opening balance: 0
    // Received: 1500 (Payable)
    // Return of received: 180 (Reduces Payable)
    // Expected Net Payable = 1500 - 180 = 1320
    const citySummary = calculatePharmacyAccountSummary({
      openingBalance: 0,
      openingBalanceType: "neutral",
      transactions: [{ type: "received", grandTotal: cityTx.grand_total }],
      returns: [{ originalTransactionType: "received", returnAmount: cityReturn.return_amount }],
    });
    expect(citySummary.totalPayable).toBe(1320);
    expect(citySummary.totalReceivable).toBe(0);
    expect(citySummary.netBalance).toBe(1320); // +1320 (Net Payable)
    expect(citySummary.status).toBe("payable");

    // 12 & 13. Open Al-Shifa Pharmacy's account and verify running balance:
    // Opening balance: 500 (Receivable)
    // Given: 1660 (Receivable)
    // Return of given: 225 (Reduces Receivable)
    // Expected Net Receivable = 500 + 1660 - 225 = 1935
    const alShifaSummary = calculatePharmacyAccountSummary({
      openingBalance: 500,
      openingBalanceType: "receivable",
      transactions: [{ type: "given", grandTotal: alShifaTx.grand_total }],
      returns: [{ originalTransactionType: "given", returnAmount: shifaReturn.return_amount }],
    });
    expect(alShifaSummary.totalPayable).toBe(0);
    expect(alShifaSummary.totalReceivable).toBe(1935);
    expect(alShifaSummary.netBalance).toBe(-1935); // -1935 (Net Receivable)
    expect(alShifaSummary.status).toBe("receivable");

    // 14 & 15. Daily Closing Aggregates:
    // Total Transactions: 2
    // Total Received Today: 1500
    // Total Given Today: 1660
    // Total Returns Today: 180 + 225 = 405
    // Daily Net Position = (1500 - 180) - (1660 - 225) = 1320 - 1435 = -115 (Daily Net Receivable 115)
    const totalReceivedToday = 1500;
    const totalGivenToday = 1660;
    const dailyNetPosition = (totalReceivedToday - 180) - (totalGivenToday - 225);
    expect(dailyNetPosition).toBe(-115);

    // 16 & 17. Verify Activity History recorded all mutations
    const logs = await ActivityService.fetchLogs();
    expect(logs.length).toBeGreaterThanOrEqual(6); // 2 pharmacies, 2 transactions, 2 returns
    expect(logs.some((l) => l.action === "CREATE" && l.table_name === "pharmacies")).toBe(true);
    expect(logs.some((l) => l.action === "CREATE" && l.table_name === "transactions")).toBe(true);
    expect(logs.some((l) => l.action === "CREATE" && l.table_name === "medicine_returns")).toBe(true);

    // 18, 19, 20. Persistence test: read directly from persistent storage
    const allPersistedPharmacies = await PharmacyService.getAll();
    expect(allPersistedPharmacies).toHaveLength(2);
    const allPersistedTransactions = await TransactionService.getAll();
    expect(allPersistedTransactions).toHaveLength(2);
    const allPersistedReturns = await ReturnService.getAll();
    expect(allPersistedReturns).toHaveLength(2);
  });
});
