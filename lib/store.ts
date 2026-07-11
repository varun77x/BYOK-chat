"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DEFAULT_THEME, ThemeTokens, PRESETS } from "./theme";
import { ChatMessage } from "./api";
import { descendantThreadIds } from "./threads";

export type ProviderConfig = {
  providerId: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  customModels: string[];
};

export type StoredMessage = ChatMessage & { id: string };

export type Thread = {
  id: string;
  parentThreadId: string | null; // null => root thread
  anchorMessageId: string | null; // message in parent this branched from
  title?: string; // optional user-given name; otherwise a label is derived
  messages: StoredMessage[];
};

export type Chat = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  threads: Thread[]; // includes the root thread (parentThreadId === null)
  rootThreadId: string;
  pinned?: boolean;
  spaceId?: string;
};

export type Space = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  instructions: string;
  createdAt: number;
  updatedAt: number;
};

type State = {
  hydrated: boolean;
  // Provider settings
  providers: Record<string, ProviderConfig>;
  activeProviderId: string;

  // Chat history
  chats: Chat[];
  activeChatId: string | null;

  // Theme
  theme: ThemeTokens;
  themePresetId: string;

  // Chat behavior
  historyTurns: number; // 0 = unlimited
  generalInstructions: string;

  // Spaces
  spaces: Space[];

  // Actions — provider
  setActiveProvider: (id: string) => void;
  updateProvider: (id: string, patch: Partial<ProviderConfig>) => void;
  addCustomModel: (id: string, model: string) => void;
  removeCustomModel: (id: string, model: string) => void;

  // Actions — chat
  newChat: (spaceId?: string) => string;
  setActiveChat: (id: string | null) => void;
  deleteChat: (id: string) => void;
  renameChat: (id: string, title: string) => void;
  togglePinChat: (id: string) => void;
  appendMessage: (chatId: string, threadId: string, m: ChatMessage) => string;
  updateLastAssistantMessage: (
    chatId: string,
    threadId: string,
    content: string
  ) => void;
  createBranch: (
    chatId: string,
    parentThreadId: string,
    anchorMessageId: string
  ) => string;
  renameThread: (chatId: string, threadId: string, title: string) => void;
  deleteThread: (chatId: string, threadId: string) => void;
  clearAllChats: () => void;

  // Actions — theme
  setTheme: (t: ThemeTokens, presetId?: string) => void;
  setThemeToken: <K extends keyof ThemeTokens>(key: K, value: ThemeTokens[K]) => void;
  applyPreset: (presetId: string) => void;

  // Actions — chat behavior
  setHistoryTurns: (n: number) => void;
  setGeneralInstructions: (text: string) => void;

  // Actions — spaces
  newSpace: () => string;
  updateSpace: (id: string, patch: Partial<Omit<Space, "id" | "createdAt">>) => void;
  deleteSpace: (id: string) => void;
};

