"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { ArrowRight, CalendarPlus, Download, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { useEngineers } from "@/lib/hooks/useProfile";
import {
  useMeeting,
  updateMeeting,
  deleteMeeting,
  addActionItem,
  toggleActionItem,
} from "@/lib/hooks/useMeetings";
import { generateMeetingMinutesPdf } from "@/lib/pdf";
import { saveGeneratedPdf } from "@/lib/hooks/useDocuments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useLocale();
  const { meeting, isLoading, mutate } = useMeeting(id);
  const engineers = useEngineers();
  const [minutes, setMinutes] = useState("");
  const [savingMinutes, setSavingMinutes] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [newItem, setNewItem] = useState("");

  if (isLoading || !meeting) {
    return <Skeleton className="h-96 w-full" />;
  }

  async function saveMinutes() {
    setSavingMinutes(true);
    try {
      await updateMeeting(id, { minutes: minutes || meeting!.minutes || "" });
      toast.success(t.common.success);
      mutate();
    } finally {
      setSavingMinutes(false);
    }
  }

  async function summarize() {
    setSummarizing(true);
    try {
      const res = await fetch("/api/ai/meeting-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: id, notes: minutes || meeting!.agenda }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMinutes(data.text);
      mutate();
      toast.success(t.common.success);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setSummarizing(false);
    }
  }

  async function syncCalendar() {
    setSyncing(true);
    try {
      const res = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(t.common.success);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setSyncing(false);
    }
  }

  async function handleAddItem() {
    if (!newItem.trim()) return;
    await addActionItem(id, newItem.trim(), null, null);
    setNewItem("");
    mutate();
  }

  async function handleDelete() {
    if (!confirm(locale === "ar" ? "هل أنت متأكد؟" : "Are you sure?")) return;
    await deleteMeeting(id);
    router.push("/meetings");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/meetings")}>
            <ArrowRight className={locale === "ar" ? "" : "rotate-180"} />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{meeting.title}</h1>
            <p className="text-sm text-muted-foreground">
              {meeting.client?.company_name} · {formatDateTime(meeting.starts_at, locale)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={syncing} onClick={syncCalendar}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
            {meeting.google_event_id ? (locale === "ar" ? "مُزامَن" : "Synced") : (locale === "ar" ? "مزامنة" : "Sync")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{locale === "ar" ? "جدول الأعمال" : "Agenda"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{meeting.agenda || "-"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">{locale === "ar" ? "محضر الاجتماع" : "Minutes"}</CardTitle>
          <Button size="sm" variant="outline" disabled={summarizing} onClick={summarize}>
            {summarizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {locale === "ar" ? "تلخيص بالذكاء الاصطناعي" : "AI summarize"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            rows={8}
            defaultValue={meeting.minutes ?? ""}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder={locale === "ar" ? "اكتب ملاحظاتك هنا..." : "Write your notes here..."}
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const doc = generateMeetingMinutesPdf(meeting, meeting.client?.company_name ?? "-");
                const blob = doc.output("blob");
                doc.save(`${meeting.title}-minutes.pdf`);
                if (meeting.client_id) {
                  await saveGeneratedPdf(blob, meeting.client_id, `${meeting.title} Minutes`, "meeting_minutes");
                }
              }}
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </Button>
            <Button size="sm" disabled={savingMinutes} onClick={saveMinutes}>
              {t.common.save}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{locale === "ar" ? "بنود العمل" : "Action items"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {meeting.action_items?.map((item) => (
            <div key={item.id} className="flex items-center gap-2 rounded-md border border-border p-2">
              <Checkbox
                checked={item.done}
                onCheckedChange={(v) => {
                  toggleActionItem(item.id, !!v);
                  mutate();
                }}
              />
              <span className={item.done ? "text-sm line-through text-muted-foreground" : "text-sm"}>
                {item.description}
              </span>
              {item.assigned_to && (
                <span className="ms-auto text-xs text-muted-foreground">
                  {engineers.find((e) => e.id === item.assigned_to)?.full_name}
                </span>
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder={locale === "ar" ? "بند عمل جديد" : "New action item"}
              onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
            />
            <Button size="icon" variant="outline" onClick={handleAddItem}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
