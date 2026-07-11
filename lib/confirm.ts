"use client";

import { create } from "zustand";

export type ConfirmRequest = {
  id: number;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
};

type ConfirmState = {
  current: ConfirmRequest | null;
  request: (req: Omit<ConfirmRequest, "id" | "resolve">, resolve: (ok: boolean) => void) => void;
  answer: (ok: boolean) => void;
};

let counter = 0;

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  current: null,
  request: (req, resolve) => {
    // If something is already open, resolve it as cancelled first.
    const existing = get().current;
    if (existing) existing.resolve(false);
    set({ current: { ...req, id: ++counter, resolve } });
  },
  answer: (ok) => {
    const cur = get().current;
    if (!cur) return;
    cur.resolve(ok);
    set({ current: null });
  },
}));

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

/**
 * Themed replacement for window.confirm.
 *   if (await confirmDialog({ title: "Delete this chat?", danger: true })) { ... }
 */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmStore.getState().request(
      {
        title: opts.title,
        message: opts.message,
        confirmLabel: opts.confirmLabel ?? "Confirm",
        cancelLabel: opts.cancelLabel ?? "Cancel",
        danger: opts.danger ?? false,
      },
      resolve
    );
  });
}
