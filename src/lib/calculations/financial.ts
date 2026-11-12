/**
 * Financial Calculation Module
 * Provides precision-accurate arithmetic avoiding floating point rounding errors.
 */

/**
 * Rounds a number to exactly two decimal places using standard Half-Up rounding.
 */
export function roundToTwoDecimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export interface LineItemInput {
  quantity: number; // Pack quantity (>= 0)
  looseQuantity?: number; // Loose units (>= 0, default 0)
  packSize?: number; // Units in one pack (> 0, default 1)
  retailPrice: number; // Retail price per pack (>= 0)
  discountPercentage: number;
}

export interface LineItemCalculated {
  quantity: number;
  looseQuantity: number;
  packSize: number;
  totalPacks: number;
  totalUnits: number;
  retailPrice: number;
  discountPercentage: number;
  discountAmount: number; // Discount amount per pack (matches classic API)
  lineDiscountAmount: number; // Total discount across all packs + loose units
  discountedUnitPrice: number;
  discountedUnitPricePerUnit: number;
  lineTotal: number;
}

/**
 * Validates line item inputs.
 */
export function validateLineItemInput(input: LineItemInput): { valid: boolean; error?: string } {
  const loose = input.looseQuantity ?? 0;
  const packSize = input.packSize ?? 1;

  if (!Number.isInteger(input.quantity) || input.quantity < 0) {
    return { valid: false, error: "Quantity must be a positive integer greater than zero." };
  }
  if (!Number.isInteger(loose) || loose < 0) {
    return { valid: false, error: "Loose quantity must be an integer greater than or equal to zero." };
  }
  if (input.quantity === 0 && loose === 0) {
    return { valid: false, error: "Quantity must be a positive integer greater than zero." };
  }
  if (!Number.isInteger(packSize) || packSize <= 0) {
    return { valid: false, error: "Pack size must be a positive integer greater than zero." };
  }
  if (typeof input.retailPrice !== "number" || isNaN(input.retailPrice) || input.retailPrice < 0) {
    return { valid: false, error: "Retail price cannot be negative." };
  }
  if (
    typeof input.discountPercentage !== "number" ||
    isNaN(input.discountPercentage) ||
    input.discountPercentage < 0 ||
    input.discountPercentage > 100
  ) {
    return { valid: false, error: "Discount percentage must be between 0 and 100." };
  }
  return { valid: true };
}

/**
 * Calculates discount amount, discounted unit price, and line total for a medicine row.
 * Accurately supports both Pack quantity and Loose units (loose / khula quantity).
 */
export function calculateLineItem(input: LineItemInput): LineItemCalculated {
  const validation = validateLineItemInput(input);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const { quantity, retailPrice, discountPercentage } = input;
  const looseQuantity = input.looseQuantity ?? 0;
  const packSize = input.packSize && input.packSize > 0 ? input.packSize : 1;

  const totalUnits = (quantity * packSize) + looseQuantity;
  const totalPacks = roundToTwoDecimals(quantity + (looseQuantity / packSize));

  const discountAmount = roundToTwoDecimals(retailPrice * (discountPercentage / 100));
  const discountedUnitPrice = roundToTwoDecimals(retailPrice - discountAmount);
  const discountedUnitPricePerUnit = roundToTwoDecimals(discountedUnitPrice / packSize);

  const undiscountedTotal = roundToTwoDecimals(
    (quantity * retailPrice) + (looseQuantity * (retailPrice / packSize))
  );
  const lineDiscountAmount = roundToTwoDecimals(
    (quantity * discountAmount) + (looseQuantity * (discountAmount / packSize))
  );
  const lineTotal = roundToTwoDecimals(undiscountedTotal - lineDiscountAmount);

  return {
    quantity,
    looseQuantity,
    packSize,
    totalPacks,
    totalUnits,
    retailPrice: roundToTwoDecimals(retailPrice),
    discountPercentage: roundToTwoDecimals(discountPercentage),
    discountAmount,
    lineDiscountAmount,
    discountedUnitPrice,
    discountedUnitPricePerUnit,
    lineTotal,
  };
}

/**
 * Computes transaction aggregates from line items.
 */
export function calculateTransactionTotals(items: LineItemCalculated[]): {
  subtotalAmount: number;
  discountAmount: number;
  grandTotal: number;
} {
  let subtotalAmount = 0;
  let discountAmount = 0;
  let grandTotal = 0;

  for (const item of items) {
    const packSize = item.packSize > 0 ? item.packSize : 1;
    const undiscountedTotal = roundToTwoDecimals(
      (item.quantity * item.retailPrice) + (item.looseQuantity * (item.retailPrice / packSize))
    );
    subtotalAmount = roundToTwoDecimals(subtotalAmount + undiscountedTotal);
    discountAmount = roundToTwoDecimals(discountAmount + item.lineDiscountAmount);
    grandTotal = roundToTwoDecimals(grandTotal + item.lineTotal);
  }

  return {
    subtotalAmount,
    discountAmount,
    grandTotal,
  };
}

/**
 * Return calculation supporting both pack and loose quantities.
 */
