"use client";

import { SessionConfigForm } from "@/components/practice/session-config-form";
import { usePracticeSetup } from "@/components/practice/use-practice-setup";
import { Briefcase, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HRInterviewSetupPage() {
  const { startSession, isStarting, startError } = usePracticeSetup();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-4"
          asChild
        >
          <Link href="/practice" aria-disabled={isStarting} onClick={(event) => { if (isStarting) event.preventDefault(); }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Practice
          </Link>
        </Button>

        {/* Header */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <Briefcase className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">HR Interview Practice</h1>
              <p className="text-muted-foreground mt-1">
                Master behavioral questions and professional communication
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Form — no auth gate */}
        <div className="max-w-3xl mx-auto">
          <SessionConfigForm mode="hr" onStartSession={startSession} isStarting={isStarting} startError={startError} />
        </div>
      </div>
    </div>
  );
}
