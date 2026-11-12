import { describe, it, expect } from "vitest";
import {
  calculateLineItem,
  calculateTransactionTotals,
  calculateReturnAmount,
  calculatePharmacyAccountSummary,
  validateLineItemInput,
} from "./financial";

describe("Financial Calculations Test Suite", () => {
  it("calculates exact user example: Panadol, qty: 10, retail: Rs 100, disc: 10%", () => {
    const result = calculateLineItem({
      quantity: 10,
      retailPrice: 100,
      discountPercentage: 10,
    });

    expect(result.discountAmount).toBe(10);
    expect(result.discountedUnitPrice).toBe(90);
    expect(result.lineTotal).toBe(900);
  });

  it("handles zero discount correctly", () => {
    const result = calculateLineItem({
      quantity: 5,
      retailPrice: 250,
      discountPercentage: 0,
    });

    expect(result.discountAmount).toBe(0);
    expect(result.discountedUnitPrice).toBe(250);
    expect(result.lineTotal).toBe(1250);
  });

  it("handles 100% discount correctly", () => {
    const result = calculateLineItem({
      quantity: 3,
      retailPrice: 150,
      discountPercentage: 100,
    });

    expect(result.discountAmount).toBe(150);
    expect(result.discountedUnitPrice).toBe(0);
    expect(result.lineTotal).toBe(0);
  });

  it("handles decimal fractional discounts with proper rounding", () => {
    const result = calculateLineItem({
      quantity: 7,
      retailPrice: 123.45,
      discountPercentage: 12.5,
    });

    // 123.45 * 0.125 = 15.43125 -> 15.43
    expect(result.discountAmount).toBe(15.43);
    // 123.45 - 15.43 = 108.02
    expect(result.discountedUnitPrice).toBe(108.02);
    // 7 * 108.02 = 756.14
    expect(result.lineTotal).toBe(756.14);
  });

  it("validates line item input rejecting negative values and invalid ranges", () => {
    expect(
      validateLineItemInput({ quantity: 0, retailPrice: 100, discountPercentage: 10 }).valid
    ).toBe(false);

    expect(
      validateLineItemInput({ quantity: -5, retailPrice: 100, discountPercentage: 10 }).valid
    ).toBe(false);

    expect(
      validateLineItemInput({ quantity: 1, retailPrice: -10, discountPercentage: 0 }).valid
    ).toBe(false);

    expect(
      validateLineItemInput({ quantity: 1, retailPrice: 100, discountPercentage: 105 }).valid
    ).toBe(false);

    expect(
      validateLineItemInput({ quantity: 1, retailPrice: 100, discountPercentage: -2 }).valid
    ).toBe(false);
  });

  it("calculates multiple transaction item grand totals accurately", () => {
    const item1 = calculateLineItem({ quantity: 10, retailPrice: 100, discountPercentage: 10 }); // 900
    const item2 = calculateLineItem({ quantity: 5, retailPrice: 200, discountPercentage: 15 }); // 200 - 30 = 170 * 5 = 850

    const totals = calculateTransactionTotals([item1, item2]);
    expect(totals.grandTotal).toBe(1750);
    expect(totals.subtotalAmount).toBe(2000); // 1000 + 1000
    expect(totals.discountAmount).toBe(250); // 100 + 150
  });

  it("calculates medicine return accurately per prompt example (qty: 2 @ 90 = 180)", () => {
    const ret = calculateReturnAmount(2, 90, 10);
    expect(ret.returnAmount).toBe(180);
  });

  it("rejects returns exceeding available remaining quantity", () => {
    expect(() => calculateReturnAmount(11, 90, 10)).toThrow();
  });

  it("calculates pharmacy account summary correctly reconciling received, given, returns, net balance", () => {
    // City Pharmacy:
    // Opening balance: 0
    // Received: 900 (Payable 900)
    // Returned 2 received items @ 90 = 180 (Payable reduced by 180 -> 720)
    // Given: 500 (Receivable 500)
    // Net balance = 720 - 500 = +220 (Net Payable)
    const summary = calculatePharmacyAccountSummary({
      openingBalance: 0,
      openingBalanceType: "neutral",
      transactions: [
        { type: "received", grandTotal: 900 },
        { type: "given", grandTotal: 500 },
      ],
      returns: [
        { originalTransactionType: "received", returnAmount: 180 },
      ],
    });

    expect(summary.totalReceived).toBe(900);
    expect(summary.totalGiven).toBe(500);
    expect(summary.totalReturnsOnReceived).toBe(180);
    expect(summary.totalPayable).toBe(720);
    expect(summary.totalReceivable).toBe(500);
    expect(summary.netBalance).toBe(220);
    expect(summary.status).toBe("payable");
  });

  it("calculates Net Receivable when Given exceeds Received", () => {
    const summary = calculatePharmacyAccountSummary({
      openingBalance: 0,
      openingBalanceType: "neutral",
      transactions: [
        { type: "received", grandTotal: 200 },
        { type: "given", grandTotal: 1000 },
      ],
      returns: [],
    });

    expect(summary.netBalance).toBe(-800);
    expect(summary.status).toBe("receivable");
  });

  it("accurately calculates line item with both Pack quantity and Loose units", () => {
    // 1 Pack @ 100 with 10% disc = 90
    // 5 Loose units (Pack Size 10) = 0.5 Pack @ 100 = 50 with 10% disc = 45
    // Grand line total = 90 + 45 = 135
    const result = calculateLineItem({
      quantity: 1,
      looseQuantity: 5,
      packSize: 10,
      retailPrice: 100,
      discountPercentage: 10,
    });

    expect(result.totalPacks).toBe(1.5);
    expect(result.totalUnits).toBe(15);
    expect(result.discountAmount).toBe(10);
    expect(result.lineDiscountAmount).toBe(15);
    expect(result.discountedUnitPrice).toBe(90);
    expect(result.discountedUnitPricePerUnit).toBe(9);
    expect(result.lineTotal).toBe(135);
  });

  it("calculates line item with only Loose units (0 whole packs)", () => {
    // 0 Packs, 8 loose tablets, pack size 10, retail price 200, 10% discount
    // 8 tablets = 0.8 packs. Retail = 160. Discount = 16. Total = 144
    const result = calculateLineItem({
      quantity: 0,
      looseQuantity: 8,
      packSize: 10,
      retailPrice: 200,
      discountPercentage: 10,
    });

    expect(result.totalPacks).toBe(0.8);
    expect(result.totalUnits).toBe(8);
    expect(result.lineDiscountAmount).toBe(16);
    expect(result.lineTotal).toBe(144);
  });

  it("calculates returns with loose units accurately", () => {
    // Return 1 pack + 5 loose units (pack size 10 = 15 units) @ 90 per pack (9 per unit) = 135
    const ret = calculateReturnAmount(1, 90, 2, 5, 0, 10);
    expect(ret.returnAmount).toBe(135);
  });
});
