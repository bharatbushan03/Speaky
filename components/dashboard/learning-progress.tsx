import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface SkillProgress {
  name: string;
  level: number;
  color: string;
}

const skills: SkillProgress[] = [
  { name: "Grammar", level: 75, color: "bg-blue-500" },
  { name: "Fluency", level: 60, color: "bg-green-500" },
  { name: "Vocabulary", level: 82, color: "bg-purple-500" },
  { name: "Pronunciation", level: 55, color: "bg-yellow-500" },
  { name: "Confidence", level: 68, color: "bg-pink-500" },
];

export function LearningProgress() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Learning Progress</CardTitle>
        <CardDescription>Your skill development across key areas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {skills.map((skill) => (
          <div key={skill.name} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{skill.name}</span>
              <span className="text-muted-foreground">{skill.level}%</span>
            </div>
            <Progress value={skill.level} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
