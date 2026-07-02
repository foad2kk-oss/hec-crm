"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Loader2, Sparkles } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StageBadge, PriorityBadge, ScorePill } from "@/components/clients/badges";
import type { Client } from "@/types/database";
import type { AiSearchFilters } from "@/app/api/ai/search/route";

const EXAMPLES_AR = [
  "مصانع في الدمام",
  "شركات وقّعت عقوداً مع مدن",
  "مصانع أغذية تحت الإنشاء",
  "مصانع أكبر من 20000 متر مربع",
  "مشاريع بأكثر من 50 مليون ريال",
];

function SearchInner() {
  const params = useSearchParams();
  const { locale, t } = useLocale();
  const supabase = createClient();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [mode, setMode] = useState<"basic" | "ai">("basic");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Client[]>([]);
  const [filters, setFilters] = useState<AiSearchFilters | null>(null);

  async function runBasicSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("clients")
        .select("*")
        .or(`company_name.ilike.%${q}%,city.ilike.%${q}%,industry.ilike.%${q}%,notes.ilike.%${q}%`)
        .limit(50);
      setResults((data ?? []) as Client[]);
    } finally {
      setLoading(false);
    }
  }

  async function runAiSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setFilters(null);
    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results ?? []);
      setFilters(data.filters);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "basic") runBasicSearch(query);
    else runAiSearch(query);
  }

  useEffect(() => {
    if (params.get("q")) runBasicSearch(params.get("q")!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-bold">{t.nav.search}</h1>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.common.search} />
        <Button type="button" variant={mode === "ai" ? "default" : "outline"} onClick={() => setMode(mode === "ai" ? "basic" : "ai")}>
          <Sparkles className="h-4 w-4" />
          AI
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.common.search}
        </Button>
      </form>

      {mode === "ai" && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES_AR.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setQuery(ex);
                runAiSearch(ex);
              }}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-accent"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {filters && (
        <p className="text-xs text-muted-foreground">
          {locale === "ar" ? "الفلاتر المستنتجة: " : "Parsed filters: "}
          {Object.entries(filters)
            .filter(([, v]) => v)
            .map(([k, v]) => `${k}=${v}`)
            .join(" · ") || "-"}
        </p>
      )}

      <div className="space-y-2">
        {results.map((c) => (
          <Link key={c.id} href={`/clients/${c.id}`}>
            <Card className="transition-colors hover:bg-accent/50">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{c.company_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {c.industry ?? "-"} · {c.city ?? "-"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ScorePill score={c.lead_score} />
                  <PriorityBadge priority={c.priority} t={t} />
                  <StageBadge stage={c.current_stage} t={t} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {!loading && results.length === 0 && <p className="text-sm text-muted-foreground">{t.common.noResults}</p>}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  );
}
