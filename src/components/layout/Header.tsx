"use client";

import React, { useState, useEffect } from "react";
import { LanguageSelector } from "./LanguageSelector";
import { useLanguage } from "@/lib/i18n/context";
import { Menu, X, Pill, LogOut, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AuthService, RealUser } from "@/lib/services/authService";

export function Header() {
  const { t, isRtl } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<RealUser | null>(null);

  useEffect(() => {
    AuthService.getCurrentUser().then((u) => setUser(u));
  }, []);

  const handleSignOut = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      await AuthService.signOut();
      router.push("/login");
    }
  };

  const navigationItems = [
    { name: t.navigation.dashboard, href: "/" },
    { name: t.navigation.newTransaction, href: "/transactions/new" },
    { name: t.transactions.title, href: "/transactions" },
    { name: t.navigation.dailyKhata, href: "/khata" },
    { name: t.navigation.pharmacies, href: "/pharmacies" },
    { name: t.navigation.returns, href: "/returns" },
    { name: t.navigation.activityHistory, href: "/activity" },
    { name: t.navigation.settings, href: "/settings" },
  ];

  return (
    <header className="h-16 border-b border-border bg-card px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 no-print">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-muted-foreground hover:text-foreground rounded-md"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="md:hidden flex items-center gap-2">
          <Pill className="w-5 h-5 text-primary" />
          <span className="font-bold text-sm text-foreground">{t.common.appName}</span>
        </div>

        <div className="hidden md:block">
          <h2 className="text-sm font-semibold text-foreground">
            {t.common.appName} &bull; <span className="text-muted-foreground font-normal">{t.common.tagline}</span>
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <LanguageSelector />

        {user && (
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border text-xs">
            <span className="font-semibold text-foreground">{user.fullName}</span>
            <button
              onClick={handleSignOut}
              className="p-1.5 text-muted-foreground hover:text-destructive rounded-md transition-colors"
              title={t.navigation.logout}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 bg-background/95 backdrop-blur-sm z-40 md:hidden flex flex-col p-4 space-y-2 border-b border-border shadow-lg">
          {user && (
            <div className="p-3 mb-2 rounded-lg bg-secondary/50 border border-border flex items-center justify-between">
              <div>
                <span className="font-bold text-sm block">{user.fullName}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 text-destructive hover:bg-destructive/10 rounded-md"
                title={t.navigation.logout}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "px-4 py-3 rounded-md text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-secondary"
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
