"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import toast from "react-hot-toast";
import { useLocale } from "@/lib/i18n";
import { useClients, updateClientStage } from "@/lib/hooks/useClients";
import { PIPELINE_STAGES, type Client, type PipelineStage } from "@/types/database";
import { PriorityBadge, ScorePill } from "@/components/clients/badges";
import { formatCurrency, cn } from "@/lib/utils";

function ClientCard({ client }: { client: Client }) {
  const { t, locale } = useLocale();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: client.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab rounded-md border border-border bg-card p-3 text-sm shadow-sm active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
    >
      <Link href={`/clients/${client.id}`} className="font-medium hover:underline" onClick={(e) => isDragging && e.preventDefault()}>
        {client.company_name}
      </Link>
      <div className="mt-1 flex items-center justify-between">
        <ScorePill score={client.lead_score} />
        <PriorityBadge priority={client.priority} t={t} />
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{formatCurrency(client.expected_revenue, locale)}</div>
    </div>
  );
}

function StageColumn({ stage, clients }: { stage: PipelineStage; clients: Client[] }) {
  const { t } = useLocale();
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/40 p-2",
        isOver && "ring-2 ring-primary"
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-semibold">{t.stages[stage]}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{clients.length}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {clients.map((c) => (
          <ClientCard key={c.id} client={c} />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard() {
  const { clients, mutate } = useClients();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const clientId = String(active.id);
    const newStage = String(over.id) as PipelineStage;
    const client = clients.find((c) => c.id === clientId);
    if (!client || client.current_stage === newStage) return;

    mutate(
      clients.map((c) => (c.id === clientId ? { ...c, current_stage: newStage } : c)),
      false
    );
    try {
      await updateClientStage(clientId, newStage);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
      mutate();
    }
  }

  const activeClient = clients.find((c) => c.id === activeId);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => (
          <StageColumn key={stage} stage={stage} clients={clients.filter((c) => c.current_stage === stage)} />
        ))}
      </div>
      <DragOverlay>{activeClient && <ClientCard client={activeClient} />}</DragOverlay>
    </DndContext>
  );
}
