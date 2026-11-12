"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";
import { formatCurrency, formatDate } from "@/lib/utils";
import { MedicineReturn, Pharmacy, Transaction, TransactionItem } from "@/types/database.types";
import { ReturnService } from "@/lib/services/returnService";
import { PharmacyService } from "@/lib/services/pharmacyService";
import { TransactionService } from "@/lib/services/transactionService";
import { calculateReturnAmount } from "@/lib/calculations/financial";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  RotateCcw,
  Plus,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle,
  FileText,
  Search,
} from "lucide-react";

export default function ReturnsPage() {
  const { t, isRtl } = useLanguage();
  const [returns, setReturns] = useState<MedicineReturn[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // New Return Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState("");
  const [selectedTransactionId, setSelectedTransactionId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [returnQuantity, setReturnQuantity] = useState("1");
  const [returnLooseQuantity, setReturnLooseQuantity] = useState("0");
  const [reason, setReason] = useState("");
  const [returnDate, setReturnDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [returnData, pharmData, txData] = await Promise.all([
        ReturnService.getAll(),
        PharmacyService.getAll(),
        TransactionService.getAll(),
      ]);
      setReturns(returnData);
      setPharmacies(pharmData);
      setTransactions(txData);
    } catch (err) {
      console.error("Error loading returns:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openProcessModal = () => {
    setFormError(null);
    setSuccessMessage(null);
    setReturnQuantity("1");
    setReturnLooseQuantity("0");
    setReason("");
    setReturnDate(new Date().toISOString().split("T")[0]);

    if (pharmacies.length > 0) {
      const firstPharmId = pharmacies[0].id;
      setSelectedPharmacyId(firstPharmId);
      const pharmTxs = transactions.filter((t) => t.pharmacy_id === firstPharmId);
      if (pharmTxs.length > 0) {
        setSelectedTransactionId(pharmTxs[0].id);
        if (pharmTxs[0].items && pharmTxs[0].items.length > 0) {
          setSelectedItemId(pharmTxs[0].items[0].id);
        }
      } else {
        setSelectedTransactionId("");
        setSelectedItemId("");
      }
    }
    setIsModalOpen(true);
  };

  const handlePharmacyChange = (pharmId: string) => {
    setSelectedPharmacyId(pharmId);
    const pharmTxs = transactions.filter((t) => t.pharmacy_id === pharmId);
    if (pharmTxs.length > 0) {
      setSelectedTransactionId(pharmTxs[0].id);
      if (pharmTxs[0].items && pharmTxs[0].items.length > 0) {
        setSelectedItemId(pharmTxs[0].items[0].id);
      } else {
        setSelectedItemId("");
      }
    } else {
      setSelectedTransactionId("");
      setSelectedItemId("");
    }
  };

  const handleTransactionChange = (txId: string) => {
    setSelectedTransactionId(txId);
    const tx = transactions.find((t) => t.id === txId);
    if (tx && tx.items && tx.items.length > 0) {
      setSelectedItemId(tx.items[0].id);
    } else {
      setSelectedItemId("");
    }
  };

  // Derive current transaction and current item
  const currentTransaction = transactions.find((t) => t.id === selectedTransactionId);
  const currentItem = currentTransaction?.items?.find((i) => i.id === selectedItemId);
  const packSize = currentItem?.pack_size && currentItem.pack_size > 0 ? currentItem.pack_size : 1;
  const remainingReturnable = currentItem
    ? currentItem.quantity - (currentItem.returned_quantity || 0)
    : 0;
  const remainingReturnableLoose = currentItem
    ? (currentItem.loose_quantity || 0) - (currentItem.returned_loose_quantity || 0)
    : 0;

  // Live calculation of return amount
  let calculatedReturnAmount = 0;
  const returnQtyNum = parseInt(returnQuantity, 10) || 0;
  const returnLooseQtyNum = parseInt(returnLooseQuantity, 10) || 0;

  if (currentItem && (returnQtyNum > 0 || returnLooseQtyNum > 0)) {
    try {
      const calc = calculateReturnAmount(
        returnQtyNum,
        currentItem.discounted_unit_price,
        remainingReturnable,
        returnLooseQtyNum,
        remainingReturnableLoose,
        packSize
      );
      calculatedReturnAmount = calc.returnAmount;
    } catch {
      calculatedReturnAmount = 0;
    }
  }

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (!selectedPharmacyId) throw new Error("Please select a pharmacy.");
      if (!selectedTransactionId) throw new Error("Please select an original transaction.");
      if (!selectedItemId) throw new Error("Please select a medicine item to return.");
      if (returnQtyNum <= 0 && returnLooseQtyNum <= 0) {
        throw new Error("Return pack quantity or loose quantity must be greater than zero.");
      }
      if (returnQtyNum > remainingReturnable) {
        throw new Error(
          `Return pack quantity (${returnQtyNum}) exceeds available returnable packs (${remainingReturnable}).`
        );
      }
      if (returnLooseQtyNum > remainingReturnableLoose) {
        throw new Error(
          `Return loose quantity (${returnLooseQtyNum}) exceeds available returnable loose units (${remainingReturnableLoose}).`
        );
      }

      await ReturnService.create({
        pharmacyId: selectedPharmacyId,
        transactionId: selectedTransactionId,
        transactionItemId: selectedItemId,
        returnQuantity: returnQtyNum,
        returnLooseQuantity: returnLooseQtyNum,
        reason,
        returnDate,
      });

      setSuccessMessage(t.returns.returnSuccess);
      await loadData();
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1000);
    } catch (err: any) {
      setFormError(err.message || "Failed to process return.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPharmacyName = (id: string) => {
    const p = pharmacies.find((item) => item.id === id);
    return p ? p.name : "Unknown Pharmacy";
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <RotateCcw className="w-7 h-7 text-primary" />
            <span>{t.returns.title}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Item-linked medicine return engine with automated balance reversals.
          </p>
        </div>

        <Button onClick={openProcessModal} className="gap-2">
          <Plus className="w-4 h-4" />
          <span>{t.returns.processReturn}</span>
        </Button>
      </div>

      {/* Returns List Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            {t.common.loading}
          </div>
        ) : returns.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={RotateCcw}
              title="No Medicine Returns Recorded"
              description="Returned medicines from partner pharmacies will be displayed here and automatically deducted from the ledger."
              actionLabel={t.returns.processReturn}
              onAction={openProcessModal}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/60 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-4">{t.common.date}</th>
                  <th className="py-3 px-4">{t.transactions.pharmacy}</th>
                  <th className="py-3 px-4">Returned Medicine</th>
                  <th className="py-3 px-4 text-center">Qty Returned</th>
                  <th className="py-3 px-4 text-right">Orig. Unit Price</th>
                  <th className="py-3 px-4 text-right">Reversal Amount</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {returns.map((ret) => {
                  const tx = transactions.find((t) => t.id === ret.transaction_id);
                  const isReceived = tx?.type === "received";

                  return (
                    <tr key={ret.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-foreground">
                        {formatDate(ret.return_date)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        <Link
                          href={`/pharmacies/${ret.pharmacy_id}`}
                          className="hover:underline hover:text-primary transition-colors"
                        >
                          {getPharmacyName(ret.pharmacy_id)}
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        {ret.transaction_item?.medicine_name || "Medicine Item"}
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        {ret.return_quantity} pk
                        {ret.return_loose_quantity && ret.return_loose_quantity > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 block text-xs font-normal">
                            +{ret.return_loose_quantity} loose
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground font-mono">
                        {formatCurrency(Number(ret.original_discounted_unit_price))}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-foreground">
                        {formatCurrency(Number(ret.return_amount))}
                        <span className="block text-[10px] font-normal text-muted-foreground">
                          {isReceived ? "(Reduces Payable)" : "(Reduces Receivable)"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {ret.reason || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Process Return Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t.returns.processReturn}
        maxWidth="lg"
      >
        <form onSubmit={handleReturnSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg border border-destructive/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs rounded-lg border border-emerald-200 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Pharmacy Selection */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              1. {t.transactions.pharmacy} *
            </label>
            <select
              required
              value={selectedPharmacyId}
              onChange={(e) => handlePharmacyChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {pharmacies.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Transaction Selection */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              2. {t.returns.selectTransaction} *
            </label>
            {transactions.filter((t) => t.pharmacy_id === selectedPharmacyId).length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No transactions recorded for this pharmacy.
              </p>
            ) : (
              <select
                required
                value={selectedTransactionId}
                onChange={(e) => handleTransactionChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {transactions
                  .filter((t) => t.pharmacy_id === selectedPharmacyId)
                  .map((tx) => (
                    <option key={tx.id} value={tx.id}>
                      {formatDate(tx.transaction_date)} &bull; {tx.type.toUpperCase()} &bull; {formatCurrency(Number(tx.grand_total))} (Ref: {tx.invoice_number || tx.id.slice(0, 6)})
                    </option>
                  ))}
              </select>
            )}
          </div>

          {/* Medicine Item Selection */}
          {currentTransaction && currentTransaction.items && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                3. {t.returns.selectMedicine} *
              </label>
              <select
                required
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {currentTransaction.items.map((item) => {
                  const remaining = item.quantity - (item.returned_quantity || 0);
                  return (
                    <option key={item.id} value={item.id} disabled={remaining <= 0}>
                      {item.medicine_name} &bull; Qty: {item.quantity} (Available to return: {remaining}) &bull; Unit: {formatCurrency(item.discounted_unit_price)}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Item details card */}
          {currentItem && (
            <div className="p-3 bg-secondary/40 border border-border rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Original Transaction:</span>
                <span className="font-semibold text-foreground">
                  {currentItem.quantity} packs
                  {currentItem.loose_quantity && currentItem.loose_quantity > 0
                    ? ` + ${currentItem.loose_quantity} loose (${currentItem.pack_size || 10}/pk)`
                    : ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Already Returned:</span>
                <span className="font-semibold text-foreground">
                  {currentItem.returned_quantity || 0} packs
                  {currentItem.returned_loose_quantity && currentItem.returned_loose_quantity > 0
                    ? ` + ${currentItem.returned_loose_quantity} loose`
                    : ""}
                </span>
              </div>
              <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border">
                <span>Remaining Returnable:</span>
                <span className="text-primary">
                  {remainingReturnable} packs
                  {remainingReturnableLoose > 0 ? ` + ${remainingReturnableLoose} loose units` : ""}
                </span>
              </div>
            </div>
          )}

          {/* Quantity & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                4. {t.returns.returnQuantity} (Packs)
              </label>
              <input
                type="number"
                min="0"
                max={remainingReturnable}
                value={returnQuantity}
                onChange={(e) => setReturnQuantity(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-bold font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                {t.returns.returnLooseQuantity}
              </label>
              <input
                type="number"
                min="0"
                max={remainingReturnableLoose}
                value={returnLooseQuantity}
                onChange={(e) => setReturnLooseQuantity(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-bold font-mono text-amber-700 dark:text-amber-300"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                {t.common.date} *
              </label>
              <input
                type="date"
                required
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              {t.returns.reason}
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Near expiry, damaged packaging, or customer return"
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Reversal Preview Card */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-amber-900 dark:text-amber-200">
                Calculated Reversal Amount:
              </span>
              <span className="text-sm font-bold text-amber-900 dark:text-amber-200">
                {formatCurrency(calculatedReturnAmount)}
              </span>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              {currentTransaction?.type === "received"
                ? "This will credit your account and reduce the Payable amount owed to this pharmacy."
                : "This will debit your account and reduce the Receivable amount owed by this pharmacy."}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={remainingReturnable <= 0}
            >
              {t.returns.processReturn}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
