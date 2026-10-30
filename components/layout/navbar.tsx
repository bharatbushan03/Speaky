"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";

export function Navbar() {
  const pathname = usePathname();
  const { session, loading, signOut } = useAuth();

  const active = (path: string) =>
    path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);

  const linkClass = (path: string) =>
    cn("font-medium transition-colors hover:text-primary", active(path) ? "text-foreground" : "text-muted-foreground");

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span>SpeakReady</span>
          </Link>

          <div className="flex flex-wrap items-center justify-end gap-4 text-sm">
            <Link href="/" className={linkClass("/")}>Home</Link>
            <Link href="/practice" className={linkClass("/practice")}>Practice</Link>
            {session && (
              <>
                <Link href="/dashboard" className={linkClass("/dashboard")}>Dashboard</Link>
                <Link href="/session-history" className={linkClass("/session-history")}>History</Link>
              </>
            )}
            {loading ? (
              <span className="text-muted-foreground">...</span>
            ) : session ? (
              <>
                <span className="hidden max-w-[180px] truncate text-muted-foreground sm:inline">
                  {session.user.email}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => void signOut()}>Sign out</Button>
              </>
            ) : (
              <Button asChild size="sm"><Link href="/login">Sign in</Link></Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
