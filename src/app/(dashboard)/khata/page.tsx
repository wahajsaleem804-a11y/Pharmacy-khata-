"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Pharmacy, Transaction, MedicineReturn, TransactionType } from "@/types/database.types";
import { TransactionService } from "@/lib/services/transactionService";
import { PharmacyService } from "@/lib/services/pharmacyService";
import { ReturnService } from "@/lib/services/returnService";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  BookOpen,
  Calendar,
  Printer,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Wallet,
  Receipt,
  FileCheck,
} from "lucide-react";

export default function DailyKhataPage() {
  const { t, isRtl } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");

  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allReturns, setAllReturns] = useState<MedicineReturn[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pharmData, txData, retData] = await Promise.all([
        PharmacyService.getAll(),
        TransactionService.getAll(),
        ReturnService.getAll(),
      ]);
      setPharmacies(pharmData);
      setAllTransactions(txData);
      setAllReturns(retData);
    } catch (err) {
      console.error("Error loading daily khata data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getPharmacyName = (id: string) => {
    const p = pharmacies.find((item) => item.id === id);
    return p ? p.name : "Unknown Pharmacy";
  };

  // Filter for selected date
  const dateTransactions = allTransactions.filter((tx) => {
    if (tx.transaction_date !== selectedDate) return false;
    if (selectedPharmacyId !== "all" && tx.pharmacy_id !== selectedPharmacyId) return false;
    if (selectedType !== "all" && tx.type !== selectedType) return false;
    return true;
  });

  const dateReturns = allReturns.filter((r) => {
    if (r.return_date !== selectedDate) return false;
    if (selectedPharmacyId !== "all" && r.pharmacy_id !== selectedPharmacyId) return false;
    return true;
  });

  // Calculate Daily Closing Aggregates
  const totalTransactionsCount = dateTransactions.length;
  const totalMedicinesReceived = dateTransactions
    .filter((t) => t.type === "received")
    .reduce((sum, t) => sum + Number(t.grand_total), 0);

  const totalMedicinesGiven = dateTransactions
    .filter((t) => t.type === "given")
    .reduce((sum, t) => sum + Number(t.grand_total), 0);

  const totalReturnsOnReceived = dateReturns
    .filter((r) => {
      const tx = allTransactions.find((t) => t.id === r.transaction_id);
      return tx?.type === "received";
    })
    .reduce((sum, r) => sum + Number(r.return_amount), 0);

  const totalReturnsOnGiven = dateReturns
    .filter((r) => {
      const tx = allTransactions.find((t) => t.id === r.transaction_id);
      return tx?.type === "given";
    })
    .reduce((sum, r) => sum + Number(r.return_amount), 0);

  const totalReturnsCount = dateReturns.length;
  const netPayableToday = Math.max(0, totalMedicinesReceived - totalReturnsOnReceived);
  const netReceivableToday = Math.max(0, totalMedicinesGiven - totalReturnsOnGiven);
  const dailyNetPosition = netPayableToday - netReceivableToday;

  // Pharmacy-wise daily breakdown
  const pharmacySummaryMap: Record<
    string,
    { received: number; given: number; returnedReceived: number; returnedGiven: number }
  > = {};

  for (const tx of dateTransactions) {
    if (!pharmacySummaryMap[tx.pharmacy_id]) {
      pharmacySummaryMap[tx.pharmacy_id] = { received: 0, given: 0, returnedReceived: 0, returnedGiven: 0 };
    }
    if (tx.type === "received") {
      pharmacySummaryMap[tx.pharmacy_id].received += Number(tx.grand_total);
    } else {
      pharmacySummaryMap[tx.pharmacy_id].given += Number(tx.grand_total);
    }
  }

  for (const r of dateReturns) {
    if (!pharmacySummaryMap[r.pharmacy_id]) {
      pharmacySummaryMap[r.pharmacy_id] = { received: 0, given: 0, returnedReceived: 0, returnedGiven: 0 };
    }
    const origTx = allTransactions.find((t) => t.id === r.transaction_id);
    if (origTx?.type === "received") {
      pharmacySummaryMap[r.pharmacy_id].returnedReceived += Number(r.return_amount);
    } else {
      pharmacySummaryMap[r.pharmacy_id].returnedGiven += Number(r.return_amount);
    }
  }

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-primary" />
            <span>{t.khata.dailyKhata}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Date-wise trade ledger, audit closing snapshot, and pharmacy summaries.
          </p>
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

      {/* Date & Filter Toolbar */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-lg border border-border">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">{t.common.date}:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs md:text-sm bg-transparent font-medium focus:outline-none cursor-pointer"
            />
          </div>

          <select
            value={selectedPharmacyId}
            onChange={(e) => setSelectedPharmacyId(e.target.value)}
            className="px-3 py-1.5 text-xs md:text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Pharmacies</option>
            {pharmacies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 text-xs md:text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Types</option>
            <option value="received">{t.transactions.received}</option>
            <option value="given">{t.transactions.given}</option>
          </select>
        </div>

        <div className="text-xs text-muted-foreground font-medium">
          Showing Ledger for: <strong className="text-foreground">{formatDate(selectedDate)}</strong>
        </div>
      </div>

      {/* Daily Closing Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t.dashboard.receivedToday}
          value={formatCurrency(totalMedicinesReceived)}
          icon={ArrowDownLeft}
          variant="payable"
          description={`Deductions/Returns: ${formatCurrency(totalReturnsOnReceived)}`}
        />
        <StatCard
          title={t.dashboard.givenToday}
          value={formatCurrency(totalMedicinesGiven)}
          icon={ArrowUpRight}
          variant="receivable"
          description={`Deductions/Returns: ${formatCurrency(totalReturnsOnGiven)}`}
        />
        <StatCard
          title="Daily Net Payable"
          value={formatCurrency(netPayableToday)}
          icon={Wallet}
          variant="payable"
          description="Received - Returns on Received"
        />
        <StatCard
          title="Daily Net Receivable"
          value={formatCurrency(netReceivableToday)}
          icon={Building2}
          variant="receivable"
          description="Given - Returns on Given"
        />
      </div>

      {/* Daily Ledger Detailed Item Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-secondary/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-sm text-foreground">
              Daily Transactions & Line Items ({dateTransactions.length} transactions)
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDate(selectedDate)}
          </span>
        </div>

        {dateTransactions.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Calendar}
              title="No Transactions Recorded on this Date"
              description={`There are no recorded transactions on ${formatDate(selectedDate)}. Select another date or record new transactions.`}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/60 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Pharmacy</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Invoice / Ref</th>
                  <th className="py-2.5 px-3">Medicine Breakdown</th>
                  <th className="py-2.5 px-3 text-right">Discount</th>
                  <th className="py-2.5 px-3 text-right">{t.transactions.grandTotal}</th>
                  <th className="py-2.5 px-3 text-center no-print">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dateTransactions.map((tx) => {
                  const isReceived = tx.type === "received";

                  return (
                    <tr key={tx.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-3 px-3 font-semibold text-foreground">
                        <Link
                          href={`/pharmacies/${tx.pharmacy_id}`}
                          className="hover:underline hover:text-primary transition-colors"
                        >
                          {getPharmacyName(tx.pharmacy_id)}
                        </Link>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={isReceived ? "warning" : "info"}>
                          {isReceived ? t.transactions.received : t.transactions.given}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-muted-foreground">
                        {tx.invoice_number || "-"}
                      </td>
                      <td className="py-3 px-3 text-xs text-foreground">
                        <div className="space-y-1">
                          {tx.items?.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-4">
                              <span>
                                {item.medicine_name} &bull; {item.quantity} units @ {formatCurrency(item.retail_price)} (-{item.discount_percentage}%)
                              </span>
                              <span className="font-mono text-muted-foreground">
                                = {formatCurrency(item.line_total)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                        {formatCurrency(Number(tx.discount_amount))}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-foreground">
                        {formatCurrency(Number(tx.grand_total))}
                      </td>
                      <td className="py-3 px-3 text-center no-print">
                        <Link href={`/pharmacies/${tx.pharmacy_id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            {t.khata.title}
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pharmacy-wise Daily Summary Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-secondary/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-sm text-foreground">
              Pharmacy-wise Daily Closing Breakdown
            </h2>
          </div>
        </div>

        {Object.keys(pharmacySummaryMap).length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No pharmacy activity recorded on this date.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/60 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border">
                <tr>
                  <th className="py-2.5 px-4">Pharmacy</th>
                  <th className="py-2.5 px-4 text-right">Received (Payable +)</th>
                  <th className="py-2.5 px-4 text-right">Given (Receivable +)</th>
                  <th className="py-2.5 px-4 text-right">Returns on Received (-)</th>
                  <th className="py-2.5 px-4 text-right">Returns on Given (-)</th>
                  <th className="py-2.5 px-4 text-right">Net Daily Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Object.entries(pharmacySummaryMap).map(([pharmId, stats]) => {
                  const netPayable = Math.max(0, stats.received - stats.returnedReceived);
                  const netReceivable = Math.max(0, stats.given - stats.returnedGiven);
                  const netDaily = netPayable - netReceivable;

                  return (
                    <tr key={pharmId} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {getPharmacyName(pharmId)}
                      </td>
                      <td className="py-3 px-4 text-right text-amber-600 dark:text-amber-400 font-mono">
                        {formatCurrency(stats.received)}
                      </td>
                      <td className="py-3 px-4 text-right text-blue-600 dark:text-blue-400 font-mono">
                        {formatCurrency(stats.given)}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground font-mono">
                        {stats.returnedReceived > 0 ? formatCurrency(stats.returnedReceived) : "-"}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground font-mono">
                        {stats.returnedGiven > 0 ? formatCurrency(stats.returnedGiven) : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-foreground">
                        <Badge
                          variant={netDaily > 0 ? "warning" : netDaily < 0 ? "info" : "success"}
                        >
                          {formatCurrency(Math.abs(netDaily))} {netDaily > 0 ? "Payable" : netDaily < 0 ? "Receivable" : "Settled"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
