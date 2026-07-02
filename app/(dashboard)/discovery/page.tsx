"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Sparkles, ExternalLink, Check, X, Loader2 } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { useDiscoveredLeads, convertDiscoveredLead, dismissDiscoveredLead } from "@/lib/hooks/useDiscoveredLeads";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatCurrency } from "@/lib/utils";

export default function DiscoveryPage() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const { leads, isLoading, mutate } = useDiscoveredLeads();
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<"new" | "reviewed" | "converted" | "dismissed" | "all">("new");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function runDiscovery() {
    setRunning(true);
    try {
      const res = await fetch("/api/leads/discover", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(
        locale === "ar"
          ? `تم فحص ${data.queriesRun} مصدر، وإضافة ${data.leadsInserted} فرصة جديدة`
          : `Scanned ${data.queriesRun} sources, found ${data.leadsInserted} new leads`
      );
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setRunning(false);
    }
  }

  async function handleConvert(lead: (typeof leads)[number]) {
    setBusyId(lead.id);
    try {
      const client = await convertDiscoveredLead(lead);
      toast.success(t.common.success);
      mutate();
      router.push(`/clients/${client.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDismiss(id: string) {
    setBusyId(id);
    try {
      await dismissDiscoveredLead(id);
      mutate();
    } finally {
      setBusyId(null);
    }
  }

  const filtered = filter === "all" ? leads : leads.filter((l) => l.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{t.nav.discovery}</h1>
        <Button onClick={runDiscovery} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {locale === "ar" ? "تشغيل البحث الآن" : "Run discovery now"}
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="new">{locale === "ar" ? "جديد" : "New"}</TabsTrigger>
          <TabsTrigger value="converted">{locale === "ar" ? "محوّل" : "Converted"}</TabsTrigger>
          <TabsTrigger value="dismissed">{t.common.dismiss}</TabsTrigger>
          <TabsTrigger value="all">{t.common.all}</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.common.noResults}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lead) => (
            <Card key={lead.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{lead.company}</CardTitle>
                  {lead.confidence_score !== null && (
                    <Badge variant={lead.confidence_score >= 70 ? "destructive" : "secondary"}>
                      {lead.confidence_score}%
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {lead.industry ?? "-"} · {lead.location ?? "-"} · {formatDate(lead.date_found, locale)}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {lead.project && <p className="text-sm font-medium">{lead.project}</p>}
                {lead.ai_summary && <p className="text-sm text-muted-foreground">{lead.ai_summary}</p>}
                {lead.investment_value && (
                  <p className="text-sm">
                    {locale === "ar" ? "قيمة الاستثمار: " : "Investment: "}
                    {formatCurrency(lead.investment_value, locale)}
                  </p>
                )}
                {lead.suggested_action && (
                  <p className="rounded-md bg-accent p-2 text-xs">{lead.suggested_action}</p>
                )}
                <div className="flex items-center justify-between pt-1">
                  {lead.source_link ? (
                    <a
                      href={lead.source_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {locale === "ar" ? "المصدر" : "Source"}
                    </a>
                  ) : (
                    <span />
                  )}
                  {lead.status === "new" && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" disabled={busyId === lead.id} onClick={() => handleDismiss(lead.id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" disabled={busyId === lead.id} onClick={() => handleConvert(lead)}>
                        <Check className="h-3.5 w-3.5" />
                        {t.common.convert}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
