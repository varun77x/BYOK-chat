"use client";

import { useEffect, useRef, useState } from "react";

const CURATED = [
  "📚", "💻", "🎨", "🔬", "💼", "🎯", "🚀", "🎓",
  "💡", "🎵", "🎬", "🍔", "🏋️", "✈️", "🐾", "❤️",
  "🌟", "🌈", "🎉", "🔥", "🧠", "🧭", "⚙️", "🧪",
  "📝", "📈", "🏛️", "🎮", "🌱", "🕰️", "🗺️", "☁️",
];

export function EmojiPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (emoji: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative inline-block ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-2xl w-11 h-11 flex items-center justify-center rounded-app border bg-surface-2 hover:border-accent transition"
        title="Change emoji"
      >
        {value || "📚"}
      </button>
      {open && (
        <div className="absolute z-40 mt-1 p-2 bg-surface border rounded-app shadow-lg w-72">
          <div className="grid grid-cols-8 gap-1 mb-2">
            {CURATED.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  onChange(e);
                  setOpen(false);
                }}
                className="text-xl w-8 h-8 flex items-center justify-center rounded hover:bg-surface-2"
              >
                {e}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Or paste any emoji…"
            maxLength={4}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = (e.target as HTMLInputElement).value.trim();
                if (v) {
                  onChange(v);
                  setOpen(false);
                }
              }
            }}
            className="w-full bg-surface-2 border rounded-app px-2 py-1 text-sm outline-none focus:border-accent"
          />
          <p className="text-[10px] text-muted mt-1">
            On Windows press Win + . for the system emoji picker.
          </p>
        </div>
      )}
    </div>
  );
}
