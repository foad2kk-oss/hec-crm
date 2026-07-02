"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n";
import { useEngineers } from "@/lib/hooks/useProfile";
import { useClients } from "@/lib/hooks/useClients";
import type { TaskInput } from "@/lib/hooks/useTasks";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const PRIORITY_LABELS: Record<string, { ar: string; en: string }> = {
  low: { ar: "منخفضة", en: "Low" },
  medium: { ar: "متوسطة", en: "Medium" },
  high: { ar: "عالية", en: "High" },
  urgent: { ar: "عاجلة", en: "Urgent" },
};

export function TaskForm({ onSubmit, submitLabel }: { onSubmit: (v: TaskInput) => Promise<void>; submitLabel: string }) {
  const { t, locale } = useLocale();
  const engineers = useEngineers();
  const { clients } = useClients();
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<TaskInput>({
    title: "",
    description: "",
    assigned_to: null,
    client_id: null,
    due_date: null,
    priority: "medium",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>{locale === "ar" ? "عنوان المهمة" : "Task title"}</Label>
        <Input required value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>{t.client.notes}</Label>
        <Textarea rows={2} value={values.description ?? ""} onChange={(e) => setValues({ ...values, description: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>{locale === "ar" ? "المسؤول" : "Assigned to"}</Label>
        <Select value={values.assigned_to ?? undefined} onValueChange={(v) => setValues({ ...values, assigned_to: v })}>
          <SelectTrigger>
            <SelectValue placeholder="-" />
          </SelectTrigger>
          <SelectContent>
            {engineers.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>{t.client.companyName}</Label>
        <Select value={values.client_id ?? undefined} onValueChange={(v) => setValues({ ...values, client_id: v })}>
          <SelectTrigger>
            <SelectValue placeholder="-" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.company_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>{locale === "ar" ? "تاريخ الاستحقاق" : "Due date"}</Label>
        <Input type="date" value={values.due_date ?? ""} onChange={(e) => setValues({ ...values, due_date: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>{locale === "ar" ? "الأولوية" : "Priority"}</Label>
        <Select value={values.priority} onValueChange={(v) => setValues({ ...values, priority: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {locale === "ar" ? PRIORITY_LABELS[p].ar : PRIORITY_LABELS[p].en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" disabled={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
