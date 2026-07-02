"use client";

import { ThemeProvider } from "next-themes";
import { LocaleProvider } from "@/lib/i18n";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <LocaleProvider>
        {children}
        <Toaster />
      </LocaleProvider>
    </ThemeProvider>
  );
}
