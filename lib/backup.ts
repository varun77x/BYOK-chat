import type { BackupData } from "./store";

export const BACKUP_FORMAT = "byok-chat-backup";
export const BACKUP_VERSION = 1;

export type Backup = {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: number;
  data: BackupData;
};

/** Parse + validate a backup file's text. Throws with a friendly message. */
export function parseBackup(text: string): Backup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const b = parsed as Partial<Backup>;
  if (!b || typeof b !== "object" || b.format !== BACKUP_FORMAT || !b.data) {
    throw new Error("That doesn't look like a BYOK Chat backup file.");
  }
  return b as Backup;
}

/** Short human summary shown before importing. */
export function summarizeBackup(b: Backup): string {
  const d = b.data;
  const chats = d.chats?.length ?? 0;
  const spaces = d.spaces?.length ?? 0;
  const hasKeys = Object.values(d.providers ?? {}).some((p) => !!p.apiKey);
  const parts = [
    `${chats} chat${chats === 1 ? "" : "s"}`,
    `${spaces} space${spaces === 1 ? "" : "s"}`,
  ];
  if (hasKeys) parts.push("incl. API keys");
  return parts.join(" · ");
}

/** Trigger a client-side download of `obj` as pretty-printed JSON. */
export function downloadJson(filename: string, obj: unknown): void {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
