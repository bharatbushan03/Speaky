import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, Globe, GraduationCap, ArrowRight } from "lucide-react";

const modes = [
  {
    title: "English Practice",
    description: "Improve everyday English speaking and communication skills.",
    icon: Globe,
    href: "/practice/hr",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "Viva Preparation",
    description: "Defend your research and answer academic questions confidently.",
    icon: GraduationCap,
    href: "/practice/viva",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    title: "Technical Voice Interview",
    description: "Explain technical concepts clearly in voice-based interviews.",
    icon: Mic,
    href: "/practice/technical",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
];

export default function PracticePage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-4xl w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Choose Your Practice Mode</h1>
          <p className="text-muted-foreground">
            Pick a mode to start your session.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {modes.map((mode) => (
            <Card key={mode.title} className="hover:shadow-md transition-all hover:border-primary/40">
              <CardHeader className="pb-3">
                <div className={`rounded-lg p-3 w-fit mb-3 ${mode.bg}`}>
                  <mode.icon className={`h-6 w-6 ${mode.color}`} />
                </div>
                <CardTitle className="text-lg">{mode.title}</CardTitle>
                <CardDescription>{mode.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" asChild>
                  <Link href={mode.href}>
                    Start
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
