"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { useTasks, createTask, updateTaskProgress, updateTaskStatus, deleteTask, type TaskInput } from "@/lib/hooks/useTasks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TaskForm } from "@/components/tasks/TaskForm";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, daysUntil } from "@/lib/utils";
import type { TaskStatus } from "@/types/database";

const COLUMNS: { key: TaskStatus; ar: string; en: string }[] = [
  { key: "todo", ar: "قيد الانتظار", en: "To do" },
  { key: "in_progress", ar: "قيد التنفيذ", en: "In progress" },
  { key: "done", ar: "منجزة", en: "Done" },
];

const PRIORITY_VARIANT: Record<string, "secondary" | "warning" | "destructive"> = {
  low: "secondary",
  medium: "secondary",
  high: "warning",
  urgent: "destructive",
};

export default function TasksPage() {
  const { t, locale } = useLocale();
  const { tasks, isLoading, mutate } = useTasks();
  const [open, setOpen] = useState(false);

  async function handleCreate(values: TaskInput) {
    try {
      await createTask(values);
      toast.success(t.common.success);
      setOpen(false);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t.nav.tasks}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            {t.common.add}
          </Button>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t.nav.tasks} — {t.common.new}</DialogTitle>
            </DialogHeader>
            <TaskForm onSubmit={handleCreate} submitLabel={t.common.save} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.key} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">{locale === "ar" ? col.ar : col.en}</h2>
              <div className="space-y-2">
                {tasks
                  .filter((task) => task.status === col.key)
                  .map((task) => {
                    const overdue = task.due_date && daysUntil(task.due_date)! < 0 && task.status !== "done";
                    return (
                      <Card key={task.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-sm">{task.title}</CardTitle>
                            <Badge variant={PRIORITY_VARIANT[task.priority]}>{task.priority}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            {task.assignee?.full_name ?? "-"} {task.client ? `· ${task.client.company_name}` : ""}
                          </p>
                          {task.due_date && (
                            <p className={`text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                              {formatDate(task.due_date, locale)}
                            </p>
                          )}
                          <Progress value={task.progress} />
                          <div className="flex items-center justify-between">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={10}
                              defaultValue={task.progress}
                              className="w-full"
                              onMouseUp={async (e) => {
                                const val = Number((e.target as HTMLInputElement).value);
                                await updateTaskProgress(task.id, val);
                                mutate();
                              }}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={async () => {
                                await deleteTask(task.id);
                                mutate();
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                          {col.key !== "done" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={async () => {
                                const next = col.key === "todo" ? "in_progress" : "done";
                                await updateTaskStatus(task.id, next);
                                mutate();
                              }}
                            >
                              {locale === "ar" ? "نقل للأمام" : "Move forward"}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
