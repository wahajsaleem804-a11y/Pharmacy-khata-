"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { Locale } from "@/lib/i18n/dictionaries";
import { Button } from "@/components/ui/Button";
import { Settings, Globe, User, Building, CheckCircle, Shield, Mail } from "lucide-react";
import { ActivityService } from "@/lib/services/activityService";
import { AuthService, RealUser } from "@/lib/services/authService";

export default function SettingsPage() {
  const { t, locale, setLocale, isRtl } = useLanguage();
  const [currentUser, setCurrentUser] = useState<RealUser | null>(null);
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("0300-1234567");
  const [currency, setCurrency] = useState("Rs.");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    AuthService.getCurrentUser().then((u) => {
      if (u) {
        setCurrentUser(u);
        setFullName(u.fullName);
        setBusinessName(u.pharmacyName);
      } else {
        setFullName("Dr. Muhammad Ali");
        setBusinessName("Al-Madina Pharmacy");
      }
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);

    const userId = currentUser?.id || "real-user";
    await ActivityService.log({
      userId,
      action: "SETTINGS_UPDATE",
      tableName: "user_settings",
      recordId: userId,
      newData: { fullName, businessName, phoneNumber, language: locale, currency },
      description: `Updated store profile and language preference to: ${locale}`,
    });

    setTimeout(() => {
      setIsSaved(false);
    }, 2500);
  };

  const handleLanguageChange = (newLocale: Locale) => {
    setLocale(newLocale);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in-50 duration-300">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-primary" />
          <span>{t.settings.title}</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure multilingual localization (English, Roman Urdu, Urdu RTL) and business profile.
        </p>
      </div>

      {isSaved && (
        <div className="p-4 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-sm rounded-xl border border-emerald-200 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{t.settings.savedSuccessfully}</span>
        </div>
      )}

      {/* Language Selection Card */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {t.settings.language}
            </h2>
            <p className="text-xs text-muted-foreground">
              Choose your preferred interface language and reading direction.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* English */}
          <button
            type="button"
            onClick={() => handleLanguageChange("en")}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
              locale === "en"
                ? "border-primary bg-primary/5 ring-2 ring-primary"
                : "border-border bg-card hover:bg-secondary/40"
            }`}
          >
            <div>
              <span className="font-bold text-sm block text-foreground">English</span>
              <span className="text-xs text-muted-foreground mt-1 block">
                Standard Latin typography, Left-to-Right layout.
              </span>
            </div>
            {locale === "en" && (
              <span className="text-xs font-semibold text-primary mt-3 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Active
              </span>
            )}
          </button>

          {/* Roman Urdu */}
          <button
            type="button"
            onClick={() => handleLanguageChange("ur-ro")}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
              locale === "ur-ro"
                ? "border-primary bg-primary/5 ring-2 ring-primary"
                : "border-border bg-card hover:bg-secondary/40"
            }`}
          >
            <div>
              <span className="font-bold text-sm block text-foreground">Roman Urdu</span>
              <span className="text-xs text-muted-foreground mt-1 block">
                Urdu alfaz angrezi huroof mein, aasan samajh kay liye.
              </span>
            </div>
            {locale === "ur-ro" && (
              <span className="text-xs font-semibold text-primary mt-3 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Active
              </span>
            )}
          </button>

          {/* Urdu (RTL) */}
          <button
            type="button"
            onClick={() => handleLanguageChange("ur")}
            className={`p-4 rounded-xl border text-right transition-all flex flex-col justify-between font-urdu ${
              locale === "ur"
                ? "border-primary bg-primary/5 ring-2 ring-primary"
                : "border-border bg-card hover:bg-secondary/40"
            }`}
          >
            <div>
              <span className="font-bold text-sm block text-foreground">اردو (Urdu)</span>
              <span className="text-xs text-muted-foreground mt-1 block">
                مکمل دائیں سے بائیں (RTL) ترتیب اور اردو زبان۔
              </span>
            </div>
            {locale === "ur" && (
              <span className="text-xs font-semibold text-primary mt-3 flex items-center gap-1 justify-end">
                <CheckCircle className="w-3.5 h-3.5" /> فعال ہے
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Business Profile Card */}
      <form onSubmit={handleSave} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {t.settings.profile}
            </h2>
            <p className="text-xs text-muted-foreground">
              Your store details printed on invoices, ledger statements, and daily reports.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {currentUser?.email && (
            <div className="sm:col-span-2 p-3 bg-secondary/50 rounded-lg border border-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Signed In As:</span>
                <strong className="text-foreground">{currentUser.email}</strong>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                ID: {currentUser.id.slice(0, 8)}...
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              {t.settings.fullName}
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              {t.settings.businessName}
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              {t.settings.phone}
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Currency Symbol
            </label>
            <input
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button type="submit">
            {t.common.save} {t.settings.title}
          </Button>
        </div>
      </form>
    </div>
  );
}
