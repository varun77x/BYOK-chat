export type ThemeTokens = {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentFg: string;
  userBubble: string;
  userBubbleFg: string;
  assistantBubble: string;
  assistantBubbleFg: string;
  danger: string;
  radius: string;
  fontSans: string;
  fontMono: string;
};

export type ThemePreset = {
  id: string;
  name: string;
  tokens: ThemeTokens;
};

export type FontOption = { label: string; value: string };

export const FONT_SANS_OPTIONS: FontOption[] = [
  { label: "System UI", value: "system-ui, -apple-system, Segoe UI, sans-serif" },
  { label: "Inter", value: "var(--font-inter), ui-sans-serif, system-ui, sans-serif" },
  { label: "Manrope", value: "var(--font-manrope), ui-sans-serif, sans-serif" },
  { label: "Poppins", value: "var(--font-poppins), ui-sans-serif, sans-serif" },
  { label: "IBM Plex Sans", value: "var(--font-plex-sans), ui-sans-serif, sans-serif" },
  { label: "Merriweather (serif)", value: "var(--font-merriweather), Georgia, serif" },
  { label: "Georgia (serif)", value: "Georgia, ui-serif, serif" },
  { label: "Megrim (display)", value: "var(--font-megrim), cursive" },
];

export const FONT_MONO_OPTIONS: FontOption[] = [
  { label: "System Mono", value: "ui-monospace, SFMono-Regular, Menlo, monospace" },
  { label: "JetBrains Mono", value: "var(--font-jetbrains-mono), ui-monospace, monospace" },
  { label: "Fira Code", value: "var(--font-fira-code), ui-monospace, monospace" },
  { label: "IBM Plex Mono", value: "var(--font-plex-mono), ui-monospace, monospace" },
  { label: "Menlo / Consolas", value: "Menlo, Consolas, monospace" },
];

const baseFonts = {
  radius: "10px",
  fontSans: FONT_SANS_OPTIONS[1].value,
  fontMono: FONT_MONO_OPTIONS[1].value,
};

const defaultTokens: ThemeTokens = {
  bg: "#171615",
  surface: "#1E1D1B",
  surface2: "#252421",
  border: "#26262e",
  text: "#e6e6ea",
  muted: "#8b8b93",
  accent: "#3f3e42",
  accentFg: "#ffffff",
  userBubble: "#1E1D1B",
  userBubbleFg: "#D6D5D4",
  assistantBubble: "transparent",
  assistantBubbleFg: "#D6D5D4",
  danger: "#ef4444",
  radius: "10px",
  fontSans: "var(--font-merriweather), Georgia, serif",
  fontMono: "var(--font-jetbrains-mono), ui-monospace, monospace",
};

export const PRESETS: ThemePreset[] = [
  { id: "default", name: "Default", tokens: defaultTokens },
  {
    id: "light",
    name: "Light",
    tokens: {
      ...baseFonts,
      bg: "#ffffff",
      surface: "#f7f7f8",
      surface2: "#eeeef0",
      border: "#e5e7eb",
      text: "#111827",
      muted: "#6b7280",
      accent: "#2563eb",
      accentFg: "#ffffff",
      userBubble: "#2563eb",
      userBubbleFg: "#ffffff",
      assistantBubble: "#f3f4f6",
      assistantBubbleFg: "#111827",
      danger: "#dc2626",
    },
  },
  {
    id: "dark",
    name: "Dark",
    tokens: {
      ...baseFonts,
      bg: "#0b0b0f",
      surface: "#141419",
      surface2: "#1c1c22",
      border: "#26262e",
      text: "#e6e6ea",
      muted: "#8b8b93",
      accent: "#7c3aed",
      accentFg: "#ffffff",
      userBubble: "#7c3aed",
      userBubbleFg: "#ffffff",
      assistantBubble: "#1c1c22",
      assistantBubbleFg: "#e6e6ea",
      danger: "#ef4444",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    tokens: {
      ...baseFonts,
      bg: "#020617",
      surface: "#0f172a",
      surface2: "#1e293b",
      border: "#334155",
      text: "#e2e8f0",
      muted: "#64748b",
      accent: "#06b6d4",
      accentFg: "#022c33",
      userBubble: "#06b6d4",
      userBubbleFg: "#022c33",
      assistantBubble: "#0f172a",
      assistantBubbleFg: "#e2e8f0",
      danger: "#f43f5e",
    },
  },
  {
    id: "solarized",
    name: "Solarized",
    tokens: {
      ...baseFonts,
      bg: "#fdf6e3",
      surface: "#eee8d5",
      surface2: "#e4ddc5",
      border: "#d6cfb2",
      text: "#586e75",
      muted: "#93a1a1",
      accent: "#b58900",
      accentFg: "#fdf6e3",
      userBubble: "#268bd2",
      userBubbleFg: "#fdf6e3",
      assistantBubble: "#eee8d5",
      assistantBubbleFg: "#586e75",
      danger: "#dc322f",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    tokens: {
      ...baseFonts,
      bg: "#1a0f1f",
      surface: "#251426",
      surface2: "#32192d",
      border: "#4a2540",
      text: "#fde4d1",
      muted: "#a8829a",
      accent: "#f97316",
      accentFg: "#1a0f1f",
      userBubble: "#f97316",
      userBubbleFg: "#1a0f1f",
      assistantBubble: "#251426",
      assistantBubbleFg: "#fde4d1",
      danger: "#f43f5e",
    },
  },
];

export const DEFAULT_THEME = defaultTokens;

export function tokensToCssVars(t: ThemeTokens): Record<string, string> {
  return {
    "--color-bg": t.bg,
    "--color-surface": t.surface,
    "--color-surface-2": t.surface2,
    "--color-border": t.border,
    "--color-text": t.text,
    "--color-muted": t.muted,
    "--color-accent": t.accent,
    "--color-accent-fg": t.accentFg,
    "--color-user-bubble": t.userBubble,
    "--color-user-bubble-fg": t.userBubbleFg,
    "--color-assistant-bubble": t.assistantBubble,
    "--color-assistant-bubble-fg": t.assistantBubbleFg,
    "--color-danger": t.danger,
    "--radius": t.radius,
    "--font-sans": t.fontSans,
    "--font-mono": t.fontMono,
  };
}

export const TOKEN_LABELS: Record<keyof ThemeTokens, string> = {
  bg: "Background",
  surface: "Surface (sidebar/panels)",
  surface2: "Surface 2 (inputs, hover)",
  border: "Border",
  text: "Text",
  muted: "Muted text",
  accent: "Accent",
  accentFg: "Accent foreground",
  userBubble: "User bubble",
  userBubbleFg: "User bubble text",
  assistantBubble: "Assistant bubble",
  assistantBubbleFg: "Assistant bubble text",
  danger: "Danger",
  radius: "Corner radius",
  fontSans: "Sans font",
  fontMono: "Mono font",
};

export const COLOR_KEYS: (keyof ThemeTokens)[] = [
  "bg",
  "surface",
  "surface2",
  "border",
  "text",
  "muted",
  "accent",
  "accentFg",
  "userBubble",
  "userBubbleFg",
  "assistantBubble",
  "assistantBubbleFg",
  "danger",
];
