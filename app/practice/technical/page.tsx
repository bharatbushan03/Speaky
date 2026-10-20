"use client";

import { SessionConfigForm } from "@/components/practice/session-config-form";
import { PracticeAuth } from "@/components/practice/practice-auth";
import { usePracticeSetup } from "@/components/practice/use-practice-setup";
import { BookOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function TechnicalInterviewSetupPage() {
  const { startSession, isStarting, startError } = usePracticeSetup();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
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
          <PracticeAuth>
            <SessionConfigForm mode="technical" onStartSession={startSession} isStarting={isStarting} startError={startError} />
          </PracticeAuth>
        </div>
      </div>
    </div>
  );
}
