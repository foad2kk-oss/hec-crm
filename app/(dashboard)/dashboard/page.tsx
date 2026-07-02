"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Users, TrendingUp, CalendarCheck, Trophy } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { useDashboardData } from "@/lib/hooks/useDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

const COLORS = ["#1e3a8a", "#2563eb", "#60a5fa", "#93c5fd", "#facc15", "#f97316", "#ef4444", "#10b981"];

function Kpi({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { t, locale } = useLocale();
  const { kpis, funnel, bySource, byCity, byIndustry, engineerPerf, upcomingFollowups } = useDashboardData();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t.nav.dashboard}</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={Users} label={locale === "ar" ? "إجمالي العملاء" : "Total leads"} value={kpis?.total_leads ?? "-"} />
        <Kpi
          icon={TrendingUp}
          label={locale === "ar" ? "عملاء جدد هذا الأسبوع" : "New this week"}
          value={kpis?.new_leads_this_week ?? "-"}
        />
        <Kpi
          icon={CalendarCheck}
          label={locale === "ar" ? "اجتماعات هذا الأسبوع" : "Meetings this week"}
          value={kpis?.meetings_this_week ?? "-"}
        />
        <Kpi icon={Trophy} label={locale === "ar" ? "مشاريع فائزة" : "Projects won"} value={kpis?.projects_won ?? "-"} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{locale === "ar" ? "معدل التحويل" : "Conversion rate"}</p>
            <p className="text-lg font-bold">{kpis?.conversion_rate_pct ?? 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{locale === "ar" ? "نجاح العروض" : "Proposal success"}</p>
            <p className="text-lg font-bold">{kpis?.proposal_success_rate_pct ?? 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{locale === "ar" ? "الإيراد المتوقع" : "Expected revenue"}</p>
            <p className="text-lg font-bold">{formatCurrency(kpis?.expected_revenue, locale)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{locale === "ar" ? "الإيراد المحقق" : "Revenue won"}</p>
            <p className="text-lg font-bold">{formatCurrency(kpis?.revenue_won, locale)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{locale === "ar" ? "مسار المبيعات" : "Pipeline funnel"}</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="current_stage" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{locale === "ar" ? "مصادر العملاء" : "Lead sources"}</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={bySource} dataKey="count" nameKey="lead_source" outerRadius={90} label>
                  {bySource.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{locale === "ar" ? "المدن الأكثر فرصاً" : "Top cities"}</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="city" width={100} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{locale === "ar" ? "القطاعات الصناعية" : "Industrial sectors"}</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byIndustry} dataKey="count" nameKey="industry" outerRadius={90} label>
                  {byIndustry.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{locale === "ar" ? "أفضل المهندسين" : "Top engineers"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {engineerPerf.slice(0, 6).map((e) => (
              <div key={e.engineer_id} className="flex items-center justify-between text-sm">
                <span>{e.full_name}</span>
                <span className="text-muted-foreground">
                  {e.won_count}/{e.total_assigned} · {formatCurrency(e.won_revenue, locale)}
                </span>
              </div>
            ))}
            {engineerPerf.length === 0 && <p className="text-sm text-muted-foreground">{t.common.noResults}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{locale === "ar" ? "المتابعات القادمة" : "Upcoming follow-ups"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingFollowups.map((f) => (
              <Link key={f.id} href={`/clients/${f.id}`} className="flex items-center justify-between text-sm hover:underline">
                <span>{f.company_name}</span>
                <span className="text-muted-foreground">{formatDate(f.next_followup, locale)}</span>
              </Link>
            ))}
            {upcomingFollowups.length === 0 && <p className="text-sm text-muted-foreground">{t.common.noResults}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
