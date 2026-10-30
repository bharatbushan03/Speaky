import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Mic,
  GraduationCap,
  Globe,
  ArrowRight,
} from "lucide-react";

const practiceOptions = [
  {
    title: "English Practice",
    description: "Improve your everyday English speaking and communication skills with AI-guided conversations.",
    icon: Globe,
    href: "/practice/hr",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "Viva Preparation",
    description: "Prepare for academic vivas — practice defending your research and answering tough questions.",
    icon: GraduationCap,
    href: "/practice/viva",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    title: "Technical Voice Interview",
    description: "Practice explaining technical concepts clearly and handle voice-based technical interviews.",
    icon: Mic,
    href: "/practice/technical",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
];

export default function Home() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      {/* Simple heading */}
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          What would you like to practice?
        </h1>
        <p className="text-muted-foreground mb-4">
          Sign in to save sessions, scores, and coaching reports.
        </p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>

      {/* Practice mode cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
        {practiceOptions.map((option) => (
          <Link key={option.title} href={option.href} className="group">
            <Card className="h-full border hover:border-primary/40 hover:shadow-md transition-all">
              <CardHeader className="pb-3">
                <div className={`rounded-lg p-3 w-fit mb-3 ${option.bg}`}>
                  <option.icon className={`h-6 w-6 ${option.color}`} />
                </div>
                <CardTitle className="text-lg">{option.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm mb-4">
                  {option.description}
                </CardDescription>
                <span className="inline-flex items-center text-sm font-medium text-primary group-hover:underline">
                  Start
                  <ArrowRight className="ml-1 h-4 w-4" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
