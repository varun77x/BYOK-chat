"use client";

import { useEffect } from "react";
import { useToastStore, Toast } from "@/lib/toast";

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    const id = window.setTimeout(() => dismiss(toast.id), toast.duration);
    return () => window.clearTimeout(id);
  }, [toast.id, toast.duration, dismiss]);

  return (
    <div
      onClick={() => dismiss(toast.id)}
      className="pointer-events-auto cursor-default select-none bg-surface border rounded-app px-3.5 py-2 text-sm text-text shadow-lg max-w-sm text-center animate-toast-in"
    >
      {toast.message}
    </div>
  );
}
