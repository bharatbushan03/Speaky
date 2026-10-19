"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface PracticeModeCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
  completedSessions?: number;
  estimatedTime?: string;
  href: string;
}

export function PracticeModeCard({
  title,
  description,
  icon: Icon,
  difficulty,
  completedSessions = 0,
  estimatedTime,
  href,
}: PracticeModeCardProps) {
  const [proficiency, setProficiency] = useState<string>("intermediate");

  return (
    <Card className="transition-all hover:shadow-lg hover:border-primary/50 group">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              {difficulty && (
                <Badge variant="outline" className="mt-1">
                  {difficulty}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <CardDescription className="mt-3">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {completedSessions > 0 && (
            <span>{completedSessions} sessions completed</span>
          )}
          {estimatedTime && <span>• {estimatedTime}</span>}
        </div>

        {/* Proficiency Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Level</label>
          <Select value={proficiency} onValueChange={setProficiency}>
            <SelectTrigger>
              <SelectValue placeholder="Select your level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Action Button */}
        <Button className="w-full" asChild>
          <Link href={href}>Start Practice</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