export function calculateReturnAmount(
  returnQuantity: number,
  originalDiscountedUnitPrice: number,
  maxAvailableQuantity: number,
  returnLooseQuantity: number = 0,
  maxAvailableLooseQuantity: number = 0,
  packSize: number = 1
): { returnAmount: number } {
  if (!Number.isInteger(returnQuantity) || returnQuantity < 0) {
    throw new Error("Return quantity must be an integer greater than or equal to zero.");
  }
  if (!Number.isInteger(returnLooseQuantity) || returnLooseQuantity < 0) {
    throw new Error("Return loose quantity must be an integer greater than or equal to zero.");
  }
  if (returnQuantity === 0 && returnLooseQuantity === 0) {
    throw new Error("Return quantity must be greater than zero.");
  }

  const effectivePackSize = packSize > 0 ? packSize : 1;
  const totalReturnUnits = (returnQuantity * effectivePackSize) + returnLooseQuantity;
  const totalAvailableUnits = (maxAvailableQuantity * effectivePackSize) + maxAvailableLooseQuantity;

  if (totalReturnUnits > totalAvailableUnits) {
    throw new Error(
      `Return quantity (${totalReturnUnits} units) cannot exceed remaining returnable quantity (${totalAvailableUnits} units).`
    );
  }
  if (originalDiscountedUnitPrice < 0) {
    throw new Error("Original discounted unit price cannot be negative.");
  }

  const unitPrice = originalDiscountedUnitPrice / effectivePackSize;
  const returnAmount = roundToTwoDecimals(totalReturnUnits * unitPrice);
  return { returnAmount };
}

/**
 * Account Balance Calculation
 * Accounting rules:
 * - Medicine Received = Payable (increases payable)
 * - Medicine Given = Receivable (increases receivable)
 * - Return of Received Medicine = Reduces Payable
 * - Return of Given Medicine = Reduces Receivable
 * - Net Balance = Payable - Receivable
 *   - If Net Balance > 0 -> Net Payable (User owes pharmacy)
 *   - If Net Balance < 0 -> Net Receivable (Pharmacy owes user)
 */
export interface AccountSummary {
  openingBalance: number;
  totalReceived: number;
  totalGiven: number;
  totalReturnsOnReceived: number;
  totalReturnsOnGiven: number;
  totalPayable: number;
  totalReceivable: number;
  netBalance: number;
  status: "payable" | "receivable" | "settled";
}

export function calculatePharmacyAccountSummary(params: {
  openingBalance: number;
  openingBalanceType: "payable" | "receivable" | "neutral";
  transactions: Array<{ type: "received" | "given"; grandTotal: number; deletedAt?: string | null }>;
  returns: Array<{ originalTransactionType: "received" | "given"; returnAmount: number; deletedAt?: string | null }>;
}): AccountSummary {
  let initialPayable = 0;
  let initialReceivable = 0;

  if (params.openingBalanceType === "payable") {
    initialPayable = params.openingBalance;
  } else if (params.openingBalanceType === "receivable") {
    initialReceivable = params.openingBalance;
  }

  let totalReceived = 0;
  let totalGiven = 0;

  for (const tx of params.transactions) {
    if (tx.deletedAt) continue;
    if (tx.type === "received") {
      totalReceived = roundToTwoDecimals(totalReceived + tx.grandTotal);
    } else if (tx.type === "given") {
      totalGiven = roundToTwoDecimals(totalGiven + tx.grandTotal);
    }
  }

  let totalReturnsOnReceived = 0;
  let totalReturnsOnGiven = 0;

  for (const ret of params.returns) {
    if (ret.deletedAt) continue;
    if (ret.originalTransactionType === "received") {
      totalReturnsOnReceived = roundToTwoDecimals(totalReturnsOnReceived + ret.returnAmount);
    } else if (ret.originalTransactionType === "given") {
      totalReturnsOnGiven = roundToTwoDecimals(totalReturnsOnGiven + ret.returnAmount);
    }
  }

  // Net payable = initial payable + received - return of received
  const totalPayable = roundToTwoDecimals(
    Math.max(0, initialPayable + totalReceived - totalReturnsOnReceived)
  );

  // Net receivable = initial receivable + given - return of given
  const totalReceivable = roundToTwoDecimals(
    Math.max(0, initialReceivable + totalGiven - totalReturnsOnGiven)
  );

  // Net Balance = (initialPayable + totalReceived - totalReturnsOnReceived) - (initialReceivable + totalGiven - totalReturnsOnGiven)
  const netBalance = roundToTwoDecimals(
    initialPayable + totalReceived - totalReturnsOnReceived - (initialReceivable + totalGiven - totalReturnsOnGiven)
  );

  let status: "payable" | "receivable" | "settled" = "settled";
  if (netBalance > 0) {
    status = "payable";
  } else if (netBalance < 0) {
    status = "receivable";
  }

  return {
    openingBalance: params.openingBalance,
    totalReceived,
    totalGiven,
    totalReturnsOnReceived,
    totalReturnsOnGiven,
    totalPayable,
    totalReceivable,
    netBalance,
    status,
  };
}
