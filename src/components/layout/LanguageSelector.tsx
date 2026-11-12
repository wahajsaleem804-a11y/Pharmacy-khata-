"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n/context";
import { Locale } from "@/lib/i18n/dictionaries";
import { Globe } from "lucide-react";

export function LanguageSelector({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useLanguage();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Globe className="w-4 h-4 text-muted-foreground" />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="text-xs md:text-sm font-medium bg-card border border-border rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm cursor-pointer"
        aria-label="Select Application Language"
      >
        <option value="en">English</option>
        <option value="ur-ro">Roman Urdu</option>
        <option value="ur">اردو (Urdu)</option>
      </select>
    </div>
  );
}
