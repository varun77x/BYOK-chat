"use client";

import { useEffect, useState } from "react";
import { MonitorOff } from "lucide-react";

const MIN_WIDTH = 768;

export function ScreenGuard({ children }: { children: React.ReactNode }) {
  const [isTooSmall, setIsTooSmall] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const check = () => setIsTooSmall(window.innerWidth < MIN_WIDTH);
    check();
    setMounted(true);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Avoid flash on first render by rendering nothing until mounted
  if (!mounted) return null;

  if (isTooSmall) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-5 bg-zinc-50 px-6 text-center dark:bg-zinc-950">
        <MonitorOff className="h-16 w-16 text-zinc-400 dark:text-zinc-500" />
        <h1 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200">
          Please use a larger screen
        </h1>
        <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
          This app is designed for desktop and tablet screens.
          Please switch to a device with a wider display.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
