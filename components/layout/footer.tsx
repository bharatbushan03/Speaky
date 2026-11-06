import Link from "next/link";
import { Mic, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-card/60 backdrop-blur">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
              <Mic className="h-4 w-4" />
            </div>
            <span className="font-bold text-foreground">Speaky AI</span>
            <span className="text-xs">&mdash; Master your interviews and conversational English</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs">
            <Link href="/practice/english" className="hover:text-foreground transition-colors">
              English Practice
            </Link>
            <Link href="/practice/hr" className="hover:text-foreground transition-colors">
              HR Interview
            </Link>
            <Link href="/practice/technical" className="hover:text-foreground transition-colors">
              Technical Interview
            </Link>
            <Link href="/practice/viva" className="hover:text-foreground transition-colors">
              Academic Viva
            </Link>
          </div>

          <p className="text-xs">
            &copy; {new Date().getFullYear()} Speaky. Built for confident communication.
          </p>
        </div>
      </div>
    </footer>
  );
}
