"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  GraduationCap,
  Globe,
  Briefcase,
  Code,
  ArrowRight,
  LayoutDashboard,
  History,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Volume2,
  Award,
  Zap,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";

const practiceOptions = [
  {
    title: "English Practice",
    badge: "Fluency & Conversation",
    description: "Improve everyday English speaking, active vocabulary, natural sentence flow, and pronunciation with an AI conversation partner.",
    icon: Globe,
    href: "/practice/english",
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "hover:border-blue-500/50",
  },
  {
    title: "HR & Behavioral Interview",
    badge: "Job Preparation",
    description: "Master tough behavioral questions, situational leadership, the STAR method, and workplace communication for your dream role.",
    icon: Briefcase,
    href: "/practice/hr",
    color: "text-indigo-600",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    border: "hover:border-indigo-500/50",
  },
  {
    title: "Technical Voice Interview",
    badge: "Engineering & Tech",
    description: "Practice explaining complex system architecture, technical trade-offs, algorithms, and engineering decisions with clarity.",
    icon: Code,
    href: "/practice/technical",
    color: "text-purple-600",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    border: "hover:border-purple-500/50",
  },
  {
    title: "Academic Viva Voce",
    badge: "Thesis & Defense",
    description: "Defend your academic research, thesis methodology, and core theoretical concepts under rigorous viva questioning.",
    icon: GraduationCap,
    href: "/practice/viva",
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "hover:border-emerald-500/50",
  },
];

const features = [
  {
    icon: Mic,
    title: "Real-Time Voice AI",
    description: "AI speaks questions naturally while you respond via microphone. Experience the atmosphere of a real live interview.",
  },
  {
    icon: TrendingUp,
    title: "Multi-Dimension Scoring",
    description: "Get evaluated on Grammar, Spoken Fluency, Technical Depth, Coherence, Vocabulary, and Interview Polish on a 10-point scale.",
  },
  {
    icon: Sparkles,
    title: "AI Answer Corrections",
    description: "See clear side-by-side improved versions of your answers with concrete explanations and better vocabulary suggestions.",
  },
  {
    icon: Globe,
    title: "Multilingual Coaching",
    description: "Receive explanations and feedback tips in English, Hindi, Tamil, Telugu, Bengali, or Kannada to accelerate your learning.",
  },
];

export default function Home() {
  const { session, loading } = useAuth();

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24 px-4 bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs md:text-sm font-semibold text-primary backdrop-blur">
            <Sparkles className="h-4 w-4" />
            AI-Powered Voice Interview & Communication Coach
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Speak With Confidence in Any{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Interview & Conversation
            </span>
          </h1>

          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Practice HR interviews, technical system design discussions, academic vivas, and everyday spoken English with intelligent real-time AI feedback.
          </p>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" className="h-12 px-8 text-base font-semibold shadow-lg group" asChild>
              <Link href="/practice">
                Start Practicing Free
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>

            {loading ? (
              <span className="text-sm text-muted-foreground animate-pulse">Loading profile...</span>
            ) : session ? (
              <Button size="lg" variant="outline" className="h-12 px-6 text-base font-semibold" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Link>
              </Button>
            ) : (
              <Button size="lg" variant="outline" className="h-12 px-6 text-base font-semibold" asChild>
                <Link href="/login">
                  Sign In to Track Progress
                </Link>
              </Button>
            )}
          </div>

          {/* Trust Highlights */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs md:text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Voice & Text modes
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Instant coaching reports
            </span>
          </div>
        </div>
      </section>

      {/* Practice Tracks Section */}
      <section className="py-16 px-4 bg-muted/20 border-y">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
              Choose Your Practice Track
            </h2>
            <p className="text-muted-foreground text-sm md:text-base">
              Each track is tailored with dynamic questions, role-specific evaluation criteria, and targeted coaching.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {practiceOptions.map((option) => (
              <Link key={option.title} href={option.href} className="group">
                <Card className={`h-full border-2 transition-all duration-200 hover:shadow-lg flex flex-col justify-between ${option.border}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className={`rounded-xl p-3 ${option.bg}`}>
                        <option.icon className={`h-6 w-6 ${option.color}`} />
                      </div>
                      <Badge variant="secondary" className="text-[11px]">
                        {option.badge}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                      {option.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription className="text-xs leading-relaxed text-muted-foreground">
                      {option.description}
                    </CardDescription>
                    <span className="inline-flex items-center text-xs font-semibold text-primary group-hover:underline">
                      Start practice track
                      <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Product Highlights Section */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-3 py-1 text-xs font-medium border border-emerald-200 dark:border-emerald-800">
              <Zap className="h-3.5 w-3.5" /> Built Like a Real Interview
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Everything You Need to Succeed
            </h2>
            <p className="text-muted-foreground text-sm md:text-base">
              Advanced AI coaching engineered to transform nervous speakers into clear, compelling communicators.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex items-start gap-4 p-5 rounded-xl border bg-card/60 hover:bg-card transition-colors shadow-sm"
              >
                <div className="rounded-xl bg-primary/10 p-3 text-primary shrink-0">
                  <feature.icon className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-base">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 px-4 bg-muted/30 border-t">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">How Speaky Works</h2>
            <p className="text-muted-foreground text-sm">Three easy steps to boost your speaking performance.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="p-6 rounded-2xl border bg-card space-y-3">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mx-auto text-sm">
                1
              </div>
              <h3 className="font-semibold text-base">Select Track & Level</h3>
              <p className="text-xs text-muted-foreground">
                Pick your interview role, English focus, difficulty level, and preferred language.
              </p>
            </div>

            <div className="p-6 rounded-2xl border bg-card space-y-3">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mx-auto text-sm">
                2
              </div>
              <h3 className="font-semibold text-base">Speak in Real Time</h3>
              <p className="text-xs text-muted-foreground">
                Listen to the AI interviewer ask questions out loud and speak your answers naturally.
              </p>
            </div>

            <div className="p-6 rounded-2xl border bg-card space-y-3">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mx-auto text-sm">
                3
              </div>
              <h3 className="font-semibold text-base">Get Diagnostic Report</h3>
              <p className="text-xs text-muted-foreground">
                Review scores, grammar fixes, vocabulary upgrades, and personalized coaching points.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to action footer banner */}
      <section className="py-16 px-4 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Ready to Level Up Your Communication?
          </h2>
          <p className="text-primary-foreground/80 max-w-xl mx-auto text-sm md:text-base">
            Start a free AI session in under a minute. Practice anytime, anywhere with zero pressure.
          </p>
          <Button size="lg" variant="secondary" className="font-semibold px-8 h-12 shadow-md" asChild>
            <Link href="/practice">
              Choose a Practice Track
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
