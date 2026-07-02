"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { ArrowRight, RefreshCw, Trash2 } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { useClient, updateClientRecord, deleteClientRecord } from "@/lib/hooks/useClients";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientForm } from "@/components/clients/ClientForm";
import { AttachmentsPanel } from "@/components/clients/AttachmentsPanel";
import { QuickActions } from "@/components/assistant/QuickActions";
import { StageBadge, PriorityBadge, ScorePill } from "@/components/clients/badges";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClientFormValues } from "@/lib/validations/client";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useLocale();
  const { client, isLoading, mutate } = useClient(id);
  const [rescoring, setRescoring] = useState(false);

  async function handleUpdate(values: ClientFormValues) {
    try {
      await updateClientRecord(id, values);
      toast.success(t.common.success);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    }
  }

  async function handleRescore() {
    setRescoring(true);
    try {
      const res = await fetch("/api/leads/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(t.common.success);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setRescoring(false);
    }
  }

  async function handleDelete() {
    if (!confirm(locale === "ar" ? "هل أنت متأكد من الحذف؟" : "Are you sure?")) return;
    await deleteClientRecord(id);
    router.push("/clients");
  }

  if (isLoading || !client) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/clients")}>
            <ArrowRight className={locale === "ar" ? "" : "rotate-180"} />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{client.company_name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <ScorePill score={client.lead_score} />
              <PriorityBadge priority={client.priority} t={t} />
              <StageBadge stage={client.current_stage} t={t} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={rescoring} onClick={handleRescore}>
            <RefreshCw className={`h-4 w-4 ${rescoring ? "animate-spin" : ""}`} />
            {locale === "ar" ? "إعادة التقييم" : "Rescore"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive">
            <Trash2 className="h-4 w-4" />
            {t.common.delete}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">{t.common.edit}</TabsTrigger>
          <TabsTrigger value="attachments">{t.client.attachments}</TabsTrigger>
          <TabsTrigger value="ai">{t.nav.assistant}</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="pt-4">
          <ClientForm defaultValues={client} onSubmit={handleUpdate} submitLabel={t.common.save} />
        </TabsContent>
        <TabsContent value="attachments" className="pt-4">
          <AttachmentsPanel clientId={client.id} />
        </TabsContent>
        <TabsContent value="ai" className="pt-4">
          <QuickActions clientId={client.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
