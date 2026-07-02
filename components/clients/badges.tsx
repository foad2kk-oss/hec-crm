import { Badge } from "@/components/ui/badge";
import type { LeadPriority, PipelineStage } from "@/types/database";
import type { Dictionary } from "@/lib/i18n/types";

export function PriorityBadge({ priority, t }: { priority: LeadPriority; t: Dictionary }) {
  const variant = priority === "hot" ? "destructive" : priority === "warm" ? "warning" : "secondary";
  return <Badge variant={variant as never}>{t.priority[priority]}</Badge>;
}

export function StageBadge({ stage, t }: { stage: PipelineStage; t: Dictionary }) {
  const variant = stage === "won" ? "success" : stage === "lost" ? "destructive" : "outline";
  return <Badge variant={variant as never}>{t.stages[stage]}</Badge>;
}

export function ScorePill({ score }: { score: number }) {
  const color = score >= 70 ? "text-destructive" : score >= 40 ? "text-warning" : "text-muted-foreground";
  return <span className={`text-sm font-bold ${color}`}>{score}</span>;
}
