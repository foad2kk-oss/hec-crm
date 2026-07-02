"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Loader2, Users2, UserSearch, Sparkles } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { useClients } from "@/lib/hooks/useClients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { QuickActions } from "@/components/assistant/QuickActions";

export default function AssistantPage() {
  const { t, locale } = useLocale();
  const { clients } = useClients();
  const [clientId, setClientId] = useState<string>("");
  const [dmText, setDmText] = useState("");
  const [dmResult, setDmResult] = useState<{ name: string; title: string; relevance: string }[]>([]);
  const [similar, setSimilar] = useState<{ id: string; company_name: string; reason: string }[]>([]);
  const [engineerSuggestion, setEngineerSuggestion] = useState<{ engineer_id: string; reason: string; name?: string } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function extractDecisionMakers() {
    if (!dmText.trim()) return;
    setLoading("dm");
    try {
      const res = await fetch("/api/ai/decision-makers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: dmText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDmResult(data.decision_makers ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(null);
    }
  }

  async function findSimilar() {
    if (!clientId) return;
    setLoading("similar");
    try {
      const res = await fetch("/api/ai/similar-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSimilar(data.similar ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(null);
    }
  }

  async function suggestEngineer() {
    if (!clientId) return;
    setLoading("engineer");
    try {
      const res = await fetch("/api/ai/suggest-engineer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEngineerSuggestion(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-bold">{t.nav.assistant}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.client.companyName}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger>
              <SelectValue placeholder={locale === "ar" ? "اختر عميلاً" : "Select a client"} />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {clientId && <QuickActions clientId={clientId} />}

      {clientId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users2 className="h-4 w-4" /> {locale === "ar" ? "شركات مشابهة" : "Similar clients"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button size="sm" variant="outline" disabled={loading === "similar"} onClick={findSimilar}>
              {loading === "similar" && <Loader2 className="h-3 w-3 animate-spin" />}
              {t.common.generate}
            </Button>
            {similar.map((s) => (
              <Link
                key={s.id}
                href={`/clients/${s.id}`}
                className="block rounded-md border border-border p-2 text-sm hover:bg-accent"
              >
                <span className="font-medium">{s.company_name}</span>
                {s.reason && <p className="text-xs text-muted-foreground">{s.reason}</p>}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {clientId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" /> {locale === "ar" ? "اقتراح مهندس للاجتماع" : "Suggest engineer for meeting"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button size="sm" variant="outline" disabled={loading === "engineer"} onClick={suggestEngineer}>
              {loading === "engineer" && <Loader2 className="h-3 w-3 animate-spin" />}
              {t.common.generate}
            </Button>
            {engineerSuggestion && (
              <p className="rounded-md bg-accent p-2 text-sm">{engineerSuggestion.reason}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserSearch className="h-4 w-4" />
            {locale === "ar" ? "استخراج صناع القرار" : "Extract decision makers"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            rows={5}
            value={dmText}
            onChange={(e) => setDmText(e.target.value)}
            placeholder={locale === "ar" ? "الصق نصاً من LinkedIn أو موقع الشركة..." : "Paste text from LinkedIn or the company website..."}
          />
          <Button size="sm" disabled={loading === "dm"} onClick={extractDecisionMakers}>
            {loading === "dm" && <Loader2 className="h-3 w-3 animate-spin" />}
            {t.common.generate}
          </Button>
          {dmResult.map((d, i) => (
            <div key={i} className="rounded-md border border-border p-2 text-sm">
              <span className="font-medium">{d.name}</span> — {d.title}
              <p className="text-xs text-muted-foreground">{d.relevance}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
