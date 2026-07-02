"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n";
import { useClients } from "@/lib/hooks/useClients";
import { useEngineers } from "@/lib/hooks/useProfile";
import type { MeetingInput } from "@/lib/hooks/useMeetings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function MeetingForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: Partial<MeetingInput>;
  onSubmit: (values: MeetingInput) => Promise<void>;
  submitLabel: string;
}) {
  const { t, locale } = useLocale();
  const { clients } = useClients();
  const engineers = useEngineers();
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<MeetingInput>({
    title: defaultValues?.title ?? "",
    client_id: defaultValues?.client_id ?? null,
    starts_at: defaultValues?.starts_at ?? "",
    ends_at: defaultValues?.ends_at ?? "",
    location: defaultValues?.location ?? "",
    agenda: defaultValues?.agenda ?? "",
    assigned_engineer_id: defaultValues?.assigned_engineer_id ?? null,
    attendees: defaultValues?.attendees ?? [],
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
        <Label>{locale === "ar" ? "عنوان الاجتماع" : "Meeting title"}</Label>
        <Input required value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} />
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
        <Label>{t.client.assignedEngineer}</Label>
        <Select
          value={values.assigned_engineer_id ?? undefined}
          onValueChange={(v) => setValues({ ...values, assigned_engineer_id: v })}
        >
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
        <Label>{locale === "ar" ? "البداية" : "Starts at"}</Label>
        <Input
          type="datetime-local"
          required
          value={values.starts_at}
          onChange={(e) => setValues({ ...values, starts_at: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{locale === "ar" ? "النهاية" : "Ends at"}</Label>
        <Input
          type="datetime-local"
          required
          value={values.ends_at}
          onChange={(e) => setValues({ ...values, ends_at: e.target.value })}
        />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label>{locale === "ar" ? "الموقع" : "Location"}</Label>
        <Input value={values.location ?? ""} onChange={(e) => setValues({ ...values, location: e.target.value })} />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label>{locale === "ar" ? "جدول الأعمال" : "Agenda"}</Label>
        <Textarea rows={3} value={values.agenda ?? ""} onChange={(e) => setValues({ ...values, agenda: e.target.value })} />
      </div>

      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" disabled={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