function defaultProviders(): Record<string, ProviderConfig> {
  return {
    deepseek: {
      providerId: "deepseek",
      baseUrl: "https://api.deepseek.com/v1",
      apiKey: "",
      model: "deepseek-chat",
      customModels: [],
    },
    openrouter: {
      providerId: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: "",
      model: "openai/gpt-4o-mini",
      customModels: [],
    },
    openai: {
      providerId: "openai",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "",
      model: "gpt-4o-mini",
      customModels: [],
    },
    custom: {
      providerId: "custom",
      baseUrl: "",
      apiKey: "",
      model: "",
      customModels: [],
    },
  };
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// Convert a legacy chat (flat `messages` array, no `threads`) into the
// thread-tree shape. Idempotent — already-migrated chats pass through.
type LegacyChat = Chat & { messages?: ChatMessage[] };
function migrateChat(c: LegacyChat): Chat {
  if (Array.isArray(c.threads) && c.rootThreadId) {
    const { messages: _legacy, ...rest } = c;
    return rest as Chat;
  }
  const rootThreadId = makeId();
  const messages: StoredMessage[] = (c.messages ?? []).map((m) => ({
    ...m,
    id: makeId(),
  }));
  const { messages: _legacy, ...rest } = c;
  return {
    ...(rest as Omit<Chat, "threads" | "rootThreadId">),
    rootThreadId,
    threads: [
      { id: rootThreadId, parentThreadId: null, anchorMessageId: null, messages },
    ],
  };
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      hydrated: false,

      providers: defaultProviders(),
      activeProviderId: "deepseek",

      chats: [],
      activeChatId: null,

      theme: DEFAULT_THEME,
      themePresetId: "default",

      historyTurns: 20,
      generalInstructions: "",

      spaces: [],

      setActiveProvider: (id) => set({ activeProviderId: id }),
      updateProvider: (id, patch) =>
        set((s) => ({
          providers: {
            ...s.providers,
            [id]: { ...s.providers[id], ...patch },
          },
        })),
      addCustomModel: (id, model) =>
        set((s) => {
          const existing = s.providers[id];
          if (!existing || !model || existing.customModels.includes(model)) return s;
          return {
            providers: {
              ...s.providers,
              [id]: { ...existing, customModels: [...existing.customModels, model] },
            },
          };
        }),
      removeCustomModel: (id, model) =>
        set((s) => {
          const existing = s.providers[id];
          if (!existing) return s;
          return {
            providers: {
              ...s.providers,
              [id]: {
                ...existing,
                customModels: existing.customModels.filter((m) => m !== model),
              },
            },
          };
        }),

      newChat: (spaceId) => {
        const id = makeId();
        const rootThreadId = makeId();
        const now = Date.now();
        set((s) => ({
          chats: [
            {
              id,
              title: "New chat",
              createdAt: now,
              updatedAt: now,
              rootThreadId,
              threads: [
                {
                  id: rootThreadId,
                  parentThreadId: null,
                  anchorMessageId: null,
                  messages: [],
                },
              ],
              ...(spaceId ? { spaceId } : {}),
            },
            ...s.chats,
          ],
          activeChatId: id,
        }));
        return id;
      },
      setActiveChat: (id) => set({ activeChatId: id }),
      deleteChat: (id) =>
        set((s) => {
          const chats = s.chats.filter((c) => c.id !== id);
          const activeChatId =
            s.activeChatId === id ? chats[0]?.id ?? null : s.activeChatId;
          return { chats, activeChatId };
        }),
      renameChat: (id, title) =>
        set((s) => ({
          chats: s.chats.map((c) =>
            c.id === id ? { ...c, title, updatedAt: Date.now() } : c
          ),
        })),
      togglePinChat: (id) =>
        set((s) => ({
          chats: s.chats.map((c) =>
            c.id === id ? { ...c, pinned: !c.pinned } : c
          ),
        })),
      appendMessage: (chatId, threadId, m) => {
        const msgId = makeId();
        set((s) => ({
          chats: s.chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  updatedAt: Date.now(),
                  threads: c.threads.map((t) =>
                    t.id === threadId
                      ? { ...t, messages: [...t.messages, { ...m, id: msgId }] }
                      : t
                  ),
                }
              : c
          ),
        }));
        return msgId;
      },
      updateLastAssistantMessage: (chatId, threadId, content) =>
        set((s) => ({
          chats: s.chats.map((c) => {
            if (c.id !== chatId) return c;
            return {
              ...c,
              updatedAt: Date.now(),
              threads: c.threads.map((t) => {
                if (t.id !== threadId) return t;
                const msgs = [...t.messages];
                for (let i = msgs.length - 1; i >= 0; i--) {
                  if (msgs[i].role === "assistant") {
                    msgs[i] = { ...msgs[i], content };
                    break;
                  }
                }
                return { ...t, messages: msgs };
              }),
            };
          }),
        })),
      createBranch: (chatId, parentThreadId, anchorMessageId) => {
        const threadId = makeId();
        set((s) => ({
          chats: s.chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  updatedAt: Date.now(),
                  threads: [
                    ...c.threads,
                    {
                      id: threadId,
                      parentThreadId,
                      anchorMessageId,
                      messages: [],
                    },
                  ],
                }
              : c
          ),
        }));
        return threadId;
      },
      renameThread: (chatId, threadId, title) =>
        set((s) => ({
          chats: s.chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  updatedAt: Date.now(),
                  threads: c.threads.map((t) =>
                    t.id === threadId
                      ? { ...t, title: title.trim() || undefined }
                      : t
                  ),
                }
              : c
          ),
        })),
      deleteThread: (chatId, threadId) =>
        set((s) => {
          const chat = s.chats.find((c) => c.id === chatId);
          if (!chat) return s;
          // Cannot delete the root thread.
          if (threadId === chat.rootThreadId) return s;
          const toDelete = new Set([
            threadId,
            ...descendantThreadIds(chat, threadId),
          ]);
          return {
            chats: s.chats.map((c) =>
              c.id === chatId
                ? {
                    ...c,
                    updatedAt: Date.now(),
                    threads: c.threads.filter((t) => !toDelete.has(t.id)),
                  }
                : c
            ),
          };
        }),
      clearAllChats: () => set({ chats: [], activeChatId: null }),

      setTheme: (t, presetId) =>
        set(() => ({ theme: t, themePresetId: presetId ?? "custom" })),
      setThemeToken: (key, value) =>
        set((s) => ({
          theme: { ...s.theme, [key]: value },
          themePresetId: "custom",
        })),
      applyPreset: (presetId) => {
        const preset = PRESETS.find((p) => p.id === presetId);
        if (!preset) return;
        set({ theme: preset.tokens, themePresetId: preset.id });
      },

      setHistoryTurns: (n) => set({ historyTurns: Math.max(0, Math.floor(n)) }),
      setGeneralInstructions: (text) => set({ generalInstructions: text }),

      newSpace: () => {
        const id = makeId();
        const now = Date.now();
        const space: Space = {
          id,
          name: "New space",
          emoji: "📚",
          description: "",
          instructions: "",
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ spaces: [space, ...s.spaces] }));
        return id;
      },
      updateSpace: (id, patch) =>
        set((s) => ({
          spaces: s.spaces.map((sp) =>
            sp.id === id ? { ...sp, ...patch, updatedAt: Date.now() } : sp
          ),
        })),
      deleteSpace: (id) =>
        set((s) => ({
          spaces: s.spaces.filter((sp) => sp.id !== id),
          // Chats stay, but drop the reference to the deleted space
          chats: s.chats.map((c) =>
            c.spaceId === id ? { ...c, spaceId: undefined } : c
          ),
        })),
    }),
    {
      name: "byok-chat-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        providers: s.providers,
        activeProviderId: s.activeProviderId,
        chats: s.chats,
        activeChatId: s.activeChatId,
        theme: s.theme,
        themePresetId: s.themePresetId,
        historyTurns: s.historyTurns,
        generalInstructions: s.generalInstructions,
        spaces: s.spaces,
      }),
      // Migrate legacy chats synchronously as state is rehydrated, so no
      // component ever sees a chat without `threads`.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State> & {
          chats?: LegacyChat[];
        };
        const chats = Array.isArray(p.chats) ? p.chats.map(migrateChat) : current.chats;
        return { ...current, ...p, chats };
      },
    }
  )
);

if (typeof window !== "undefined") {
  useStore.persist.onFinishHydration(() => {
    // Migrate legacy "yours" preset id to "default"
    if (useStore.getState().themePresetId === "yours") {
      useStore.setState({ themePresetId: "default" });
    }
    // Chats are migrated synchronously in `merge` above.
    useStore.setState({ hydrated: true });
  });
  // If nothing to hydrate (fresh visit), persist still calls onFinishHydration,
  // but as a belt-and-braces guard we also flip after a microtask.
  queueMicrotask(() => {
    if (!useStore.getState().hydrated && useStore.persist.hasHydrated()) {
      useStore.setState({ hydrated: true });
    }
  });
}
