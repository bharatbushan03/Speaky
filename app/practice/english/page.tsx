"use client";

import { SessionConfigForm } from "@/components/practice/session-config-form";
import { usePracticeSetup } from "@/components/practice/use-practice-setup";
import { Globe, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function EnglishPracticeSetupPage() {
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
          <Link
            href="/practice"
            aria-disabled={isStarting}
            onClick={(event) => {
              if (isStarting) event.preventDefault();
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Practice Modes
          </Link>
        </Button>

        {/* Header */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="rounded-2xl bg-blue-500/10 p-3.5 ring-1 ring-blue-500/20">
              <Globe className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-bold">English Practice</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                  <Sparkles className="h-3 w-3" /> Fluency & Accent
                </span>
              </div>
              <p className="text-muted-foreground mt-1">
                Improve your conversational English, expand active vocabulary, and build natural speaking fluency
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Form */}
        <div className="max-w-3xl mx-auto">
          <SessionConfigForm
            mode="english"
            onStartSession={startSession}
            isStarting={isStarting}
            startError={startError}
          />
        </div>
      </div>
    </div>
  );
}

