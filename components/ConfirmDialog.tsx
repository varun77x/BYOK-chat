"use client";

import { useEffect } from "react";
import clsx from "clsx";
import { useConfirmStore } from "@/lib/confirm";

export function ConfirmDialog() {
  const current = useConfirmStore((s) => s.current);
  const answer = useConfirmStore((s) => s.answer);

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") answer(false);
      else if (e.key === "Enter") answer(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, answer]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={() => answer(false)}
    >
      <div
        className="bg-surface border rounded-app shadow-xl w-full max-w-sm p-4 animate-toast-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold">{current.title}</h2>
        {current.message && (
          <p className="text-sm text-muted mt-1.5">{current.message}</p>
        )}
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={() => answer(false)}
            className="px-3 py-1.5 rounded-app border text-sm hover:bg-surface-2"
          >
            {current.cancelLabel}
          </button>
          <button
            autoFocus
            onClick={() => answer(true)}
            className={clsx(
              "px-3 py-1.5 rounded-app text-sm transition",
              current.danger
                ? "bg-danger text-white hover:opacity-90"
                : "bg-accent text-accent-fg hover:opacity-90"
            )}
          >
            {current.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
