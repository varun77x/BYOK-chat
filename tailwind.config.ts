import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-2": "var(--color-surface-2)",
        border: "var(--color-border)",
        text: "var(--color-text)",
        muted: "var(--color-muted)",
        accent: "var(--color-accent)",
        "accent-fg": "var(--color-accent-fg)",
        "user-bubble": "var(--color-user-bubble)",
        "user-bubble-fg": "var(--color-user-bubble-fg)",
        "assistant-bubble": "var(--color-assistant-bubble)",
        "assistant-bubble-fg": "var(--color-assistant-bubble-fg)",
        danger: "var(--color-danger)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        app: "var(--radius)",
      },
    },
  },
  plugins: [],
};

export default config;
