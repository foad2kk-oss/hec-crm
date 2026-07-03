"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ExternalLink, Loader2, Mail, Search, Sparkles, UserSearch, Users2 } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { useClients } from "@/lib/hooks/useClients";
import { useEngineers } from "@/lib/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { QuickActions } from "@/components/assistant/QuickActions";

interface DecisionMaker {
  name: string;
  title: string;
  relevance: string;
  source_link?: string | null;
}

export default function AssistantPage() {
  const { t, locale } = useLocale();
  const { clients } = useClients();
  const engineers = useEngineers();
  const [clientId, setClientId] = useState<string>("");
  const [dmText, setDmText] = useState("");
  const [dmResult, setDmResult] = useState<DecisionMaker[]>([]);
  const [similar, setSimilar] = useState<{ id: string; company_name: string; reason: string }[]>([]);
  const [engineerSuggestion, setEngineerSuggestion] = useState<{ engineer_id: string; reason: string } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [outreachFor, setOutreachFor] = useState<string | null>(null);
  const [outreachText, setOutreachText] = useState<Record<string, string>>({});

  async function searchDecisionMakersOnline() {
    if (!clientId) return;
    setLoading("dm-search");
    try {
      const res = await fetch("/api/ai/decision-makers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDmResult(data.decision_makers ?? []);
      if ((data.decision_makers ?? []).length === 0) {
        toast(locale === "ar" ? "ما لقينا نتائج موثوقة، جرّب اللصق اليدوي" : "No reliable results found, try manual paste", { icon: "ℹ️" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(null);
    }
  }

  async function extractDecisionMakersFromText() {
    if (!dmText.trim()) return;
    setLoading("dm-paste");
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

  async function draftOutreach(person: DecisionMaker, lang: "ar" | "en") {
    if (!clientId) {
      toast.error(locale === "ar" ? "اختر عميلاً أولاً" : "Select a client first");
      return;
    }
    const key = `${person.name}-${lang}`;
    setOutreachFor(key);
    try {
      const res = await fetch("/api/ai/decision-maker-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, name: person.name, title: person.title, lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOutreachText((prev) => ({ ...prev, [key]: data.text }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setOutreachFor(null);
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
    setEngineerSuggestion(null);
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

  const suggestedEngineer = engineerSuggestion ? engineers.find((e) => e.id === engineerSuggestion.engineer_id) : null;

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
              <div className="rounded-md bg-accent p-2 text-sm">
                <p className="font-medium">
                  {suggestedEngineer ? suggestedEngineer.full_name : locale === "ar" ? "(تعذّر تحديد المهندس بدقة)" : "(couldn't resolve the exact engineer)"}
                  {suggestedEngineer?.department && <span className="text-muted-foreground"> — {suggestedEngineer.department}</span>}
                </p>
                <p className="text-muted-foreground">{engineerSuggestion.reason}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserSearch className="h-4 w-4" />
            {locale === "ar" ? "استخراج صناع القرار والتواصل معهم" : "Find decision-makers & reach out"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {locale === "ar"
                ? "الطريقة 1: بحث تلقائي في الإنترنت (LinkedIn وموقع الشركة) عن صناع القرار — يحتاج عميلاً محدداً وباسم شركة حقيقي. يستهلك بحثاً حقيقياً مدفوعاً."
                : "Method 1: automatic web search (LinkedIn + company site) for decision-makers — needs a selected client with a real company name. Uses a real, paid web search."}
            </p>
            <Button size="sm" disabled={!clientId || loading === "dm-search"} onClick={searchDecisionMakersOnline}>
              {loading === "dm-search" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              {locale === "ar" ? "ابحث عن صناع القرار" : "Search decision-makers"}
            </Button>
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              {locale === "ar"
                ? "الطريقة 2 (بديلة): الصق نصاً فعلياً من صفحة LinkedIn أو موقع الشركة (أسماء ومناصب) — الاستخراج يعمل فقط على نص حقيقي ملصوق يدوياً، لا يفتح الروابط بنفسه."
                : "Method 2 (fallback): paste real text from a LinkedIn page or company site (names & titles) — extraction only works on real pasted text, it cannot open links itself."}
            </p>
            <Textarea
              rows={4}
              value={dmText}
              onChange={(e) => setDmText(e.target.value)}
              placeholder={locale === "ar" ? "الصق نصاً من LinkedIn أو موقع الشركة..." : "Paste text from LinkedIn or the company website..."}
            />
            <Button size="sm" variant="outline" disabled={loading === "dm-paste"} onClick={extractDecisionMakersFromText}>
              {loading === "dm-paste" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t.common.generate}
            </Button>
          </div>

          {dmResult.length > 0 && (
            <div className="space-y-2 border-t border-border pt-3">
              {dmResult.map((d, i) => {
                const keyAr = `${d.name}-ar`;
                const keyEn = `${d.name}-en`;
                return (
                  <div key={i} className="space-y-2 rounded-md border border-border p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-medium">{d.name}</span> — {d.title}
                        <p className="text-xs text-muted-foreground">{d.relevance}</p>
                      </div>
                      {d.source_link && (
                        <a href={d.source_link} target="_blank" rel="noopener noreferrer" className="shrink-0 text-primary">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={outreachFor === keyAr} onClick={() => draftOutreach(d, "ar")}>
                        {outreachFor === keyAr ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                        {locale === "ar" ? "رسالة عربية" : "Arabic email"}
                      </Button>
                      <Button size="sm" variant="outline" disabled={outreachFor === keyEn} onClick={() => draftOutreach(d, "en")}>
                        {outreachFor === keyEn ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                        {locale === "ar" ? "رسالة إنجليزية" : "English email"}
                      </Button>
                    </div>
                    {outreachText[keyAr] && <Textarea readOnly rows={6} value={outreachText[keyAr]} className="text-sm" />}
                    {outreachText[keyEn] && <Textarea readOnly rows={6} value={outreachText[keyEn]} className="text-sm" />}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
