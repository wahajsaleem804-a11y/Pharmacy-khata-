"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Pill, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground text-center">
      <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
        <Pill className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight mb-2">404</h1>
      <h2 className="text-lg font-semibold text-foreground mb-1">Page Not Found</h2>
      <p className="text-xs text-muted-foreground max-w-sm mb-6">
        The page you are looking for does not exist in Pharmacy Khata or has been moved.
      </p>
      <Link href="/">
        <Button className="gap-2">
          <Home className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Button>
      </Link>
    </div>
  );
}
