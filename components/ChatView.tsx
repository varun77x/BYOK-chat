"use client";

import Image from "next/image";
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Paperclip,
  Send,
  Square,
  ImagePlus,
  X,
  Bot,
  User,
  Maximize2,
  Copy,
  GitBranch,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  ArrowDown,
  RefreshCw,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { StoredMessage, Thread } from "@/lib/store";
import { streamChat, fileToDataUrl, generateImage, withRetry, ChatMessage, ContentPart } from "@/lib/api";
import { isVisionModel, isImageGenModel, getProvider } from "@/lib/providers";
import { truncateHistory } from "@/lib/history";
import {
  buildContext,
  toApiMessages,
  threadPath,
  childBranches,
  branchLabel,
  getThread,
} from "@/lib/threads";
import { toast } from "@/lib/toast";
import { confirmDialog } from "@/lib/confirm";
import { Markdown } from "./Markdown";
import { Modal } from "./Modal";
import clsx from "clsx";

type Attachment = { name: string; dataUrl: string };

function messageText(message: ChatMessage): string {
  if (typeof message.content === "string") return message.content;
  return message.content
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n\n");
}

// The little circle beside each message. Uses the user's chosen avatar (emoji
// or uploaded image) from settings, falling back to the default User/Bot icon.
function MessageAvatar({ isUser }: { isUser: boolean }) {
  const value = useStore((s) => (isUser ? s.userAvatar : s.assistantAvatar));
  const base = clsx(
    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 overflow-hidden",
    isUser ? "bg-user-bubble text-user-bubble-fg" : "bg-surface-2 text-muted"
  );
  if (value.startsWith("data:")) {
    return (
      <div className={base}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  if (value) {
    return (
      <div className={base}>
        <span className="text-base leading-none">{value}</span>
      </div>
    );
  }
  return (
    <div className={base}>{isUser ? <User size={14} /> : <Bot size={14} />}</div>
  );
}

export function ChatView() {
  const hydrated = useStore((s) => s.hydrated);
  const chats = useStore((s) => s.chats);
  const activeChatId = useStore((s) => s.activeChatId);
  const providers = useStore((s) => s.providers);
  const activeProviderId = useStore((s) => s.activeProviderId);
  const newChat = useStore((s) => s.newChat);
  const setActiveChat = useStore((s) => s.setActiveChat);
  const appendMessage = useStore((s) => s.appendMessage);
  const updateLastAssistantMessage = useStore((s) => s.updateLastAssistantMessage);
  const createBranch = useStore((s) => s.createBranch);
  const renameChat = useStore((s) => s.renameChat);
  const renameThread = useStore((s) => s.renameThread);
  const deleteThread = useStore((s) => s.deleteThread);
  const updateProvider = useStore((s) => s.updateProvider);
  const historyTurns = useStore((s) => s.historyTurns);
  const generalInstructions = useStore((s) => s.generalInstructions);
  const spaces = useStore((s) => s.spaces);

  const provider = providers[activeProviderId];
  const providerPreset = getProvider(activeProviderId);
  const availableModels = useMemo(() => {
    const merged = [
      ...(providerPreset?.suggestedModels ?? []),
      ...provider.customModels,
    ];
    if (provider.model && !merged.includes(provider.model)) merged.unshift(provider.model);
    return merged;
  }, [providerPreset, provider.customModels, provider.model]);

  const chat = useMemo(
    () => chats.find((c) => c.id === activeChatId) ?? null,
    [chats, activeChatId]
  );

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  // Reset to the root thread whenever the active chat changes.
  useEffect(() => {
    const c = chats.find((x) => x.id === activeChatId);
    setActiveThreadId(c ? c.rootThreadId : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId]);

  const activeThread = useMemo(() => {
    if (!chat || !chat.threads) return null;
    const wanted = activeThreadId ? getThread(chat, activeThreadId) : undefined;
    return wanted ?? getThread(chat, chat.rootThreadId) ?? chat.threads[0] ?? null;
  }, [chat, activeThreadId]);

  // Close any in-progress breadcrumb rename when the active thread changes.
  useEffect(() => {
    setRenamingBranch(false);
  }, [activeThreadId]);

  const path = useMemo(
    () => (chat && activeThread ? threadPath(chat, activeThread.id) : []),
    [chat, activeThread]
  );
  const isRoot = activeThread?.parentThreadId == null;

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const scrollPositions = useRef<Map<string, number>>(new Map());
  const activeThreadIdRef = useRef<string | null>(null);

  // Keep the ref in sync so scroll handler always sees the latest thread id.
  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);
  const [expanded, setExpanded] = useState(false);
  const [renamingBranch, setRenamingBranch] = useState(false);
  const [branchDraft, setBranchDraft] = useState("");
  const cancelRenameRef = useRef(false);

  const modelSupportsVision = isVisionModel(activeProviderId, provider.model);
  const modelIsImageGen = isImageGenModel(activeProviderId, provider.model);

  useEffect(() => {
    if (hydrated && !activeChatId && chats.length > 0) {
      setActiveChat(chats[0].id);
    }
  }, [hydrated, activeChatId, chats, setActiveChat]);

  const [showScrollButton, setShowScrollButton] = useState(false);
  const [promptNav, setPromptNav] = useState({ hasPrev: false, hasNext: false });

  // --- Prompt jumping ---------------------------------------------------
  // Navigate between USER prompts, derived LIVE from scroll position on every
  // click (never a stored counter that could drift). Direction-based, not an
  // index ±1: ↓ scrolls to the first prompt BELOW the reading line, ↑ to the
  // last prompt ABOVE it. So ↑ never "fades out" mid-prompt — as long as a
  // prompt exists on that side, the button reaches it.
  const computePromptState = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return null;
    const els = Array.from(
      container.querySelectorAll<HTMLElement>('[data-role="user"]')
    );
    const cTop = container.getBoundingClientRect().top;
    // Reading line: where a jumped-to prompt's top lands. Kept clear of the
    // sticky branch breadcrumb when it's showing.
    const bc = container.querySelector<HTMLElement>("[data-breadcrumb]");
    const L = 12 + (bc ? bc.offsetHeight : 0);
    // Each prompt's top relative to the viewport top (negative = scrolled past).
    const rels = els.map((e) => e.getBoundingClientRect().top - cTop);
    const EPS = 4;
    // The first prompt parks at the content's top padding, which sits BELOW the
    // landing line L. "Next" must clear that parking spot, else ↓ at the very
    // top just nudges the first prompt up instead of advancing to the second.
    const pad = rels.length ? rels[0] + container.scrollTop : L;
    const downLine = Math.max(L + EPS, pad + EPS); // "below" once a top passes this
    const upLine = L - EPS; //                        "above" once a top is before this
    return { container, rels, L, downLine, upLine };
  }, []);

  const jumpPrompt = useCallback(
    (dir: 1 | -1) => {
      const s = computePromptState();
      if (!s || s.rels.length === 0) return;
      let targetIdx = -1;
      if (dir === 1) {
        targetIdx = s.rels.findIndex((r) => r > s.downLine);
      } else {
        for (let i = s.rels.length - 1; i >= 0; i--) {
          if (s.rels[i] < s.upLine) {
            targetIdx = i;
            break;
          }
        }
      }
      if (targetIdx < 0) return; // nothing on that side
      s.container.scrollTo({
        top: Math.max(0, s.container.scrollTop + s.rels[targetIdx] - s.L),
        behavior: "smooth",
      });
    },
    [computePromptState]
  );

  const refreshPromptNav = useCallback(() => {
    const s = computePromptState();
    const hasPrev = !!s && s.rels.some((r) => r < s.upLine);
    const hasNext = !!s && s.rels.some((r) => r > s.downLine);
    setPromptNav((p) =>
      p.hasPrev === hasPrev && p.hasNext === hasNext ? p : { hasPrev, hasNext }
    );
  }, [computePromptState]);

  // Track whether the user has scrolled away from the bottom.
  const checkScrollPosition = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setShowScrollButton(!atBottom);
    // Remember scroll position for the active thread.
    const tid = activeThreadIdRef.current;
    if (tid) {
      scrollPositions.current.set(tid, el.scrollTop);
    }
    refreshPromptNav();
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScrollPosition, { passive: true });
    return () => el.removeEventListener("scroll", checkScrollPosition);
  }, []);

  // Restore saved scroll position when switching threads.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !activeThreadId) return;
    const saved = scrollPositions.current.get(activeThreadId);
    if (saved !== undefined) {
      requestAnimationFrame(() => {
        el.scrollTop = saved;
      });
    }
  }, [activeThreadId]);

  // Also re-check when messages change (content grows during streaming).
  useEffect(() => {
    checkScrollPosition();
  }, [activeThread?.messages.length, sending]);

  // Keep the prompt-jump buttons' enabled state fresh on thread switch, new
  // messages, and streaming (rAF so layout has settled before we measure).
  useEffect(() => {
    const raf = requestAnimationFrame(() => refreshPromptNav());
    return () => cancelAnimationFrame(raf);
  }, [activeThread?.id, activeThread?.messages.length, sending, refreshPromptNav]);

  // Alt+↑ / Alt+↓ jump between user prompts from anywhere (Alt avoids
  // clashing with plain arrow keys in the composer).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        jumpPrompt(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        jumpPrompt(-1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [jumpPrompt]);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  const canSend = !!provider.apiKey && !!provider.model && !!provider.baseUrl;

  const onPickFiles = async (files: FileList | null) => {
    if (!files) return;
    const items: Attachment[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      const dataUrl = await fileToDataUrl(f);
      items.push({ name: f.name, dataUrl });
    }
    setAttachments((prev) => [...prev, ...items]);
  };

  const copyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied");
    } catch {
      toast("Copy failed");
    }
  };

  const branchFrom = (messageId: string) => {
    if (!chat || !activeThread) return;
    const newThreadId = createBranch(chat.id, activeThread.id, messageId);
    setActiveThreadId(newThreadId);
    toast("Branch created");
  };

  const handleDeleteBranch = async () => {
    if (!chat || !activeThread || activeThread.parentThreadId === null) return;
    const label = branchLabel(chat, activeThread);
    const ok = await confirmDialog({
      title: "Delete branch?",
      message: `"${label}" and any child branches will be permanently removed.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    const parentId = activeThread.parentThreadId;
    deleteThread(chat.id, activeThread.id);
    // Navigate back to parent if we're still on the deleted thread.
    const updated = useStore.getState().chats.find((c) => c.id === chat.id);
    if (updated && !updated.threads.some((t) => t.id === activeThread.id)) {
      setActiveThreadId(parentId);
    }
    toast("Branch deleted");
  };

  const send = async () => {
    if (sending) return;
    const trimmed = input.trim();
    if (!trimmed && attachments.length === 0) return;
    if (!canSend) {
      setError("Set your API key, base URL, and model in Settings first.");
      return;
    }
    setError(null);

    let chatId = activeChatId;
    let threadId = activeThreadId;
    if (!chatId) {
      chatId = newChat();
      threadId = useStore.getState().chats.find((c) => c.id === chatId)!.rootThreadId;
      setActiveThreadId(threadId);
    }
    if (!threadId) {
      threadId = useStore.getState().chats.find((c) => c.id === chatId)!.rootThreadId;
    }

    const content: ContentPart[] | string =
      attachments.length > 0
        ? [
            ...(trimmed ? [{ type: "text" as const, text: trimmed }] : []),
            ...attachments.map((a) => ({
              type: "image_url" as const,
              image_url: { url: a.dataUrl },
            })),
          ]
        : trimmed;

    // Title the chat from the first message on the ROOT thread only.
    const chatBefore = useStore.getState().chats.find((c) => c.id === chatId);
    const targetThreadBefore = chatBefore?.threads.find((t) => t.id === threadId);
    const isFirstRootMessage =
      threadId === chatBefore?.rootThreadId &&
      (targetThreadBefore?.messages.length ?? 0) === 0;

    appendMessage(chatId, threadId, { role: "user", content }, provider.model);
    appendMessage(chatId, threadId, { role: "assistant", content: "" }, provider.model);

    if (isFirstRootMessage && trimmed) {
      renameChat(chatId, trimmed.slice(0, 40));
    }

    setInput("");
    setAttachments([]);
    setSending(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (modelIsImageGen) {
        const images = await withRetry(
          () =>
            generateImage({
              baseUrl: provider.baseUrl,
              apiKey: provider.apiKey,
              model: provider.model,
              prompt: trimmed,
              signal: controller.signal,
            }),
          3,
        );
        const md = images
          .map((img, i) => {
            const src = img.url ?? (img.b64_json ? `data:image/png;base64,${img.b64_json}` : "");
            return src ? `![generated ${i + 1}](${src})` : "";
          })
          .filter(Boolean)
          .join("\n\n");
        updateLastAssistantMessage(chatId, threadId, md || "(no image returned)");
      } else {
        // Build the API context from the active thread: inherited ancestor
        // context (parents up to their anchor) + this thread's messages.
        const latest = useStore.getState().chats.find((c) => c.id === chatId)!;
        const ctx = buildContext(latest, threadId).filter(
          (m, idx, arr) => !(idx === arr.length - 1 && m.role === "assistant")
        );
        const trimmedCtx = truncateHistory(toApiMessages(ctx), historyTurns);

        // System message = general + space instructions (general first).
        // Rebuilt each send so the latest instructions always apply.
        const chatSpace = latest.spaceId
          ? spaces.find((sp) => sp.id === latest.spaceId)
          : null;
        const systemText = [generalInstructions, chatSpace?.instructions]
          .map((s) => s?.trim())
          .filter(Boolean)
          .join("\n\n");
        const withSystem: ChatMessage[] = systemText
          ? [{ role: "system", content: systemText }, ...trimmedCtx]
          : trimmedCtx;

        let full = "";
        // Throttle store writes to ~1 per 80ms during streaming; each flush
        // persists state and re-parses growing markdown.
        const FLUSH_INTERVAL_MS = 80;

        await withRetry(async (attempt) => {
          // Reset stream state on each retry.
          full = "";
          let lastFlush = 0;
          let pending = false;
          if (attempt > 1) {
            toast(`Retrying (attempt ${attempt}/3)...`);
          }
          for await (const delta of streamChat({
            baseUrl: provider.baseUrl,
            apiKey: provider.apiKey,
            model: provider.model,
            messages: withSystem,
            signal: controller.signal,
          })) {
            full += delta;
            const now =
              typeof performance !== "undefined" ? performance.now() : Date.now();
            if (now - lastFlush >= FLUSH_INTERVAL_MS) {
              updateLastAssistantMessage(chatId, threadId, full);
              lastFlush = now;
              pending = false;
            } else {
              pending = true;
            }
          }
          if (pending || full.length > 0) {
            updateLastAssistantMessage(chatId, threadId, full);
          }
        }, 3);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      updateLastAssistantMessage(chatId, threadId, `**Error:** ${msg}`);
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
  };

  const handleRegenerate = async (messageId: string) => {
    if (sending || !chat || !activeThreadId || !canSend) return;
    const thread = chat.threads.find((t) => t.id === activeThreadId);
    if (!thread) return;
    const idx = thread.messages.findIndex((m) => m.id === messageId);
    // Only allow regenerating the last assistant message.
    if (idx === -1 || idx !== thread.messages.length - 1 || thread.messages[idx].role !== "assistant") return;
    const userMsg = thread.messages[idx - 1];
    if (!userMsg || userMsg.role !== "user") return;

    // Clear the assistant message so it shows as streaming.
    updateLastAssistantMessage(chat.id, activeThreadId, "");
    setSending(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (modelIsImageGen) {
        const promptText = messageText(userMsg);
        const images = await withRetry(
          () =>
            generateImage({
              baseUrl: provider.baseUrl,
              apiKey: provider.apiKey,
              model: provider.model,
              prompt: promptText,
              signal: controller.signal,
            }),
          3,
        );
        const md = images
          .map((img, i) => {
            const src = img.url ?? (img.b64_json ? `data:image/png;base64,${img.b64_json}` : "");
            return src ? `![generated ${i + 1}](${src})` : "";
          })
          .filter(Boolean)
          .join("\n\n");
        updateLastAssistantMessage(chat.id, activeThreadId, md || "(no image returned)");
      } else {
        const latest = useStore.getState().chats.find((c) => c.id === chat.id)!;
        const ctx = buildContext(latest, activeThreadId).filter(
          (m, idx2, arr) => !(idx2 === arr.length - 1 && m.role === "assistant")
        );
        const trimmedCtx = truncateHistory(toApiMessages(ctx), historyTurns);
        const chatSpace = latest.spaceId
          ? spaces.find((sp) => sp.id === latest.spaceId)
          : null;
        const systemText = [generalInstructions, chatSpace?.instructions]
          .map((s) => s?.trim())
          .filter(Boolean)
          .join("\n\n");
        const withSystem: ChatMessage[] = systemText
          ? [{ role: "system", content: systemText }, ...trimmedCtx]
          : trimmedCtx;

        let full = "";
        const FLUSH_INTERVAL_MS = 80;
        await withRetry(async (attempt) => {
          full = "";
          let lastFlush = 0;
          let pending = false;
          if (attempt > 1) toast(`Retrying (attempt ${attempt}/3)...`);
          for await (const delta of streamChat({
            baseUrl: provider.baseUrl,
            apiKey: provider.apiKey,
            model: provider.model,
            messages: withSystem,
            signal: controller.signal,
          })) {
            full += delta;
            const now = typeof performance !== "undefined" ? performance.now() : Date.now();
            if (now - lastFlush >= FLUSH_INTERVAL_MS) {
              updateLastAssistantMessage(chat.id, activeThreadId, full);
              lastFlush = now;
              pending = false;
            } else {
              pending = true;
            }
          }
          if (pending || full.length > 0) {
            updateLastAssistantMessage(chat.id, activeThreadId, full);
          }
        }, 3);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      updateLastAssistantMessage(chat.id, activeThreadId, `**Error:** ${msg}`);
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  };

  const messages = activeThread?.messages ?? [];
  const userPromptCount = messages.reduce(
    (n, m) => (m.role === "user" ? n + 1 : n),
    0
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative">
        {chat && path.length > 1 && (
          <div data-breadcrumb className="sticky top-0 z-10 bg-bg/95 backdrop-blur border-b px-4 py-2 flex items-center gap-1 text-xs flex-wrap">
            {path.map((t, i) => (
              <Fragment key={t.id}>
                {i > 0 && <ChevronRight size={12} className="text-muted" />}
                <button
                  onClick={() => setActiveThreadId(t.id)}
                  className={clsx(
                    "px-1.5 py-0.5 rounded-app truncate max-w-[180px]",
                    i === path.length - 1
                      ? "text-text font-medium"
                      : "text-muted hover:text-text hover:bg-surface-2"
                  )}
                  title={i === 0 ? "Main" : branchLabel(chat, t)}
                >
                  {i === 0 ? "Main" : branchLabel(chat, t)}
                </button>
              </Fragment>
            ))}
            {activeThread &&
              activeThread.parentThreadId !== null &&
              (renamingBranch ? (
                <input
                  autoFocus
                  value={branchDraft}
                  onChange={(e) => setBranchDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                    } else if (e.key === "Escape") {
                      cancelRenameRef.current = true;
                      e.currentTarget.blur();
                    }
                  }}
                  onBlur={() => {
                    if (!cancelRenameRef.current) {
                      renameThread(chat.id, activeThread.id, branchDraft);
                    }
                    cancelRenameRef.current = false;
                    setRenamingBranch(false);
                  }}
                  placeholder="Branch name"
                  className="ml-1 bg-surface-2 border rounded-app px-2 py-0.5 text-xs outline-none focus:border-accent min-w-[120px]"
                />
              ) : (
                <button
                  onClick={() => {
                    setBranchDraft(activeThread.title ?? "");
                    setRenamingBranch(true);
                  }}
                  className="ml-1 p-1 rounded-app text-muted hover:text-text hover:bg-surface-2"
                  title="Rename this branch"
                >
                  <Pencil size={12} />
                </button>
              ))}
            {activeThread && activeThread.parentThreadId !== null && !renamingBranch && (
              <button
                onClick={handleDeleteBranch}
                className="ml-0.5 p-1 rounded-app text-muted hover:text-danger hover:bg-surface-2"
                title="Delete this branch"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        )}

        {!hydrated ? null : !chat ? (
          <EmptyState onNewChat={newChat} />
        ) : messages.length === 0 ? (
          isRoot ? (
            <EmptyChat providerName={activeProviderId} model={provider.model} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-4">
              <GitBranch size={28} className="text-muted" />
              <div className="text-sm text-muted max-w-sm">
                New branch. Messages here continue from the point you branched —
                the main thread won&apos;t see them.
              </div>
            </div>
          )
        ) : (
          <div className="max-w-5xl mx-auto py-6 px-4 space-y-4">
            {messages.map((m, i) => (
              <MessageRow
                key={m.id}
                message={m}
                branches={
                  chat && activeThread
                    ? childBranches(chat, activeThread.id, m.id)
                    : []
                }
                branchLabelFor={(t) => (chat ? branchLabel(chat, t) : "Branch")}
                onCopy={copyMessage}
                onBranch={branchFrom}
                onRegenerate={handleRegenerate}
                isLastMessage={i === messages.length - 1}
                onNavigate={setActiveThreadId}
                onRename={(threadId, title) => {
                  if (chat) renameThread(chat.id, threadId, title);
                }}
              />
            ))}
          </div>
        )}

        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-32 right-6 z-20 bg-surface-2 border rounded-full p-2 shadow-md text-muted hover:text-text hover:bg-surface-3 transition-all"
            aria-label="Scroll to bottom"
          >
            <ArrowDown size={18} />
          </button>
        )}

        {userPromptCount >= 2 && (
          <div className="fixed bottom-44 right-6 z-20 flex flex-col gap-1">
            <button
              onClick={() => jumpPrompt(-1)}
              disabled={!promptNav.hasPrev}
              className="bg-surface-2 border rounded-full p-2 shadow-md text-muted transition-all enabled:hover:text-text enabled:hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous prompt (Alt+Up)"
              title="Previous prompt (Alt+↑)"
            >
              <ChevronUp size={18} />
            </button>
            <button
              onClick={() => jumpPrompt(1)}
              disabled={!promptNav.hasNext}
              className="bg-surface-2 border rounded-full p-2 shadow-md text-muted transition-all enabled:hover:text-text enabled:hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next prompt (Alt+Down)"
              title="Next prompt (Alt+↓)"
            >
              <ChevronDown size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="border-t p-3 shrink-0">
        <div className="max-w-5xl mx-auto">
          {error && <div className="mb-2 text-sm text-danger">{error}</div>}
          {!isRoot && (
            <div className="mb-2 text-xs text-muted flex items-center gap-1.5">
              <GitBranch size={12} />
              Replying in branch
              <span className="text-text">
                {chat && activeThread ? branchLabel(chat, activeThread) : ""}
              </span>
            </div>
          )}
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((a, i) => (
                <div key={i} className="relative group">
                  <img
                    src={a.dataUrl}
                    alt={a.name}
                    className="w-16 h-16 object-cover rounded-app border"
                  />
                  <button
                    onClick={() =>
                      setAttachments((prev) => prev.filter((_, j) => j !== i))
                    }
                    className="absolute -top-1 -right-1 bg-danger text-white rounded-full p-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="mb-2 flex items-center gap-2 text-xs">
            <label className="text-muted">Model</label>
            <div className="relative">
              <select
                value={provider.model}
                onChange={(e) =>
                  updateProvider(activeProviderId, { model: e.target.value })
                }
                disabled={availableModels.length === 0}
                className="appearance-none bg-surface-2 border rounded-app pl-2.5 pr-7 py-1 font-mono text-xs outline-none focus:border-accent disabled:opacity-50 cursor-pointer"
              >
                {availableModels.length === 0 && <option value="">no models</option>}
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted text-[10px]">
                ▾
              </span>
            </div>
            <span className="text-muted select-none">·</span>
            <span className="text-muted">
              Provider: <span className="text-text font-medium">{activeProviderId}</span>
            </span>
            {modelSupportsVision && (
              <span className="bg-surface-2 border rounded-app px-1.5 py-0.5 text-muted">
                vision
              </span>
            )}
            {modelIsImageGen && (
              <span className="bg-surface-2 border rounded-app px-1.5 py-0.5 text-muted">
                image-gen
              </span>
            )}
          </div>
          <div className="flex items-end gap-2 bg-surface-2 border rounded-app p-2">
            {modelSupportsVision && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    onPickFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="p-2 text-muted hover:text-text"
                  title="Attach image"
                >
                  <Paperclip size={18} />
                </button>
              </>
            )}
            {modelIsImageGen && (
              <div className="p-2 text-muted" title="Image generation mode">
                <ImagePlus size={18} />
              </div>
            )}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={
                modelIsImageGen
                  ? "Describe the image to generate…"
                  : "Type here.."
              }
              rows={1}
              className="flex-1 bg-transparent outline-none resize-none py-1.5 text-sm max-h-40"
              style={{ minHeight: 28 }}
            />
            <button
              onClick={() => setExpanded(true)}
              className="p-2 text-muted hover:text-text"
              title="Expand editor"
            >
              <Maximize2 size={16} />
            </button>
            {sending ? (
              <button
                onClick={stop}
                className="p-2 rounded-app bg-accent text-white hover:opacity-90"
                title="Stop"
              >
                <Square size={16} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={send}
                disabled={!canSend}
                className={clsx(
                  "p-2 rounded-app bg-accent text-accent-fg transition",
                  canSend ? "hover:opacity-90" : "opacity-40 cursor-not-allowed"
                )}
                title="Send (Enter)"
              >
                <Send size={16} />
              </button>
            )}
          </div>
          {!canSend && (
            <div className="text-xs text-muted mt-2">
              ! Add your API key in Settings to send messages.
            </div>
          )}
        </div>
      </div>

      <Modal open={expanded} onClose={() => setExpanded(false)} title="Compose" wide>
        <div className="flex flex-col gap-3">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((a, i) => (
                <div key={i} className="relative group">
                  <img
                    src={a.dataUrl}
                    alt={a.name}
                    className="w-20 h-20 object-cover rounded-app border"
                  />
                  <button
                    onClick={() =>
                      setAttachments((prev) => prev.filter((_, j) => j !== i))
                    }
                    className="absolute -top-1 -right-1 bg-danger text-white rounded-full p-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (
                (e.ctrlKey || e.metaKey) &&
                e.key === "Enter" &&
                !sending &&
                canSend
              ) {
                e.preventDefault();
                setExpanded(false);
                send();
              }
            }}
            placeholder="Type your message… (Ctrl/Cmd+Enter to send, Enter for newline)"
            autoFocus
            className="w-full bg-surface-2 border rounded-app p-3 text-sm outline-none focus:border-accent resize-none"
            style={{ minHeight: "55vh" }}
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">
              Ctrl/Cmd + Enter to send · Enter inserts newline
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setExpanded(false)}
                className="px-3 py-1.5 rounded-app border text-sm hover:bg-surface-2"
              >
                Close
              </button>
              {sending ? (
                <button
                  onClick={() => stop()}
                  className="px-3 py-1.5 rounded-app bg-danger text-white text-sm hover:opacity-90 inline-flex items-center gap-1.5"
                >
                  <Square size={12} fill="currentColor" /> Stop
                </button>
              ) : (
                <button
                  onClick={() => {
                    setExpanded(false);
                    send();
                  }}
                  disabled={!canSend || (!input.trim() && attachments.length === 0)}
                  className={clsx(
                    "px-3 py-1.5 rounded-app bg-accent text-accent-fg text-sm inline-flex items-center gap-1.5",
                    canSend && (input.trim() || attachments.length > 0)
                      ? "hover:opacity-90"
                      : "opacity-40 cursor-not-allowed"
                  )}
                >
                  <Send size={12} /> Send
                </button>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function EmptyState({ onNewChat }: { onNewChat: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-4">
      <Image
        src="/atom-logo.png"
        alt="Atom"
        width={72}
        height={72}
        priority
        className="mb-1 rounded-app bg-white p-2"
      />
      <div className="text-lg font-medium">Welcome to MAGMO Chat</div>
      <div className="text-sm text-muted max-w-md">
        Bring your own DeepSeek, OpenRouter, or OpenAI-compatible API key.
        Everything runs client-side.
      </div>
      <button
        onClick={() => onNewChat()}
        className="mt-2 px-4 py-2 rounded-app bg-accent text-accent-fg text-sm hover:opacity-90"
      >
        Start a new chat
      </button>
    </div>
  );
}

function EmptyChat({ providerName, model }: { providerName: string; model: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-4">
      <div className="text-sm text-muted">
        Chatting with <span className="text-text font-mono">{model || "no model"}</span> via{" "}
        <span className="text-text">{providerName}</span>
      </div>
    </div>
  );
}

function MessageRow({
  message,
  branches,
  branchLabelFor,
  onCopy,
  onBranch,
  onRegenerate,
  isLastMessage,
  onNavigate,
  onRename,
}: {
  message: StoredMessage;
  branches: Thread[];
  branchLabelFor: (t: Thread) => string;
  onCopy: (text: string) => void;
  onBranch: (messageId: string) => void;
  onRegenerate: (messageId: string) => void;
  isLastMessage: boolean;
  onNavigate: (threadId: string) => void;
  onRename: (threadId: string, title: string) => void;
}) {
  const isUser = message.role === "user";
  const text = messageText(message);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [branchDraft, setBranchDraft] = useState("");
  const cancelEditRef = useRef(false);

  const openBranches = () => {
    if (branches.length === 1) onNavigate(branches[0].id);
    else setPickerOpen((v) => !v);
  };

  return (
    <div
      data-role={message.role}
      className={clsx("flex gap-3 group min-w-0", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <MessageAvatar isUser={isUser} />
      <div
        className={clsx(
          "flex flex-col gap-1 min-w-0 max-w-[85%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <MessageBubble message={message} />

        {text && (
          <div
            className={clsx(
              "flex items-center gap-1 text-muted",
              isUser ? "flex-row-reverse" : "flex-row"
            )}
          >
            <button
              onClick={() => onCopy(text)}
              className="p-1 rounded-app hover:text-text hover:bg-surface-2 opacity-0 group-hover:opacity-100 transition"
              title="Copy"
            >
              <Copy size={13} />
            </button>
            {!isUser && (
              <button
                onClick={() => onBranch(message.id)}
                className="p-1 rounded-app hover:text-text hover:bg-surface-2 opacity-0 group-hover:opacity-100 transition"
                title="Branch from here"
              >
                <GitBranch size={13} />
              </button>
            )}
            {!isUser && isLastMessage && (
              <button
                onClick={() => onRegenerate(message.id)}
                className="p-1 rounded-app hover:text-text hover:bg-surface-2 opacity-0 group-hover:opacity-100 transition"
                title="Regenerate response"
              >
                <RefreshCw size={13} />
              </button>
            )}
            {!isUser && message.timestamp && (
              <span className="text-[11px] select-none opacity-0 group-hover:opacity-100 transition">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {message.model && ` · ${message.model}`}
              </span>
            )}
          </div>
        )}

        {branches.length > 0 && (
          <div className="relative">
            <button
              onClick={openBranches}
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-text border rounded-app px-1.5 py-0.5"
              title="View branches"
            >
              <GitBranch size={12} />
              {branches.length} branch{branches.length === 1 ? "" : "es"}
            </button>
            {pickerOpen && branches.length > 1 && (
              <div className="absolute z-20 mt-1 bg-surface border rounded-app shadow-lg py-1 min-w-[200px]">
                {branches.map((b) => (
                  <div key={b.id} className="flex items-center gap-1 px-1">
                    {editingBranchId === b.id ? (
                      <input
                        autoFocus
                        value={branchDraft}
                        onChange={(e) => setBranchDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          } else if (e.key === "Escape") {
                            cancelEditRef.current = true;
                            e.currentTarget.blur();
                          }
                        }}
                        onBlur={() => {
                          if (!cancelEditRef.current) onRename(b.id, branchDraft);
                          cancelEditRef.current = false;
                          setEditingBranchId(null);
                        }}
                        placeholder="Branch name"
                        className="flex-1 min-w-0 bg-surface-2 border rounded-app px-2 py-1 text-xs outline-none focus:border-accent"
                      />
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setPickerOpen(false);
                            onNavigate(b.id);
                          }}
                          className="flex-1 min-w-0 text-left px-2 py-1.5 text-xs hover:bg-surface-2 rounded-app truncate"
                        >
                          {branchLabelFor(b)}
                        </button>
                        <button
                          onClick={() => {
                            setEditingBranchId(b.id);
                            setBranchDraft(b.title ?? "");
                          }}
                          className="p-1 text-muted hover:text-text shrink-0"
                          title="Rename branch"
                        >
                          <Pencil size={12} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const MessageBubble = memo(function MessageBubble({
  message,
}: {
  message: StoredMessage;
}) {
  const isUser = message.role === "user";
  const parts = typeof message.content === "string" ? null : message.content;
  const text = messageText(message);
  const images =
    parts?.filter(
      (p): p is { type: "image_url"; image_url: { url: string } } =>
        p.type === "image_url"
    ) ?? [];

  return (
    <div
      className={clsx(
        "rounded-app px-3.5 py-2.5 text-sm",
        isUser
          ? "bg-user-bubble text-user-bubble-fg"
          : "bg-assistant-bubble text-assistant-bubble-fg"
      )}
    >
      {images.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {images.map((im, i) => (
            <img
              key={i}
              src={im.image_url.url}
              alt=""
              className="max-w-full max-h-64 rounded-app"
            />
          ))}
        </div>
      )}
      {text ? (
        isUser ? (
          <div className="whitespace-pre-wrap break-words">{text}</div>
        ) : (
          <Markdown>{text}</Markdown>
        )
      ) : !isUser ? (
        <div className="text-muted text-sm italic">…</div>
      ) : null}
    </div>
  );
});
