import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, BookOpen, GraduationCap, MessageSquare, ArrowRight } from "lucide-react";

export default function PracticePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Choose Your Practice Mode</h1>
            <p className="text-muted-foreground">
              Select a practice mode to configure your personalized session
            </p>
          </div>
          
          {/* Practice Modes Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* HR Interview */}
            <Card className="hover:shadow-lg transition-all hover:border-primary/50 group">
              <CardHeader>
                <div className="flex items-start justify-between mb-3">
                  <div className="rounded-lg bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                    <Briefcase className="h-6 w-6 text-primary" />
                  </div>
                  <Badge variant="secondary">Popular</Badge>
                </div>
                <CardTitle className="text-xl">HR Interview</CardTitle>
                <CardDescription>
                  Master behavioral questions, company culture fit, and professional communication
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full group-hover:bg-primary/90" asChild>
                  <Link href="/practice/hr">
                    Configure Session
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Technical Interview */}
            <Card className="hover:shadow-lg transition-all hover:border-primary/50 group">
              <CardHeader>
                <div className="flex items-start justify-between mb-3">
                  <div className="rounded-lg bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <Badge variant="secondary">Advanced</Badge>
                </div>
                <CardTitle className="text-xl">Technical Interview</CardTitle>
                <CardDescription>
                  Explain complex concepts clearly and handle technical discussions with confidence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full group-hover:bg-primary/90" asChild>
                  <Link href="/practice/technical">
                    Configure Session
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Academic Viva */}
            <Card className="hover:shadow-lg transition-all hover:border-primary/50 group">
              <CardHeader>
                <div className="flex items-start justify-between mb-3">
                  <div className="rounded-lg bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                    <GraduationCap className="h-6 w-6 text-primary" />
                  </div>
                  <Badge variant="secondary">Academic</Badge>
                </div>
                <CardTitle className="text-xl">Academic Viva</CardTitle>
                <CardDescription>
                  Defend research, present findings, and answer academic questions professionally
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full group-hover:bg-primary/90" asChild>
                  <Link href="/practice/viva">
                    Configure Session
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Coming Soon */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-4">Coming Soon</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="opacity-60">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Free Conversation</CardTitle>
                  </div>
                  <CardDescription>
                    Practice general English communication skills in natural conversations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" disabled>
                    Coming Soon
                  </Button>
                </CardContent>
              </Card>

              <Card className="opacity-60">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Grammar & Vocabulary</CardTitle>
                  </div>
                  <CardDescription>
                    Focus on specific grammar rules and vocabulary building exercises
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" disabled>
                    Coming Soon
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
