"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/context";
import {
  LayoutDashboard,
  PlusCircle,
  Receipt,
  BookOpen,
  Building2,
  RotateCcw,
  History,
  Settings,
  Pill,
  LogOut,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthService, RealUser } from "@/lib/services/authService";

export function Sidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, isRtl } = useLanguage();
  const [user, setUser] = useState<RealUser | null>(null);

  useEffect(() => {
    AuthService.getCurrentUser().then((u) => {
      setUser(u);
    });
  }, []);

  const handleSignOut = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      await AuthService.signOut();
      router.push("/login");
    }
  };

  const navigationItems = [
    { name: t.navigation.dashboard, href: "/", icon: LayoutDashboard },
    { name: t.navigation.newTransaction, href: "/transactions/new", icon: PlusCircle },
    { name: t.transactions.title, href: "/transactions", icon: Receipt },
    { name: t.navigation.dailyKhata, href: "/khata", icon: BookOpen },
    { name: t.navigation.pharmacies, href: "/pharmacies", icon: Building2 },
    { name: t.navigation.returns, href: "/returns", icon: RotateCcw },
    { name: t.navigation.activityHistory, href: "/activity", icon: History },
    { name: t.navigation.settings, href: "/settings", icon: Settings },
  ];

  const userInitial = user?.fullName ? user.fullName.charAt(0).toUpperCase() : "P";

  return (
    <aside
      className={cn(
        "w-64 border-r border-border bg-card flex flex-col h-screen sticky top-0 no-print select-none",
        isRtl && "border-r-0 border-l",
        className
      )}
    >
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
          <Pill className="w-5 h-5 text-primary" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight block text-foreground">
            {t.common.appName}
          </span>
          <span className="text-[11px] text-muted-foreground block line-clamp-1">
            {t.common.tagline}
          </span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Real User Profile Footer */}
      <div className="p-3 border-t border-border bg-secondary/20">
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-foreground block truncate">
                {user?.fullName || "Pharmacy Owner"}
              </span>
              <span className="text-[10px] text-muted-foreground block truncate">
                {user?.pharmacyName || user?.email || "Authenticated Account"}
              </span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-secondary rounded-md transition-colors shrink-0"
            title={t.navigation.logout}
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
