"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Code,
  GraduationCap,
  Globe,
  ArrowRight,
  Clock,
  Sparkles,
  CheckCircle2,
  Mic,
} from "lucide-react";

const modes = [
  {
    id: "english",
    title: "English Practice",
    badge: "Fluency & Everyday",
    description: "Improve everyday conversational fluency, sentence structure, pronunciation, and active vocabulary with an AI partner.",
    icon: Globe,
    href: "/practice/english",
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "hover:border-blue-500/50",
    features: ["Natural conversation", "Real-time grammar feedback", "Vocabulary expansion"],
    time: "5-15 mins",
  },
  {
    id: "hr",
    title: "HR & Behavioral Interview",
    badge: "Most Popular",
    description: "Master common behavioral questions, the STAR method, leadership dilemmas, and salary/career conversations.",
    icon: Briefcase,
    href: "/practice/hr",
    color: "text-indigo-600",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    border: "hover:border-indigo-500/50",
    features: ["STAR method coaching", "Conflict resolution", "Career story delivery"],
    time: "10-20 mins",
  },
  {
    id: "technical",
    title: "Technical Voice Interview",
    badge: "Engineering & Tech",
    description: "Practice explaining complex system architecture, technical trade-offs, coding logic, and project decisions out loud.",
    icon: Code,
    href: "/practice/technical",
    color: "text-purple-600",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    border: "hover:border-purple-500/50",
    features: ["System design questions", "Technical correctness scoring", "Trade-off articulation"],
    time: "15-25 mins",
  },
  {
    id: "viva",
    title: "Academic Viva Voce",
    badge: "Research & Defense",
    description: "Prepare for undergraduate, master's, or doctoral thesis defense and oral exams with challenging conceptual questions.",
    icon: GraduationCap,
    href: "/practice/viva",
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "hover:border-emerald-500/50",
    features: ["Methodology defense", "Analytical depth probing", "Academic tone refinement"],
    time: "10-20 mins",
  },
];

export default function PracticePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Interactive AI Practice Tracks
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Choose Your Practice Track
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Pick a specialized simulation to sharpen your English speaking, ace job interviews, or defend your academic thesis.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {modes.map((mode) => (
            <Card
              key={mode.id}
              className={`flex flex-col justify-between transition-all duration-200 border-2 hover:shadow-lg ${mode.border}`}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className={`rounded-xl p-3 ${mode.bg}`}>
                    <mode.icon className={`h-7 w-7 ${mode.color}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs font-medium">
                      {mode.badge}
                    </Badge>
                    <span className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      {mode.time}
                    </span>
                  </div>
                </div>
                <CardTitle className="text-xl md:text-2xl font-bold">
                  {mode.title}
                </CardTitle>
                <CardDescription className="text-sm mt-1 leading-relaxed">
                  {mode.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0 space-y-5">
                <ul className="space-y-2 border-t pt-4">
                  {mode.features.map((feature) => (
                    <li key={feature} className="flex items-center text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mr-2 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button className="w-full font-semibold group" size="lg" asChild>
                  <Link href={mode.href}>
                    Start {mode.title}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom Banner */}
        <div className="rounded-2xl border bg-card/60 p-6 md:p-8 backdrop-blur shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="font-semibold text-lg flex items-center justify-center md:justify-start gap-2">
              <Mic className="h-5 w-5 text-emerald-600" />
              Real-Time Voice AI or Typing Supported
            </h3>
            <p className="text-sm text-muted-foreground">
              Practice speaking naturally with voice speech recognition, or type your answers if you prefer quiet practice.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard">View My Progress</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
