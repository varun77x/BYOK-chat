"use client";

import clsx from "clsx";
import { useStore } from "@/lib/store";
import {
  PRESETS,
  COLOR_KEYS,
  TOKEN_LABELS,
  ThemeTokens,
  FONT_SANS_OPTIONS,
  FONT_MONO_OPTIONS,
  FontOption,
} from "@/lib/theme";

function isTransparent(v: string): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  if (s === "transparent") return true;
  if (/^rgba?\([^)]*,\s*0(?:\.0+)?\s*\)$/.test(s)) return true; // rgba(...,0)
  if (/^#[0-9a-f]{6}00$/.test(s)) return true;                   // #rrggbb00
  if (/^#[0-9a-f]{3}0$/.test(s)) return true;                    // #rgb0
  return false;
}

// Checkerboard background that signals "no colour here" — same trick color pickers use.
const CHECKER_STYLE: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg, #b0b0b0 25%, transparent 25%), linear-gradient(-45deg, #b0b0b0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #b0b0b0 75%), linear-gradient(-45deg, transparent 75%, #b0b0b0 75%)",
  backgroundSize: "8px 8px",
  backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
  backgroundColor: "#ffffff",
};

/** Theme controls (presets, colours, shape & typography). Rendered inside the
 *  Settings modal's Appearance tab. */
export function ThemeSettings() {
  const theme = useStore((s) => s.theme);
  const themePresetId = useStore((s) => s.themePresetId);
  const applyPreset = useStore((s) => s.applyPreset);
  const setThemeToken = useStore((s) => s.setThemeToken);

  return (
    <div className="space-y-6">
      <section>
        <div className="text-sm font-medium mb-2">Presets</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className={`text-left p-2 rounded-app border transition ${
                themePresetId === p.id ? "border-accent" : "hover:border-muted"
              }`}
              style={{ background: p.tokens.bg, color: p.tokens.text }}
            >
              <div className="text-xs font-medium">{p.name}</div>
              <div className="mt-1.5 flex gap-1">
                {[p.tokens.accent, p.tokens.userBubble, p.tokens.surface2, p.tokens.border].map(
                  (c, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-full border"
                      style={{ background: c, borderColor: p.tokens.border }}
                    />
                  )
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="text-sm font-medium mb-3">Colors</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {COLOR_KEYS.map((k) => {
            const value = theme[k] as string;
            const transparent = isTransparent(value);
            return (
              <label
                key={k}
                className="flex items-center gap-3 p-2 rounded-app border bg-surface-2"
              >
                <div className="relative w-9 h-9 shrink-0">
                  {transparent ? (
                    <button
                      type="button"
                      onClick={() => setThemeToken(k, "#000000" as ThemeTokens[typeof k])}
                      className="w-9 h-9 rounded-app border cursor-pointer"
                      style={CHECKER_STYLE}
                      title="Currently transparent — click to switch back to a solid color"
                    />
                  ) : (
                    <input
                      type="color"
                      value={value}
                      onChange={(e) =>
                        setThemeToken(k, e.target.value as ThemeTokens[typeof k])
                      }
                      className="w-9 h-9 rounded-app cursor-pointer border-0 bg-transparent"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{TOKEN_LABELS[k]}</div>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) =>
                      setThemeToken(k, e.target.value as ThemeTokens[typeof k])
                    }
                    className="w-full mt-0.5 bg-transparent text-xs font-mono outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setThemeToken(
                      k,
                      (transparent ? "#000000" : "transparent") as ThemeTokens[typeof k]
                    )
                  }
                  className={clsx(
                    "shrink-0 text-[10px] font-medium px-1.5 py-1 rounded-app border transition",
                    transparent
                      ? "bg-accent text-accent-fg border-accent"
                      : "text-muted hover:text-text"
                  )}
                  title={transparent ? "Turn off transparent" : "Make transparent"}
                >
                  ⌀
                </button>
              </label>
            );
          })}
        </div>
      </section>

      <section>
        <div className="text-sm font-medium mb-3">Shape & typography</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="p-2 rounded-app border bg-surface-2">
            <div className="text-xs font-medium mb-1">Corner radius</div>
            <input
              type="text"
              value={theme.radius}
              onChange={(e) => setThemeToken("radius", e.target.value)}
              className="w-full bg-transparent text-xs font-mono outline-none"
              placeholder="10px"
            />
          </label>
          <FontPicker
            label="Sans font"
            options={FONT_SANS_OPTIONS}
            value={theme.fontSans}
            onChange={(v) => setThemeToken("fontSans", v)}
            previewClass="font-sans"
          />
          <FontPicker
            label="Mono font"
            options={FONT_MONO_OPTIONS}
            value={theme.fontMono}
            onChange={(v) => setThemeToken("fontMono", v)}
            previewClass="font-mono"
          />
        </div>
      </section>

      <section className="text-xs text-muted">
        Any tweak switches the preset to &quot;custom&quot;. Changes persist to localStorage.
      </section>
    </div>
  );
}

function FontPicker({
  label,
  options,
  value,
  onChange,
  previewClass,
}: {
  label: string;
  options: FontOption[];
  value: string;
  onChange: (v: string) => void;
  previewClass: string;
}) {
  const matched = options.find((o) => o.value === value);
  const selectValue = matched ? matched.value : "__custom__";
  const isCustom = !matched;

  return (
    <label className="p-2 rounded-app border bg-surface-2 flex flex-col gap-1.5">
      <div className="text-xs font-medium">{label}</div>
      <div className="relative">
        <select
          value={selectValue}
          onChange={(e) => {
            if (e.target.value === "__custom__") {
              onChange(value || "");
            } else {
              onChange(e.target.value);
            }
          }}
          className="w-full appearance-none bg-transparent border rounded-app pl-2 pr-6 py-1 text-xs outline-none focus:border-accent cursor-pointer"
        >
          {options.map((o) => (
            <option key={o.label} value={o.value}>
              {o.label}
            </option>
          ))}
          <option value="__custom__">Custom…</option>
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted text-[10px]">
          ▾
        </span>
      </div>
      {isCustom && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. 'Space Grotesk', ui-sans-serif, sans-serif"
          className="w-full bg-transparent border rounded-app px-2 py-1 text-xs font-mono outline-none focus:border-accent"
        />
      )}
      <div
        className={`${previewClass} text-sm bg-bg border rounded-app px-2 py-1 truncate`}
        style={{ fontFamily: value }}
        title={value}
      >
        The quick brown fox 0123
      </div>
    </label>
  );
}
