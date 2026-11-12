"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Building,
  PlusCircle,
  RotateCcw,
  BookOpen,
  Receipt,
  Clock,
} from "lucide-react";
import { Transaction, Pharmacy } from "@/types/database.types";
import { TransactionService } from "@/lib/services/transactionService";
import { PharmacyService } from "@/lib/services/pharmacyService";
import { ReturnService } from "@/lib/services/returnService";
import { calculatePharmacyAccountSummary } from "@/lib/calculations/financial";

export default function DashboardPage() {
  const { t, locale, isRtl } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [metrics, setMetrics] = useState({
    receivedToday: 0,
    givenToday: 0,
    totalReceivable: 0,
    totalPayable: 0,
    netPosition: 0,
  });

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [txData, pharmData, returnData] = await Promise.all([
        TransactionService.getAll(),
        PharmacyService.getAll(),
        ReturnService.getAll(),
      ]);

      setTransactions(txData);
      setPharmacies(pharmData);

      const todayStr = new Date().toISOString().split("T")[0];
      const todayTx = txData.filter((t) => t.transaction_date === todayStr);

      const receivedToday = todayTx
        .filter((t) => t.type === "received")
        .reduce((sum, t) => sum + Number(t.grand_total), 0);

      const givenToday = todayTx
        .filter((t) => t.type === "given")
        .reduce((sum, t) => sum + Number(t.grand_total), 0);

      let totalPayable = 0;
      let totalReceivable = 0;

      for (const pharmacy of pharmData) {
        const pharmTx = txData.filter((t) => t.pharmacy_id === pharmacy.id);
        const pharmReturns = returnData.filter((r) => r.pharmacy_id === pharmacy.id);

        const summary = calculatePharmacyAccountSummary({
          openingBalance: Number(pharmacy.opening_balance) || 0,
          openingBalanceType: pharmacy.opening_balance_type,
          transactions: pharmTx.map((tx) => ({
            type: tx.type,
            grandTotal: Number(tx.grand_total),
            deletedAt: tx.deleted_at,
          })),
          returns: pharmReturns.map((ret) => {
            const origTx = pharmTx.find((tx) => tx.id === ret.transaction_id);
            return {
              originalTransactionType: origTx?.type || "received",
              returnAmount: Number(ret.return_amount),
              deletedAt: ret.deleted_at,
            };
          }),
        });

        if (summary.netBalance > 0) {
          totalPayable += summary.netBalance;
        } else if (summary.netBalance < 0) {
          totalReceivable += Math.abs(summary.netBalance);
        }
      }

      setMetrics({
        receivedToday,
        givenToday,
        totalReceivable,
        totalPayable,
        netPosition: totalPayable - totalReceivable,
      });
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getPharmacyName = (pharmacyId: string) => {
    const p = pharmacies.find((item) => item.id === pharmacyId);
    return p ? p.name : "Unknown Pharmacy";
  };

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            {t.navigation.dashboard}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t.dashboard.dailyOverview} &bull; {formatDate(new Date())}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/transactions/new">
            <Button size="sm" className="gap-2">
              <PlusCircle className="w-4 h-4" />
              <span>{t.navigation.newTransaction}</span>
            </Button>
          </Link>
          <Link href="/returns">
            <Button variant="outline" size="sm" className="gap-2">
              <RotateCcw className="w-4 h-4" />
              <span>{t.navigation.returns}</span>
            </Button>
          </Link>
          <Link href="/khata">
            <Button variant="outline" size="sm" className="gap-2">
              <BookOpen className="w-4 h-4" />
              <span>{t.navigation.dailyKhata}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Core Metric StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title={t.dashboard.receivedToday}
          value={formatCurrency(metrics.receivedToday)}
          icon={ArrowDownLeft}
          variant="payable"
          description={t.transactions.received}
        />
        <StatCard
          title={t.dashboard.givenToday}
          value={formatCurrency(metrics.givenToday)}
          icon={ArrowUpRight}
          variant="receivable"
          description={t.transactions.given}
        />
        <StatCard
          title={t.dashboard.totalPayable}
          value={formatCurrency(metrics.totalPayable)}
          icon={Wallet}
          variant="payable"
          description={t.khata.netPayable}
        />
        <StatCard
          title={t.dashboard.totalReceivable}
          value={formatCurrency(metrics.totalReceivable)}
          icon={Building}
          variant="receivable"
          description={t.khata.netReceivable}
        />
      </div>

      {/* Net Financial Position Bar */}
      <div className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            {t.dashboard.netPosition}
          </span>
          <div className="text-xl md:text-2xl font-bold mt-0.5">
            {formatCurrency(Math.abs(metrics.netPosition))}
            <span className="text-sm font-normal text-muted-foreground ml-2">
              {metrics.netPosition > 0
                ? `(${t.khata.netPayable})`
                : metrics.netPosition < 0
                ? `(${t.khata.netReceivable})`
                : `(${t.khata.settled})`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/pharmacies">
            <Button variant="outline" size="sm">
              {t.pharmacies.title}
            </Button>
          </Link>
          <Link href="/transactions">
            <Button variant="outline" size="sm">
              {t.transactions.title}
            </Button>
          </Link>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">
              {t.dashboard.recentTransactions}
            </h2>
          </div>
          <Link href="/transactions" className="text-xs font-medium text-primary hover:underline">
            {t.common.view} {t.common.all} &rarr;
          </Link>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Clock}
              title={t.dashboard.noTransactionsYet}
              description="Start recording medicine exchanges with partner pharmacies to populate your live ledger."
              actionLabel={t.navigation.newTransaction}
              onAction={() => {
                if (typeof window !== "undefined") window.location.href = "/transactions/new";
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-4">{t.common.date}</th>
                  <th className="py-3 px-4">{t.transactions.pharmacy}</th>
                  <th className="py-3 px-4">{t.transactions.type}</th>
                  <th className="py-3 px-4">{t.transactions.invoiceNumber}</th>
                  <th className="py-3 px-4 text-right">{t.transactions.grandTotal}</th>
                  <th className="py-3 px-4 text-center">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.slice(0, 5).map((tx) => {
                  const isReceived = tx.type === "received";
                  return (
                    <tr key={tx.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-foreground">
                        {formatDate(tx.transaction_date)}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        {getPharmacyName(tx.pharmacy_id)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={isReceived ? "warning" : "info"}>
                          {isReceived ? t.transactions.received : t.transactions.given}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {tx.invoice_number || "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-foreground">
                        {formatCurrency(Number(tx.grand_total))}
                      </td>
                      <td className="py-3 px-4 text-center">
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
    </div>
  );
}
