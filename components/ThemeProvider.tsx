"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { tokensToCssVars } from "@/lib/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    const vars = tokensToCssVars(theme);
    for (const [k, v] of Object.entries(vars)) {
      root.style.setProperty(k, v);
    }
  }, [theme]);

  return <>{children}</>;
}
