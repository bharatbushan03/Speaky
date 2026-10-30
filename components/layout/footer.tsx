import { GraduationCap } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-1">
          <GraduationCap className="h-4 w-4 text-primary" />
          <span className="font-medium text-foreground">SpeakReady</span>
        </div>
        <p>&copy; {new Date().getFullYear()} SpeakReady. All rights reserved.</p>
      </div>
    </footer>
  );
}
