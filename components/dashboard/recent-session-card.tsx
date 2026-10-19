import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecentSessionCardProps {
  title: string;
  type: string;
  score: number;
  date: string;
  duration: string;
  improvements?: string[];
}

export function RecentSessionCard({
  title,
  type,
  score,
  date,
  duration,
  improvements = [],
}: RecentSessionCardProps) {
  const scoreColor = score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-600";

  return (
    <Card className="hover:shadow-md transition-all cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-semibold text-sm mb-1">{title}</h4>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {type}
              </Badge>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {duration}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className={cn("text-2xl font-bold", scoreColor)}>
              {score}
            </div>
            <div className="text-xs text-muted-foreground">Score</div>
          </div>
        </div>

        <Progress value={score} className="mb-3" />

        {improvements.length > 0 && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3 mt-0.5 flex-shrink-0 text-green-600" />
            <span>{improvements.join(", ")}</span>
          </div>
        )}

        <div className="text-xs text-muted-foreground mt-2">{date}</div>
      </CardContent>
    </Card>
  );
}
