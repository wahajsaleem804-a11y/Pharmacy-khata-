"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Pharmacy, Transaction, MedicineReturn, LedgerEntry } from "@/types/database.types";
import { PharmacyService } from "@/lib/services/pharmacyService";
import { TransactionService } from "@/lib/services/transactionService";
import { ReturnService } from "@/lib/services/returnService";
import { calculatePharmacyAccountSummary, roundToTwoDecimals } from "@/lib/calculations/financial";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ArrowLeft,
  Printer,
  Building2,
  Phone,
  MapPin,
  Calendar,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
} from "lucide-react";

export default function PharmacyKhataPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, isRtl } = useLanguage();
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    openingBalance: 0,
    totalReceived: 0,
    totalGiven: 0,
    totalReturnsOnReceived: 0,
    totalReturnsOnGiven: 0,
    totalPayable: 0,
    totalReceivable: 0,
    netBalance: 0,
    status: "settled" as "payable" | "receivable" | "settled",
  });

  const loadKhata = async () => {
    setLoading(true);
    try {
      const [pharm, txData, retData] = await Promise.all([
        PharmacyService.getById(id),
        TransactionService.getAll({ pharmacyId: id }),
        ReturnService.getAll({ pharmacyId: id }),
      ]);

      if (!pharm) {
        setPharmacy(null);
        return;
      }
      setPharmacy(pharm);

      // Account summary computation
      const acctSummary = calculatePharmacyAccountSummary({
        openingBalance: Number(pharm.opening_balance) || 0,
        openingBalanceType: pharm.opening_balance_type,
        transactions: txData.map((tx) => ({
          type: tx.type,
          grandTotal: Number(tx.grand_total),
          deletedAt: tx.deleted_at,
        })),
        returns: retData.map((ret) => {
          const origTx = txData.find((tx) => tx.id === ret.transaction_id);
          return {
            originalTransactionType: origTx?.type || "received",
            returnAmount: Number(ret.return_amount),
            deletedAt: ret.deleted_at,
          };
        }),
      });
      setSummary(acctSummary);

      // Build chronological running ledger entries
      const rawEvents: Array<{
        date: string;
        created_at: string;
        type: "opening_balance" | "received" | "given" | "return_received" | "return_given";
        reference: string;
        description: string;
        debit: number;
        credit: number;
        raw: any;
      }> = [];

      // Opening balance entry
      if (Number(pharm.opening_balance) > 0) {
        if (pharm.opening_balance_type === "payable") {
          rawEvents.push({
            date: pharm.created_at.split("T")[0],
            created_at: pharm.created_at,
            type: "opening_balance",
            reference: "OPENING",
            description: "Opening Balance (Payable - You owe)",
            debit: 0,
            credit: Number(pharm.opening_balance),
            raw: null,
          });
        } else if (pharm.opening_balance_type === "receivable") {
          rawEvents.push({
            date: pharm.created_at.split("T")[0],
            created_at: pharm.created_at,
            type: "opening_balance",
            reference: "OPENING",
            description: "Opening Balance (Receivable - They owe)",
            debit: Number(pharm.opening_balance),
            credit: 0,
            raw: null,
          });
        }
      }

      // Add transactions
      for (const tx of txData) {
        if (tx.deleted_at) continue;
        const itemCount = tx.items?.length || 0;
        const medicineNames = tx.items?.map((i) => i.medicine_name).slice(0, 3).join(", ") || "";

        if (tx.type === "received") {
          // Medicine Received increases Payable (Credit)
          rawEvents.push({
            date: tx.transaction_date,
            created_at: tx.created_at,
            type: "received",
            reference: tx.invoice_number || `TX-${tx.id.slice(0, 6)}`,
            description: `Received: ${medicineNames}${itemCount > 3 ? "..." : ""}`,
            debit: 0,
            credit: Number(tx.grand_total),
            raw: tx,
          });
        } else {
          // Medicine Given increases Receivable (Debit)
          rawEvents.push({
            date: tx.transaction_date,
            created_at: tx.created_at,
            type: "given",
            reference: tx.invoice_number || `TX-${tx.id.slice(0, 6)}`,
            description: `Given: ${medicineNames}${itemCount > 3 ? "..." : ""}`,
            debit: Number(tx.grand_total),
            credit: 0,
            raw: tx,
          });
        }
      }

      // Add returns
      for (const ret of retData) {
        if (ret.deleted_at) continue;
        const origTx = txData.find((tx) => tx.id === ret.transaction_id);
        const isOriginalReceived = origTx?.type === "received";

        if (isOriginalReceived) {
          // Return of Received Medicine reduces Payable (Debit)
          rawEvents.push({
            date: ret.return_date,
            created_at: ret.created_at,
            type: "return_received",
            reference: `RET-${ret.id.slice(0, 6)}`,
            description: `Return of Received Medicine (${ret.return_quantity} qty)`,
            debit: Number(ret.return_amount),
            credit: 0,
            raw: ret,
          });
        } else {
          // Return of Given Medicine reduces Receivable (Credit)
          rawEvents.push({
            date: ret.return_date,
            created_at: ret.created_at,
            type: "return_given",
            reference: `RET-${ret.id.slice(0, 6)}`,
            description: `Return of Given Medicine (${ret.return_quantity} qty)`,
            debit: 0,
            credit: Number(ret.return_amount),
            raw: ret,
          });
        }
      }

      // Sort strictly chronologically by date and creation time
      rawEvents.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.created_at.localeCompare(b.created_at);
      });

      // Calculate Running Balance:
      // Net Balance = Payable - Receivable (positive = Net Payable, negative = Net Receivable)
      // Credit increases Payable (+), Debit decreases Payable / increases Receivable (-)
      let running = 0;
      const computedLedger: LedgerEntry[] = rawEvents.map((evt, idx) => {
        running = roundToTwoDecimals(running + evt.credit - evt.debit);
        return {
          id: `entry_${idx}`,
          date: evt.date,
          type: evt.type,
          reference: evt.reference,
          description: evt.description,
          debit: evt.debit,
          credit: evt.credit,
          running_balance: running,
          raw_item: evt.raw,
        };
      });

      setLedgerEntries(computedLedger);
    } catch (err) {
      console.error("Error loading pharmacy ledger:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKhata();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground">
        {t.common.loading}
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <EmptyState
        icon={Building2}
        title="Pharmacy Not Found"
        description="The requested pharmacy account could not be found or has been removed."
        actionLabel={t.common.back}
        onAction={() => {
          if (typeof window !== "undefined") window.location.href = "/pharmacies";
        }}
      />
    );
  }

  const isNetPayable = summary.netBalance > 0;
  const isNetReceivable = summary.netBalance < 0;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/pharmacies" className="no-print">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>{pharmacy.name}</span>
              <span className="text-sm font-normal text-muted-foreground block">
                &bull; {t.khata.title}
              </span>
            </h1>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                {pharmacy.phone_number}
              </span>
              {pharmacy.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {pharmacy.address}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 no-print">
          <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
            <Printer className="w-4 h-4" />
            <span>{t.common.print} / {t.common.exportPdf}</span>
          </Button>
          <Link href="/transactions/new">
            <Button size="sm" className="gap-2">
              <span>+ {t.navigation.newTransaction}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t.pharmacies.openingBalance}
          value={formatCurrency(Number(pharmacy.opening_balance))}
          icon={Calendar}
          variant="default"
          description={`Type: ${pharmacy.opening_balance_type.toUpperCase()}`}
        />
        <StatCard
          title={t.dashboard.totalPayable}
          value={formatCurrency(summary.totalPayable)}
          icon={ArrowDownLeft}
          variant="payable"
          description="Received - Returns"
        />
        <StatCard
          title={t.dashboard.totalReceivable}
          value={formatCurrency(summary.totalReceivable)}
          icon={ArrowUpRight}
          variant="receivable"
          description="Given - Returns"
        />
        <StatCard
          title={t.pharmacies.netBalance}
          value={formatCurrency(Math.abs(summary.netBalance))}
          icon={Wallet}
          variant={isNetPayable ? "payable" : isNetReceivable ? "receivable" : "neutral"}
          description={
            isNetPayable
              ? t.khata.netPayable
              : isNetReceivable
              ? t.khata.netReceivable
              : t.khata.settled
          }
        />
      </div>

      {/* Ledger Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-secondary/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-sm text-foreground">
              Statement Ledger Entries ({ledgerEntries.length})
            </h2>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {formatDate(new Date())}
          </span>
        </div>

        {ledgerEntries.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={BookOpen}
              title="No Ledger Records Yet"
              description="Transactions and returns recorded with this pharmacy will automatically populate this chronological running account."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/60 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-4">{t.common.date}</th>
                  <th className="py-3 px-4">Ref / Invoice</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Debit (Receivable + / Payable -)</th>
                  <th className="py-3 px-4 text-right">Credit (Payable + / Receivable -)</th>
                  <th className="py-3 px-4 text-right">{t.khata.runningBalance}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ledgerEntries.map((entry) => {
                  const isPositive = entry.running_balance > 0;
                  const isNegative = entry.running_balance < 0;

                  return (
                    <tr key={entry.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-foreground">
                        {formatDate(entry.date)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                        {entry.reference}
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {entry.description}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-blue-600 dark:text-blue-400">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-amber-600 dark:text-amber-400">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-bold whitespace-nowrap">
                        <span
                          className={
                            isPositive
                              ? "text-amber-600 dark:text-amber-400"
                              : isNegative
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-foreground"
                          }
                        >
                          {formatCurrency(Math.abs(entry.running_balance))}
                        </span>
                        <span className="text-[10px] ml-1 font-normal text-muted-foreground">
                          {isPositive ? "(Payable)" : isNegative ? "(Receivable)" : "(0)"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-secondary/40 border-t-2 border-border font-bold text-sm">
                <tr>
                  <td colSpan={3} className="py-3 px-4 uppercase text-xs tracking-wider text-muted-foreground">
                    Closing Ledger Balance
                  </td>
                  <td className="py-3 px-4 text-right text-blue-600 dark:text-blue-400">
                    {formatCurrency(summary.totalReceivable)}
                  </td>
                  <td className="py-3 px-4 text-right text-amber-600 dark:text-amber-400">
                    {formatCurrency(summary.totalPayable)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Badge variant={isNetPayable ? "warning" : isNetReceivable ? "info" : "success"}>
                      {formatCurrency(Math.abs(summary.netBalance))} {isNetPayable ? "Payable" : isNetReceivable ? "Receivable" : "Settled"}
                    </Badge>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
