"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, MapPin } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { useMeetings, createMeeting, type MeetingInput } from "@/lib/hooks/useMeetings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MeetingForm } from "@/components/meetings/MeetingForm";
import { formatDateTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function MeetingsPage() {
  const { t, locale } = useLocale();
  const { meetings, isLoading, mutate } = useMeetings();
  const [open, setOpen] = useState(false);

  async function handleCreate(values: MeetingInput) {
    try {
      await createMeeting(values);
      toast.success(t.common.success);
      setOpen(false);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    }
  }

  const now = Date.now();
  const upcoming = meetings.filter((m) => new Date(m.starts_at).getTime() >= now);
  const past = meetings.filter((m) => new Date(m.starts_at).getTime() < now).reverse();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t.nav.meetings}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            {t.common.add}
          </Button>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t.nav.meetings} — {t.common.new}</DialogTitle>
            </DialogHeader>
            <MeetingForm onSubmit={handleCreate} submitLabel={t.common.save} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
              {locale === "ar" ? "القادمة" : "Upcoming"}
            </h2>
            <div className="space-y-2">
              {upcoming.map((m) => (
                <Link key={m.id} href={`/meetings/${m.id}`}>
                  <Card className="transition-colors hover:bg-accent/50">
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{m.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {m.client?.company_name ?? "-"} · {formatDateTime(m.starts_at, locale)}
                        </p>
                      </div>
                      {m.location && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {m.location}
                        </span>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {upcoming.length === 0 && <p className="text-sm text-muted-foreground">{t.common.noResults}</p>}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{locale === "ar" ? "السابقة" : "Past"}</h2>
            <div className="space-y-2">
              {past.map((m) => (
                <Link key={m.id} href={`/meetings/${m.id}`}>
                  <Card className="opacity-70 transition-colors hover:bg-accent/50">
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{m.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {m.client?.company_name ?? "-"} · {formatDateTime(m.starts_at, locale)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
