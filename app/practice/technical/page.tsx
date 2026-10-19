"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SessionConfigForm } from "@/components/practice/session-config-form";
import { SessionSummary } from "@/components/practice/session-summary";
import { PracticeSessionConfig } from "@/lib/types/practice";
import { BookOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function TechnicalInterviewSetupPage() {
  const router = useRouter();
  const [showSummary, setShowSummary] = useState(false);
  const [sessionConfig, setSessionConfig] = useState<PracticeSessionConfig | null>(null);

  const handleStartSession = (config: PracticeSessionConfig) => {
    setSessionConfig(config);
    setShowSummary(true);

    sessionStorage.setItem("practiceSessionConfig", JSON.stringify(config));
    
    setTimeout(() => {
      router.push("/practice/room");
    }, 2000);
  };

  if (showSummary && sessionConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Preparing Your Session</h1>
              <p className="text-muted-foreground">
                Setting up your technical interview practice...
              </p>
            </div>

            <SessionSummary config={sessionConfig} />

            <div className="mt-8 text-center">
              <div className="animate-pulse space-y-2">
                <div className="h-2 bg-primary/20 rounded-full w-full" />
                <p className="text-sm text-muted-foreground">
                  Generating personalized questions...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-4"
          asChild
        >
          <Link href="/practice">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Practice
          </Link>
        </Button>

        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Technical Interview Practice</h1>
              <p className="text-muted-foreground mt-1">
                Explain complex concepts and handle technical discussions
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          <SessionConfigForm mode="technical" onStartSession={handleStartSession} />
        </div>
      </div>
    </div>
  );
}
