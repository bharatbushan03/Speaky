"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Mic,
  LayoutDashboard,
  History,
  BookOpen,
  LogOut,
  User,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";

export function Navbar() {
  const pathname = usePathname();
  const { session, loading, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const active = (path: string) =>
    path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);

  const linkClass = (path: string) =>
    cn(
      "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
      active(path)
        ? "bg-primary/10 text-primary font-semibold"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
    );

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-xs">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold tracking-tight text-lg group"
            onClick={closeMobileMenu}
          >
            <div className="rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Mic className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-foreground text-lg leading-tight">Speaky</span>
              <span className="text-[10px] text-muted-foreground font-medium -mt-0.5">AI Interview Coach</span>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/" className={linkClass("/")}>
              Home
            </Link>
            <Link href="/practice" className={linkClass("/practice")}>
              Practice Tracks
            </Link>
            {session && (
              <>
                <Link href="/dashboard" className={linkClass("/dashboard")}>
                  Dashboard
                </Link>
                <Link href="/session-history" className={linkClass("/session-history")}>
                  History
                </Link>
              </>
            )}
          </div>

          {/* Desktop Right CTA / User State */}
          <div className="hidden md:flex items-center gap-3">
            <Button size="sm" asChild className="font-semibold shadow-sm">
              <Link href="/practice">
                Start Practice
              </Link>
            </Button>

            {loading ? (
              <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            ) : session ? (
              <div className="flex items-center gap-3 pl-2 border-l">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs">
                    {session.user.email?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
                  </div>
                  <span className="max-w-[140px] truncate text-xs text-muted-foreground font-medium">
                    {session.user.email}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void signOut()}
                  className="text-xs text-muted-foreground hover:text-destructive h-8 px-2"
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1" />
                  Sign out
                </Button>
              </div>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b bg-card px-4 pt-2 pb-6 space-y-3 shadow-lg animate-in slide-in-from-top-2">
          <div className="flex flex-col space-y-1">
            <Link
              href="/"
              className={cn("px-3 py-2 rounded-lg text-sm font-medium", active("/") ? "bg-primary/10 text-primary font-bold" : "text-foreground")}
              onClick={closeMobileMenu}
            >
              Home
            </Link>
            <Link
              href="/practice"
              className={cn("px-3 py-2 rounded-lg text-sm font-medium", active("/practice") ? "bg-primary/10 text-primary font-bold" : "text-foreground")}
              onClick={closeMobileMenu}
            >
              Practice Tracks
            </Link>
            {session && (
              <>
                <Link
                  href="/dashboard"
                  className={cn("px-3 py-2 rounded-lg text-sm font-medium", active("/dashboard") ? "bg-primary/10 text-primary font-bold" : "text-foreground")}
                  onClick={closeMobileMenu}
                >
                  Dashboard
                </Link>
                <Link
                  href="/session-history"
                  className={cn("px-3 py-2 rounded-lg text-sm font-medium", active("/session-history") ? "bg-primary/10 text-primary font-bold" : "text-foreground")}
                  onClick={closeMobileMenu}
                >
                  Session History
                </Link>
              </>
            )}
          </div>

          <div className="pt-3 border-t flex flex-col gap-2">
            <Button asChild className="w-full justify-center" onClick={closeMobileMenu}>
              <Link href="/practice">
                <Sparkles className="h-4 w-4 mr-1.5" /> Start Practice
              </Link>
            </Button>

            {session ? (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {session.user.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    closeMobileMenu();
                    void signOut();
                  }}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1" />
                  Sign out
                </Button>
              </div>
            ) : (
              <Button asChild variant="outline" className="w-full" onClick={closeMobileMenu}>
                <Link href="/login">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
