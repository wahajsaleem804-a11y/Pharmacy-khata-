"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";
import { formatCurrency } from "@/lib/utils";
import { Pharmacy, TransactionType } from "@/types/database.types";
import { PharmacyService } from "@/lib/services/pharmacyService";
import { TransactionService, TransactionItemInput } from "@/lib/services/transactionService";
import { calculateLineItem, calculateTransactionTotals } from "@/lib/calculations/financial";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Receipt,
  Calendar,
  Building2,
  FileText,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface ItemRow {
  id: string;
  medicineName: string;
  quantity: string; // Pack quantity
  looseQuantity: string; // Loose units (tablets/strips)
  packSize: string; // Units per pack (e.g. 10)
  retailPrice: string; // Retail price per pack
  discountPercentage: string;
}

export default function NewTransactionPage() {
  const router = useRouter();
  const { t, isRtl } = useLanguage();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Fields
  const [pharmacyId, setPharmacyId] = useState("");
  const [type, setType] = useState<TransactionType>("received");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Line items state
  const [rows, setRows] = useState<ItemRow[]>([
    {
      id: "row_1",
      medicineName: "",
      quantity: "1",
      looseQuantity: "0",
      packSize: "10",
      retailPrice: "100",
      discountPercentage: "10",
    },
  ]);

  useEffect(() => {
    const fetchPharmacies = async () => {
      setLoading(true);
      try {
        const data = await PharmacyService.getAll();
        setPharmacies(data);
        if (data.length > 0) {
          setPharmacyId(data[0].id);
        }
      } catch (err) {
        console.error("Error fetching pharmacies:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPharmacies();
  }, []);

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `row_${Date.now()}_${Math.random()}`,
        medicineName: "",
        quantity: "1",
        looseQuantity: "0",
        packSize: "10",
        retailPrice: "100",
        discountPercentage: "0",
      },
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length === 1) {
      setErrorMessage("At least one medicine item is required.");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, field: keyof ItemRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // Compute calculated line rows and grand totals live
  const calculatedRows = rows.map((r) => {
    const qty = parseInt(r.quantity, 10) || 0;
    const loose = parseInt(r.looseQuantity, 10) || 0;
    const packSize = parseInt(r.packSize, 10) || 1;
    const price = parseFloat(r.retailPrice) || 0;
    const disc = parseFloat(r.discountPercentage) || 0;

    let discountAmount = 0;
    let lineDiscountAmount = 0;
    let discountedUnitPrice = price;
    let discountedUnitPricePerUnit = price / packSize;
    let lineTotal = 0;
    let totalPacks = qty + (loose / packSize);
    let totalUnits = (qty * packSize) + loose;

    if ((qty > 0 || loose > 0) && price >= 0 && disc >= 0 && disc <= 100) {
      try {
        const calc = calculateLineItem({
          quantity: qty,
          looseQuantity: loose,
          packSize: packSize,
          retailPrice: price,
          discountPercentage: disc,
        });
        discountAmount = calc.discountAmount;
        lineDiscountAmount = calc.lineDiscountAmount;
        discountedUnitPrice = calc.discountedUnitPrice;
        discountedUnitPricePerUnit = calc.discountedUnitPricePerUnit;
        lineTotal = calc.lineTotal;
        totalPacks = calc.totalPacks;
        totalUnits = calc.totalUnits;
      } catch {
        // Handled silently for live preview
      }
    }

    return {
      ...r,
      qty,
      loose,
      packSize,
      price,
      disc,
      totalPacks,
      totalUnits,
      discountAmount,
      lineDiscountAmount,
      discountedUnitPrice,
      discountedUnitPricePerUnit,
      lineTotal,
    };
  });

  const totals = calculateTransactionTotals(
    calculatedRows.map((cr) => {
      const pSize = cr.packSize > 0 ? cr.packSize : 1;
      return {
        quantity: cr.qty,
        looseQuantity: cr.loose,
        packSize: pSize,
        totalPacks: cr.totalPacks,
        totalUnits: cr.totalUnits,
        retailPrice: cr.price,
        discountPercentage: cr.disc,
        discountAmount: cr.discountAmount,
        lineDiscountAmount: cr.lineDiscountAmount,
        discountedUnitPrice: cr.discountedUnitPrice,
        discountedUnitPricePerUnit: cr.discountedUnitPricePerUnit,
        lineTotal: cr.lineTotal,
      };
    })
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (!pharmacyId) {
        throw new Error("Please select a pharmacy.");
      }

      // Validate all rows
      const itemsToSubmit: TransactionItemInput[] = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!r.medicineName.trim()) {
          throw new Error(`Row #${i + 1}: Medicine name is required.`);
        }
        const qty = parseInt(r.quantity, 10) || 0;
        const loose = parseInt(r.looseQuantity, 10) || 0;
        const packSize = parseInt(r.packSize, 10) || 1;
        if (qty < 0 || loose < 0 || (qty === 0 && loose === 0)) {
          throw new Error(`Row #${i + 1} (${r.medicineName}): Pack quantity or loose quantity must be greater than zero.`);
        }
        if (packSize <= 0) {
          throw new Error(`Row #${i + 1} (${r.medicineName}): Pack size must be greater than zero.`);
        }
        const price = parseFloat(r.retailPrice);
        if (isNaN(price) || price < 0) {
          throw new Error(`Row #${i + 1} (${r.medicineName}): Retail price cannot be negative.`);
        }
        const disc = parseFloat(r.discountPercentage);
        if (isNaN(disc) || disc < 0 || disc > 100) {
          throw new Error(`Row #${i + 1} (${r.medicineName}): Discount percentage must be between 0 and 100.`);
        }

        itemsToSubmit.push({
          medicineName: r.medicineName.trim(),
          quantity: qty,
          looseQuantity: loose,
          packSize: packSize,
          retailPrice: price,
          discountPercentage: disc,
        });
      }

      await TransactionService.create({
        pharmacyId,
        type,
        transactionDate,
        invoiceNumber,
        notes,
        items: itemsToSubmit,
      });

      setSuccessMessage(t.transactions.saveSuccess);
      setTimeout(() => {
        router.push("/transactions");
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to record transaction.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in-50 duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/transactions">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Receipt className="w-6 h-6 text-primary" />
              <span>{t.transactions.newTitle}</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Record medicines received or given with precision itemized discounts.
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-xl border border-destructive/20 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-sm rounded-xl border border-emerald-200 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Transaction Header Card */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pharmacy Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                {t.transactions.pharmacy} *
              </label>
              {pharmacies.length === 0 ? (
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  No pharmacies available.{" "}
                  <Link href="/pharmacies" className="underline font-semibold">
                    Add a pharmacy first
                  </Link>
                </div>
              ) : (
                <select
                  required
                  value={pharmacyId}
                  onChange={(e) => setPharmacyId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {pharmacies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.phone_number})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Transaction Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {t.transactions.type} *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType("received")}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                    type === "received"
                      ? "border-amber-400 bg-amber-50 text-amber-900 font-bold dark:bg-amber-950/40 dark:text-amber-200"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  &darr; {t.transactions.received}
                </button>
                <button
                  type="button"
                  onClick={() => setType("given")}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                    type === "given"
                      ? "border-blue-400 bg-blue-50 text-blue-900 font-bold dark:bg-blue-950/40 dark:text-blue-200"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  &uarr; {t.transactions.given}
                </button>
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {t.common.date} *
              </label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                {t.transactions.invoiceNumber}
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-10492"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {t.common.notes}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Exchange note / terms..."
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Medicine Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-secondary/30 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Medicine Line Items ({rows.length})
            </h2>
            <Button
              type="button"
              onClick={addRow}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.transactions.addMedicine}</span>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/60 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border">
                <tr>
                  <th className="py-2.5 px-2.5 w-8">#</th>
                  <th className="py-2.5 px-2.5 min-w-[170px]">{t.transactions.medicineName} *</th>
                  <th className="py-2.5 px-2.5 w-20">{t.transactions.packQuantity}</th>
                  <th className="py-2.5 px-2.5 w-20">{t.transactions.looseQuantity}</th>
                  <th className="py-2.5 px-2.5 w-20">{t.transactions.packSize}</th>
                  <th className="py-2.5 px-2.5 w-28">{t.transactions.retailPrice} *</th>
                  <th className="py-2.5 px-2.5 w-20">{t.transactions.discountPercent}</th>
                  <th className="py-2.5 px-2.5 w-24 text-right">{t.transactions.discountAmount}</th>
                  <th className="py-2.5 px-2.5 w-24 text-right">{t.transactions.finalPrice}</th>
                  <th className="py-2.5 px-2.5 w-28 text-right">{t.transactions.lineTotal}</th>
                  <th className="py-2.5 px-2.5 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {calculatedRows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-2.5 px-2.5 text-xs text-muted-foreground font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-2.5">
                      <input
                        type="text"
                        required
                        value={row.medicineName}
                        onChange={(e) => updateRow(row.id, "medicineName", e.target.value)}
                        placeholder="e.g. Panadol 500mg"
                        className="w-full px-2.5 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                    <td className="py-2.5 px-2.5">
                      <input
                        type="number"
                        min="0"
                        value={row.quantity}
                        onChange={(e) => updateRow(row.id, "quantity", e.target.value)}
                        placeholder="0"
                        title={t.transactions.packQuantity}
                        className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-2.5">
                      <input
                        type="number"
                        min="0"
                        value={row.looseQuantity}
                        onChange={(e) => updateRow(row.id, "looseQuantity", e.target.value)}
                        placeholder="0"
                        title={t.transactions.looseQuantity}
                        className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary font-mono text-amber-700 dark:text-amber-300 font-medium"
                      />
                    </td>
                    <td className="py-2.5 px-2.5">
                      <input
                        type="number"
                        min="1"
                        value={row.packSize}
                        onChange={(e) => updateRow(row.id, "packSize", e.target.value)}
                        placeholder="10"
                        title="Units per Pack (e.g. 10 tablets/box)"
                        className="w-full px-2 py-1.5 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary font-mono text-muted-foreground"
                      />
                    </td>
                    <td className="py-2.5 px-2.5">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={row.retailPrice}
                        onChange={(e) => updateRow(row.id, "retailPrice", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                    <td className="py-2.5 px-2.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={row.discountPercentage}
                        onChange={(e) => updateRow(row.id, "discountPercentage", e.target.value)}
                        className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-xs text-muted-foreground">
                      {formatCurrency(row.lineDiscountAmount)}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-xs font-semibold text-foreground">
                      {formatCurrency(row.discountedUnitPrice)}
                      {row.loose > 0 && (
                        <div className="text-[10px] text-muted-foreground font-normal">
                          {formatCurrency(row.discountedUnitPricePerUnit)}/unit
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-bold text-foreground">
                      <div>{formatCurrency(row.lineTotal)}</div>
                      {row.loose > 0 && (
                        <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-normal">
                          {row.totalPacks} pk ({row.totalUnits} u)
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive rounded-md transition-colors"
                        title={t.transactions.removeMedicine}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Grand Totals Summary Footer */}
          <div className="p-4 bg-secondary/40 border-t border-border flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4">
            <Button
              type="button"
              onClick={addRow}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.transactions.addMedicine}</span>
            </Button>

            <div className="space-y-1 text-right text-xs">
              <div className="flex justify-between gap-8 text-muted-foreground">
                <span>{t.transactions.subtotal}:</span>
                <span className="font-mono font-medium">{formatCurrency(totals.subtotalAmount)}</span>
              </div>
              <div className="flex justify-between gap-8 text-amber-600 dark:text-amber-400">
                <span>Total Discount:</span>
                <span className="font-mono font-medium">- {formatCurrency(totals.discountAmount)}</span>
              </div>
              <div className="flex justify-between gap-8 text-base font-bold text-foreground pt-1 border-t border-border">
                <span>{t.transactions.grandTotal}:</span>
                <span className="text-primary font-bold">{formatCurrency(totals.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/transactions">
            <Button type="button" variant="outline">
              {t.common.cancel}
            </Button>
          </Link>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={pharmacies.length === 0}
            className="px-6"
          >
            {t.common.save} {t.transactions.title}
          </Button>
        </div>
      </form>
    </div>
  );
}
