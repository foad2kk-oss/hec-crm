"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Bot, Copy, Loader2 } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const ACTIONS = [
  { type: "summarize", ar: "تلخيص الشركة", en: "Summarize company" },
  { type: "meeting_prep", ar: "تحضير الاجتماع", en: "Meeting prep" },
  { type: "email_ar", ar: "بريد عربي", en: "Arabic email" },
  { type: "email_en", ar: "بريد إنجليزي", en: "English email" },
  { type: "proposal", ar: "مسودة عرض", en: "Proposal draft" },
  { type: "follow_up", ar: "رسالة متابعة", en: "Follow-up email" },
  { type: "next_action", ar: "الإجراء التالي", en: "Next best action" },
] as const;

export function QuickActions({ clientId }: { clientId: string }) {
  const { locale } = useLocale();
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState("");

  async function run(type: string) {
    setLoading(type);
    setResult("");
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, clientId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      setResult(data.text);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-4 w-4" /> {locale === "ar" ? "المساعد الذكي" : "AI Assistant"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {ACTIONS.map((a) => (
            <Button key={a.type} size="sm" variant="outline" disabled={!!loading} onClick={() => run(a.type)}>
              {loading === a.type && <Loader2 className="h-3 w-3 animate-spin" />}
              {locale === "ar" ? a.ar : a.en}
            </Button>
          ))}
        </div>
        {result && (
          <div className="relative">
            <Textarea value={result} readOnly rows={10} className="text-sm" />
            <Button
              size="icon"
              variant="ghost"
              className="absolute end-2 top-2 h-7 w-7"
              onClick={() => {
                navigator.clipboard.writeText(result);
                toast.success(locale === "ar" ? "تم النسخ" : "Copied");
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
