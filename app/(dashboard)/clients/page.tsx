"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, Search } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { useClients, createClientRecord } from "@/lib/hooks/useClients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClientForm } from "@/components/clients/ClientForm";
import { StageBadge, PriorityBadge, ScorePill } from "@/components/clients/badges";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ClientFormValues } from "@/lib/validations/client";

export default function ClientsPage() {
  const { t, locale } = useLocale();
  const { clients, isLoading, mutate } = useClients();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return clients;
    const q = query.toLowerCase();
    return clients.filter(
      (c) =>
        c.company_name.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.industry?.toLowerCase().includes(q) ||
        c.tags?.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [clients, query]);

  async function handleCreate(values: ClientFormValues) {
    try {
      const client = await createClientRecord(values);
      toast.success(t.common.success);
      setOpen(false);
      mutate();
      fetch("/api/leads/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: client.id }),
      }).catch(() => {});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{t.nav.clients}</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.common.search} className="ps-9 w-64" />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              {t.common.add}
            </Button>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>{t.nav.clients} — {t.common.new}</DialogTitle>
              </DialogHeader>
              <ClientForm onSubmit={handleCreate} submitLabel={t.common.save} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.client.companyName}</TableHead>
                <TableHead>{t.client.industry}</TableHead>
                <TableHead>{t.client.city}</TableHead>
                <TableHead>{t.client.leadScore}</TableHead>
                <TableHead>{t.client.currentStage}</TableHead>
                <TableHead>{t.client.expectedRevenue}</TableHead>
                <TableHead>{t.client.nextFollowup}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/clients/${c.id}`} className="font-medium hover:underline">
                      {c.company_name}
                    </Link>
                    <div className="flex gap-1 pt-1">
                      {c.tags?.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{c.industry ?? "-"}</TableCell>
                  <TableCell>{c.city ?? "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ScorePill score={c.lead_score} />
                      <PriorityBadge priority={c.priority} t={t} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <StageBadge stage={c.current_stage} t={t} />
                  </TableCell>
                  <TableCell>{formatCurrency(c.expected_revenue, locale)}</TableCell>
                  <TableCell>{formatDate(c.next_followup, locale)}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    {t.common.noResults}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
