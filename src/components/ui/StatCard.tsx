import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  trend?: "up" | "down" | "neutral";
  variant?: "default" | "payable" | "receivable" | "neutral";
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  variant = "default",
  className,
}: StatCardProps) {
  const variantStyles = {
    default: "border-border bg-card text-foreground",
    payable: "border-amber-200 bg-amber-50/50 text-amber-950 dark:bg-amber-950/20 dark:border-amber-900/40",
    receivable: "border-blue-200 bg-blue-50/50 text-blue-950 dark:bg-blue-950/20 dark:border-blue-900/40",
    neutral: "border-emerald-200 bg-emerald-50/50 text-emerald-950 dark:bg-emerald-950/20 dark:border-emerald-900/40",
  };

  const iconStyles = {
    default: "bg-primary/10 text-primary",
    payable: "bg-amber-100 text-amber-700",
    receivable: "bg-blue-100 text-blue-700",
    neutral: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-5 shadow-sm transition-all hover:shadow-md flex flex-col justify-between",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className={cn("p-2 rounded-lg", iconStyles[variant])}>
          <Icon className="w-5 h-5 shrink-0" />
        </div>
      </div>

      <div className="mt-4">
        <div className="text-2xl md:text-3xl font-bold tracking-tight">{value}</div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
