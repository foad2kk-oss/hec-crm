"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Sparkles,
  Kanban,
  CalendarDays,
  ListChecks,
  Bot,
  FolderOpen,
  Search,
  BarChart3,
  Settings,
  Building2,
  X,
} from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const items = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/clients", key: "clients", icon: Users },
  { href: "/discovery", key: "discovery", icon: Sparkles },
  { href: "/pipeline", key: "pipeline", icon: Kanban },
  { href: "/meetings", key: "meetings", icon: CalendarDays },
  { href: "/tasks", key: "tasks", icon: ListChecks },
  { href: "/assistant", key: "assistant", icon: Bot },
  { href: "/documents", key: "documents", icon: FolderOpen },
  { href: "/search", key: "search", icon: Search },
  { href: "/reports", key: "reports", icon: BarChart3 },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <div className="flex h-full w-64 flex-col border-e border-border bg-card">
      <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <span className="text-sm font-bold leading-tight">{t.appName}</span>
        </div>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onNavigate}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map(({ href, key, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t.nav[key]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
