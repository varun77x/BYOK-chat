"use client";

import { create } from "zustand";

export type Toast = {
  id: number;
  message: string;
  duration: number;
};

type ToastState = {
  toasts: Toast[];
  push: (message: string, duration?: number) => number;
  dismiss: (id: number) => void;
};

let counter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, duration = 2800) => {
    const id = ++counter;
    set((s) => ({ toasts: [...s.toasts, { id, message, duration }] }));
    return id;
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/**
 * Fire a toast from anywhere (event handlers, non-React code).
 *   import { toast } from "@/lib/toast";
 *   toast("Copied to clipboard");
 */
export function toast(message: string, duration?: number): number {
  return useToastStore.getState().push(message, duration);
}
