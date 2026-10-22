"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span>SpeakReady AI</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive("/") ? "text-foreground" : "text-muted-foreground"
              )}
            >
              Home
            </Link>
            <Link
              href="/dashboard"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive("/dashboard") ? "text-foreground" : "text-muted-foreground"
              )}
            >
              Dashboard
            </Link>
            <Link
              href="/practice"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive("/practice") ? "text-foreground" : "text-muted-foreground"
              )}
            >
              Practice
            </Link>
            <Link
              href="/session-history"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive("/session-history") ? "text-foreground" : "text-muted-foreground"
              )}
            >
              History
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
              <Link href="/dashboard">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/practice">Start Free</Link>
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-5 overflow-x-auto pb-3 text-sm md:hidden">
          <Link href="/" className="whitespace-nowrap text-muted-foreground hover:text-foreground">Home</Link>
          <Link href="/dashboard" className="whitespace-nowrap text-muted-foreground hover:text-foreground">Dashboard</Link>
          <Link href="/practice" className="whitespace-nowrap text-muted-foreground hover:text-foreground">Practice</Link>
          <Link href="/session-history" className="whitespace-nowrap text-muted-foreground hover:text-foreground">History</Link>
        </div>
      </div>
    </nav>
  );
}
