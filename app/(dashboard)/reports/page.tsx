"use client";

import { useMemo } from "react";
import { useLocale } from "@/lib/i18n";
import { useDashboardData } from "@/lib/hooks/useDashboard";
import { useClients } from "@/lib/hooks/useClients";
import { useMeetings } from "@/lib/hooks/useMeetings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportTable } from "@/components/reports/ReportTable";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function ReportsPage() {
  const { t, locale } = useLocale();
  const { funnel, bySource, engineerPerf, kpis } = useDashboardData();
  const { clients } = useClients();
  const { meetings } = useMeetings();

  const weekAgo = useMemo(() => Date.now() - 7 * 24 * 60 * 60 * 1000, []);

  const weeklySales = clients
    .filter((c) => new Date(c.created_at).getTime() >= weekAgo)
    .map((c) => [c.company_name, t.stages[c.current_stage], formatCurrency(c.expected_revenue, locale), c.assigned_engineer?.full_name ?? "-"]);

  const pipelineRows = funnel.map((f) => [t.stages[f.current_stage], f.count]);

  const sourceRows = bySource.map((s) => [s.lead_source, s.count]);

  const meetingRows = meetings.map((m) => [m.title, m.client?.company_name ?? "-", formatDateTime(m.starts_at, locale), m.location ?? "-"]);

  const won = clients.filter((c) => c.current_stage === "won").length;
  const lost = clients.filter((c) => c.current_stage === "lost").length;
  const conversionRows = [
    [locale === "ar" ? "فائز" : "Won", won],
    [locale === "ar" ? "خاسر" : "Lost", lost],
    [locale === "ar" ? "معدل التحويل" : "Conversion rate", `${kpis?.conversion_rate_pct ?? 0}%`],
  ];

  const engineerRows = engineerPerf.map((e) => [e.full_name, e.total_assigned, e.won_count, `${e.win_rate_pct ?? 0}%`, formatCurrency(e.won_revenue, locale)]);

  const forecastRows = funnel
    .filter((f) => !["won", "lost"].includes(f.current_stage))
    .map((f) => {
      const stageClients = clients.filter((c) => c.current_stage === f.current_stage);
      const total = stageClients.reduce((sum, c) => sum + (c.expected_revenue ?? 0), 0);
      return [t.stages[f.current_stage], f.count, formatCurrency(total, locale)];
    });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t.nav.reports}</h1>

      <Tabs defaultValue="weekly">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="weekly">{locale === "ar" ? "المبيعات الأسبوعية" : "Weekly Sales"}</TabsTrigger>
          <TabsTrigger value="pipeline">{locale === "ar" ? "المسار الشهري" : "Monthly Pipeline"}</TabsTrigger>
          <TabsTrigger value="sources">{locale === "ar" ? "تحليل المصادر" : "Lead Sources"}</TabsTrigger>
          <TabsTrigger value="meetings">{locale === "ar" ? "الاجتماعات" : "Meetings"}</TabsTrigger>
          <TabsTrigger value="conversion">{locale === "ar" ? "التحويل" : "Conversion"}</TabsTrigger>
          <TabsTrigger value="engineers">{locale === "ar" ? "أداء المهندسين" : "Engineer Performance"}</TabsTrigger>
          <TabsTrigger value="forecast">{locale === "ar" ? "توقع الإيرادات" : "Revenue Forecast"}</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly">
          <ReportTable
            title={locale === "ar" ? "تقرير المبيعات الأسبوعي" : "Weekly Sales Report"}
            columns={[t.client.companyName, t.client.currentStage, t.client.expectedRevenue, t.client.assignedEngineer]}
            rows={weeklySales}
            filename="weekly-sales"
          />
        </TabsContent>
        <TabsContent value="pipeline">
          <ReportTable
            title={locale === "ar" ? "تقرير المسار الشهري" : "Monthly Pipeline Report"}
            columns={[t.client.currentStage, locale === "ar" ? "العدد" : "Count"]}
            rows={pipelineRows}
            filename="pipeline-report"
          />
        </TabsContent>
        <TabsContent value="sources">
          <ReportTable
            title={locale === "ar" ? "تحليل مصادر العملاء" : "Lead Source Analysis"}
            columns={[t.client.leadSource, locale === "ar" ? "العدد" : "Count"]}
            rows={sourceRows}
            filename="lead-sources"
          />
        </TabsContent>
        <TabsContent value="meetings">
          <ReportTable
            title={locale === "ar" ? "تقرير الاجتماعات" : "Meeting Report"}
            columns={[locale === "ar" ? "العنوان" : "Title", t.client.companyName, locale === "ar" ? "التاريخ" : "Date", locale === "ar" ? "الموقع" : "Location"]}
            rows={meetingRows}
            filename="meetings-report"
          />
        </TabsContent>
        <TabsContent value="conversion">
          <ReportTable
            title={locale === "ar" ? "تقرير التحويل" : "Conversion Report"}
            columns={[locale === "ar" ? "المؤشر" : "Metric", locale === "ar" ? "القيمة" : "Value"]}
            rows={conversionRows}
            filename="conversion-report"
          />
        </TabsContent>
        <TabsContent value="engineers">
          <ReportTable
            title={locale === "ar" ? "أداء المهندسين" : "Engineer Performance"}
            columns={[
              locale === "ar" ? "المهندس" : "Engineer",
              locale === "ar" ? "العملاء" : "Assigned",
              locale === "ar" ? "الفوز" : "Won",
              locale === "ar" ? "معدل الفوز" : "Win rate",
              locale === "ar" ? "الإيراد" : "Revenue",
            ]}
            rows={engineerRows}
            filename="engineer-performance"
          />
        </TabsContent>
        <TabsContent value="forecast">
          <ReportTable
            title={locale === "ar" ? "توقع الإيرادات" : "Revenue Forecast"}
            columns={[t.client.currentStage, locale === "ar" ? "العدد" : "Count", locale === "ar" ? "الإيراد المتوقع" : "Expected revenue"]}
            rows={forecastRows}
            filename="revenue-forecast"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
