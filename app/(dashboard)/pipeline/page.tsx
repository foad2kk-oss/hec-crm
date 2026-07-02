"use client";

import { useLocale } from "@/lib/i18n";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";

export default function PipelinePage() {
  const { t } = useLocale();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t.nav.pipeline}</h1>
      <KanbanBoard />
    </div>
  );
}
