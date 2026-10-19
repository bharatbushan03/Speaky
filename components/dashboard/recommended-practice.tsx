import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

interface RecommendedItem {
  title: string;
  reason: string;
  tag: string;
  href: string;
}

const recommendations: RecommendedItem[] = [
  {
    title: "Technical Interview Practice",
    reason: "Based on your recent sessions, focus on technical terminology",
    tag: "Recommended",
    href: "/practice/technical",
  },
  {
    title: "Grammar Fundamentals",
    reason: "Strengthen your foundation with verb tenses",
    tag: "Skill Gap",
    href: "/practice/grammar",
  },
  {
    title: "Confidence Building",
    reason: "Work on reducing filler words and pauses",
    tag: "Quick Win",
    href: "/practice/fluency",
  },
];

export function RecommendedPractice() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>Recommended for You</CardTitle>
        </div>
        <CardDescription>
          AI-powered suggestions to improve your skills
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((item, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors group"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm">{item.title}</h4>
                <Badge variant="secondary" className="text-xs">
                  {item.tag}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{item.reason}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              asChild
            >
              <Link href={item.href}>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
