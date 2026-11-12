"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Pharmacy, OpeningBalanceType } from "@/types/database.types";
import { PharmacyService } from "@/lib/services/pharmacyService";
import { TransactionService } from "@/lib/services/transactionService";
import { ReturnService } from "@/lib/services/returnService";
import { calculatePharmacyAccountSummary } from "@/lib/calculations/financial";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Building2,
  Plus,
  Search,
  Phone,
  MapPin,
  Edit,
  Trash2,
  BookOpen,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";

export default function PharmaciesPage() {
  const { t, isRtl } = useLanguage();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPharmacy, setEditingPharmacy] = useState<Pharmacy | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pharmacyToDelete, setPharmacyToDelete] = useState<Pharmacy | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [openingBalanceType, setOpeningBalanceType] = useState<OpeningBalanceType>("neutral");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pharmacy Net Balances map
  const [balances, setBalances] = useState<Record<string, { netBalance: number; status: string }>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [pharmData, txData, retData] = await Promise.all([
        PharmacyService.getAll(),
        TransactionService.getAll(),
        ReturnService.getAll(),
      ]);
      setPharmacies(pharmData);

      // Calculate running net balance for each pharmacy
      const balancesMap: Record<string, { netBalance: number; status: string }> = {};
      for (const p of pharmData) {
        const pTx = txData.filter((t) => t.pharmacy_id === p.id);
        const pRet = retData.filter((r) => r.pharmacy_id === p.id);
        const summary = calculatePharmacyAccountSummary({
          openingBalance: Number(p.opening_balance) || 0,
          openingBalanceType: p.opening_balance_type,
          transactions: pTx.map((tx) => ({
            type: tx.type,
            grandTotal: Number(tx.grand_total),
            deletedAt: tx.deleted_at,
          })),
          returns: pRet.map((ret) => {
            const origTx = pTx.find((tx) => tx.id === ret.transaction_id);
            return {
              originalTransactionType: origTx?.type || "received",
              returnAmount: Number(ret.return_amount),
              deletedAt: ret.deleted_at,
            };
          }),
        });
        balancesMap[p.id] = { netBalance: summary.netBalance, status: summary.status };
      }
      setBalances(balancesMap);
    } catch (err) {
      console.error("Error loading pharmacies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingPharmacy(null);
    setName("");
    setContactPerson("");
    setPhoneNumber("");
    setAddress("");
    setOpeningBalance("0");
    setOpeningBalanceType("neutral");
    setNotes("");
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (p: Pharmacy) => {
    setEditingPharmacy(p);
    setName(p.name);
    setContactPerson(p.contact_person || "");
    setPhoneNumber(p.phone_number);
    setAddress(p.address || "");
    setOpeningBalance(String(p.opening_balance));
    setOpeningBalanceType(p.opening_balance_type);
    setNotes(p.notes || "");
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (!name.trim()) throw new Error("Pharmacy name is required.");
      if (!phoneNumber.trim()) throw new Error("Phone number is required.");

      const balanceNum = parseFloat(openingBalance) || 0;
      if (balanceNum < 0) throw new Error("Opening balance cannot be negative.");

      if (editingPharmacy) {
        await PharmacyService.update(editingPharmacy.id, {
          name,
          contactPerson,
          phoneNumber,
          address,
          openingBalance: balanceNum,
          openingBalanceType,
          notes,
        });
      } else {
        await PharmacyService.create({
          name,
          contactPerson,
          phoneNumber,
          address,
          openingBalance: balanceNum,
          openingBalanceType,
          notes,
        });
      }

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || "Failed to save pharmacy.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (p: Pharmacy) => {
    setPharmacyToDelete(p);
    setDeleteError(null);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!pharmacyToDelete) return;
    setIsSubmitting(true);
    setDeleteError(null);

    try {
      const txs = await TransactionService.getAll({ pharmacyId: pharmacyToDelete.id });
      const hasTransactions = txs.length > 0;

      await PharmacyService.softDelete(pharmacyToDelete.id, hasTransactions);
      setDeleteConfirmOpen(false);
      await loadData();
    } catch (err: any) {
      setDeleteError(err.message || "Cannot delete this pharmacy.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPharmacies = pharmacies.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.phone_number.toLowerCase().includes(query) ||
      (p.address && p.address.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-primary" />
            {t.pharmacies.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage partner pharmacies, contact records, and credit limits.
          </p>
        </div>

        <Button onClick={openAddModal} className="gap-2">
          <Plus className="w-4 h-4" />
          <span>{t.pharmacies.addPharmacy}</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.common.search}
          className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Pharmacies List */}
      {loading ? (
        <div className="p-12 text-center text-sm text-muted-foreground">
          {t.common.loading}
        </div>
      ) : filteredPharmacies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={pharmacies.length === 0 ? "No Pharmacies Added Yet" : "No Matching Pharmacies Found"}
          description="Create contact accounts for counterpart pharmacies to record medicine exchanges and balance statements."
          actionLabel={t.pharmacies.addPharmacy}
          onAction={openAddModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPharmacies.map((pharmacy) => {
            const bal = balances[pharmacy.id] || { netBalance: 0, status: "neutral" };
            const isPayable = bal.netBalance > 0;
            const isReceivable = bal.netBalance < 0;

            return (
              <div
                key={pharmacy.id}
                className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-base text-foreground leading-snug">
                      {pharmacy.name}
                    </h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(pharmacy)}
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-colors"
                        title={t.common.edit}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => confirmDelete(pharmacy)}
                        className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-secondary transition-colors"
                        title={t.common.delete}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{pharmacy.phone_number}</span>
                    </div>
                    {pharmacy.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="line-clamp-1">{pharmacy.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground block uppercase tracking-wider">
                      {t.pharmacies.netBalance}
                    </span>
                    <span className="text-sm font-bold block mt-0.5">
                      {formatCurrency(Math.abs(bal.netBalance))}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {isPayable ? `(${t.khata.netPayable})` : isReceivable ? `(${t.khata.netReceivable})` : `(${t.khata.settled})`}
                      </span>
                    </span>
                  </div>

                  <Link href={`/pharmacies/${pharmacy.id}`}>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{t.pharmacies.viewKhata}</span>
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Pharmacy Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPharmacy ? t.pharmacies.editPharmacy : t.pharmacies.addPharmacy}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg border border-destructive/20">
              {formError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              {t.pharmacies.name} *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. City Pharmacy"
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                {t.pharmacies.contactNumber} *
              </label>
              <input
                type="text"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0300-1234567"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Contact Person
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Manager / Owner Name"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              {t.pharmacies.address}
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Shop #, Market, City"
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                {t.pharmacies.openingBalance}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                {t.pharmacies.balanceType}
              </label>
              <select
                value={openingBalanceType}
                onChange={(e) => setOpeningBalanceType(e.target.value as OpeningBalanceType)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="neutral">{t.pharmacies.neutral}</option>
                <option value="payable">{t.pharmacies.payable}</option>
                <option value="receivable">{t.pharmacies.receivable}</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              {t.common.notes}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes or terms..."
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {t.common.save}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title={t.common.delete}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <p className="text-sm">
              {t.pharmacies.deleteWarning} <br />
              <strong className="text-foreground">{pharmacyToDelete?.name}</strong>
            </p>
          </div>

          {deleteError && (
            <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg border border-destructive/20">
              {deleteError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              isLoading={isSubmitting}
            >
              {t.common.delete}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
