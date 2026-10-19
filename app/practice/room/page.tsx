"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PracticeSessionConfig } from "@/lib/types/practice";
import { Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PracticeRoomPage() {
  const router = useRouter();
  const [config, setConfig] = useState<PracticeSessionConfig | null>(null);

  useEffect(() => {
    // Load configuration from sessionStorage
    const storedConfig = sessionStorage.getItem("practiceSessionConfig");
    if (storedConfig) {
      setConfig(JSON.parse(storedConfig));
    } else {
      // If no config found, redirect to practice selection
      router.push("/practice");
    }
  }, [router]);

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your practice session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" className="mb-4" asChild>
            <Link href="/practice">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Exit Practice
            </Link>
          </Button>

          <Card className="border-2 border-primary/20">
            <CardHeader className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Practice Room - Coming Soon</CardTitle>
              <CardDescription className="text-base">
                The interactive practice room with AI-powered questions and feedback is under development
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                <h3 className="font-semibold text-lg">Your Session Configuration:</h3>
                <div className="grid gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mode:</span>
                    <span className="font-medium capitalize">{config.mode}</span>
                  </div>
                  {config.jobRole && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Job Role:</span>
                      <span className="font-medium">{config.jobRole}</span>
                    </div>
                  )}
                  {config.subject && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subject:</span>
                      <span className="font-medium">{config.subject}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Proficiency:</span>
                    <span className="font-medium capitalize">{config.proficiencyLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Difficulty:</span>
                    <span className="font-medium capitalize">{config.difficulty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mode:</span>
                    <span className="font-medium capitalize">{config.interactionMode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Questions:</span>
                    <span className="font-medium">{config.questionCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Language:</span>
                    <span className="font-medium capitalize">{config.explanationLanguage}</span>
                  </div>
                  {config.topicFocus && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Topic Focus:</span>
                      <span className="font-medium">{config.topicFocus}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  This configuration has been saved and is ready for the practice room implementation.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button variant="outline" asChild>
                    <Link href="/practice">Return to Practice</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/dashboard">Go to Dashboard</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
