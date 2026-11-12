"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Transaction, Pharmacy, TransactionType } from "@/types/database.types";
import { TransactionService } from "@/lib/services/transactionService";
import { PharmacyService } from "@/lib/services/pharmacyService";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Trash2,
  RotateCcw,
  Eye,
  Building2,
  Calendar,
} from "lucide-react";

export default function TransactionsPage() {
  const { t, isRtl } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPharmacy, setSelectedPharmacy] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Details Modal
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txData, pharmData] = await Promise.all([
        TransactionService.getAll({ includeDeleted: false }),
        PharmacyService.getAll(),
      ]);
      setTransactions(txData);
      setPharmacies(pharmData);
    } catch (err) {
      console.error("Error loading transactions:", err);
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to soft-delete this transaction?")) return;
    try {
      await TransactionService.softDelete(id);
      await loadData();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (selectedPharmacy !== "all" && tx.pharmacy_id !== selectedPharmacy) return false;
    if (selectedType !== "all" && tx.type !== selectedType) return false;
    if (selectedDate && tx.transaction_date !== selectedDate) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const pName = getPharmacyName(tx.pharmacy_id).toLowerCase();
      const inv = (tx.invoice_number || "").toLowerCase();
      const hasMed = tx.items?.some((i) => i.medicine_name.toLowerCase().includes(q));
      if (!pName.includes(q) && !inv.includes(q) && !hasMed) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-primary" />
            <span>{t.transactions.title}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete register of inter-pharmacy medicine borrowings, lendings, and exchanges.
          </p>
        </div>

        <Link href="/transactions/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            <span>{t.transactions.newTitle}</span>
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medicine or invoice..."
            className="w-full pl-9 pr-3 py-2 text-xs md:text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <select
            value={selectedPharmacy}
            onChange={(e) => setSelectedPharmacy(e.target.value)}
            className="w-full px-3 py-2 text-xs md:text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Pharmacies</option>
            {pharmacies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 text-xs md:text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Types (Received & Given)</option>
            <option value="received">{t.transactions.received}</option>
            <option value="given">{t.transactions.given}</option>
          </select>
        </div>

        <div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 text-xs md:text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            {t.common.loading}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Receipt}
              title="No Transactions Found"
              description="Record new medicine deliveries and borrowings to begin building your trade ledger."
              actionLabel={t.transactions.newTitle}
              onAction={() => {
                if (typeof window !== "undefined") window.location.href = "/transactions/new";
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/60 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-4">{t.common.date}</th>
                  <th className="py-3 px-4">{t.transactions.pharmacy}</th>
                  <th className="py-3 px-4">{t.transactions.type}</th>
                  <th className="py-3 px-4">{t.transactions.invoiceNumber}</th>
                  <th className="py-3 px-4">Medicines</th>
                  <th className="py-3 px-4 text-right">{t.transactions.grandTotal}</th>
                  <th className="py-3 px-4 text-center">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTransactions.map((tx) => {
                  const isReceived = tx.type === "received";
                  const itemCount = tx.items?.length || 0;
                  const itemSummary = tx.items
                    ?.map((i) => {
                      const looseStr = i.loose_quantity && i.loose_quantity > 0 ? ` + ${i.loose_quantity} ls` : "";
                      return `${i.medicine_name} (${i.quantity} pk${looseStr})`;
                    })
                    .slice(0, 2)
                    .join(", ");

                  return (
                    <tr key={tx.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-foreground">
                        {formatDate(tx.transaction_date)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        <Link
                          href={`/pharmacies/${tx.pharmacy_id}`}
                          className="hover:text-primary transition-colors hover:underline"
                        >
                          {getPharmacyName(tx.pharmacy_id)}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={isReceived ? "warning" : "info"}>
                          {isReceived ? t.transactions.received : t.transactions.given}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                        {tx.invoice_number || "-"}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs truncate">
                        {itemSummary}
                        {itemCount > 2 ? ` +${itemCount - 2} more` : ""}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-foreground">
                        {formatCurrency(Number(tx.grand_total))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewTransaction(tx)}
                            className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-secondary"
                            title={t.common.delete}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {viewTransaction && (
        <Modal
          isOpen={!!viewTransaction}
          onClose={() => setViewTransaction(null)}
          title={`Transaction Details • ${viewTransaction.invoice_number || viewTransaction.id.slice(0, 8)}`}
          maxWidth="xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-secondary/40 rounded-lg text-xs">
              <div>
                <span className="text-muted-foreground block">{t.transactions.pharmacy}:</span>
                <span className="font-semibold text-foreground">
                  {getPharmacyName(viewTransaction.pharmacy_id)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">{t.common.date}:</span>
                <span className="font-semibold text-foreground">
                  {formatDate(viewTransaction.transaction_date)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">{t.transactions.type}:</span>
                <Badge variant={viewTransaction.type === "received" ? "warning" : "info"}>
                  {viewTransaction.type === "received" ? t.transactions.received : t.transactions.given}
                </Badge>
              </div>
            </div>

            {/* Medicine Items List */}
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-secondary text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-2">Medicine</th>
                    <th className="p-2 text-center">Qty / Loose</th>
                    <th className="p-2 text-right">Retail</th>
                    <th className="p-2 text-right">Disc %</th>
                    <th className="p-2 text-right">Final Unit</th>
                    <th className="p-2 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {viewTransaction.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="p-2 font-medium text-foreground">{item.medicine_name}</td>
                      <td className="p-2 text-center font-mono">
                        {item.quantity} pk
                        {item.loose_quantity && item.loose_quantity > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 block text-[10px]">
                            +{item.loose_quantity} loose ({item.pack_size || 10}/pk)
                          </span>
                        ) : null}
                      </td>
                      <td className="p-2 text-right">{formatCurrency(item.retail_price)}</td>
                      <td className="p-2 text-right">{item.discount_percentage}%</td>
                      <td className="p-2 text-right">{formatCurrency(item.discounted_unit_price)}</td>
                      <td className="p-2 text-right font-bold">{formatCurrency(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2 text-sm font-bold border-t border-border">
              <span>{t.transactions.grandTotal}:</span>
              <span className="text-primary text-base">
                {formatCurrency(Number(viewTransaction.grand_total))}
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setViewTransaction(null)}>
                {t.common.back}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
