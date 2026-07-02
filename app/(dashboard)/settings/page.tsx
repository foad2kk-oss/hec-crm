"use client";

import { useLocale } from "@/lib/i18n";
import { useProfile } from "@/lib/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

export default function SettingsPage() {
  const { t, locale, setLocale } = useLocale();
  const { profile } = useProfile();
  const { theme, setTheme } = useTheme();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-bold">{t.nav.settings}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{locale === "ar" ? "الملف الشخصي" : "Profile"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{locale === "ar" ? "الاسم" : "Name"}</Label>
            <Input defaultValue={profile?.full_name} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>{t.client.email}</Label>
            <Input defaultValue={profile?.email} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>{locale === "ar" ? "الدور" : "Role"}</Label>
            <Input defaultValue={profile?.role} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>{locale === "ar" ? "القسم" : "Department"}</Label>
            <Input defaultValue={profile?.department ?? "-"} disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{locale === "ar" ? "المظهر واللغة" : "Appearance & Language"}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setLocale(locale === "ar" ? "en" : "ar")}>
            {locale === "ar" ? "English" : "العربية"}
          </Button>
          <Button variant="outline" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? (locale === "ar" ? "الوضع الفاتح" : "Light mode") : locale === "ar" ? "الوضع الداكن" : "Dark mode"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
