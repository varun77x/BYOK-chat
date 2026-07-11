"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MessageSquare,
  Beaker,
  Settings,
  Palette,
  Plus,
  Trash2,
  MoreVertical,
  Pencil,
  Pin,
  PinOff,
  FolderKanban,
} from "lucide-react";
import clsx from "clsx";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import { confirmDialog } from "@/lib/confirm";
import { SettingsModal } from "./SettingsModal";
import { ThemeCustomizer } from "./ThemeCustomizer";
import type { Chat } from "@/lib/store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  const chats = useStore((s) => s.chats);
  const activeChatId = useStore((s) => s.activeChatId);
  const setActiveChat = useStore((s) => s.setActiveChat);
  const newChat = useStore((s) => s.newChat);
  const hydrated = useStore((s) => s.hydrated);

  const sortedChats = useMemo(
    () =>
      [...chats].sort((a, b) => {
        const ap = a.pinned ? 1 : 0;
        const bp = b.pinned ? 1 : 0;
        if (ap !== bp) return bp - ap;
        return b.updatedAt - a.updatedAt;
      }),
    [chats]
  );

  const onChat = pathname === "/";
  const onSpaces = pathname.startsWith("/spaces");

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <aside className="w-48 shrink-0 border-r bg-surface flex flex-col">
        <div className="p-3 border-b flex items-center gap-2">
          <Image
            src="/atom-logo.png"
            alt="Atom"
            width={28}
            height={28}
            priority
            className="rounded-app bg-white p-0.5"
          />
          <div className="font-semibold">BYOK</div>
        </div>

        <nav className="p-2 flex flex-col gap-1 border-b">
          <Link
            href="/"
            className={clsx(
              "flex items-center gap-2 px-2.5 py-1.5 rounded-app text-sm",
              onChat ? "bg-surface-2 text-text" : "text-muted hover:text-text hover:bg-surface-2"
            )}
          >
            <MessageSquare size={16} /> Chat
          </Link>
          <Link
            href="/spaces"
            className={clsx(
              "flex items-center gap-2 px-2.5 py-1.5 rounded-app text-sm",
              onSpaces ? "bg-surface-2 text-text" : "text-muted hover:text-text hover:bg-surface-2"
            )}
          >
            <FolderKanban size={16} /> Spaces
          </Link>
          <Link
            href="/playground"
            className={clsx(
              "flex items-center gap-2 px-2.5 py-1.5 rounded-app text-sm",
              pathname === "/playground"
                ? "bg-surface-2 text-text"
                : "text-muted hover:text-text hover:bg-surface-2"
            )}
          >
            <Beaker size={16} /> Playground
          </Link>
        </nav>

        {onChat && (
          <>
            <div className="p-2 border-b">
              <button
                onClick={() => newChat()}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-app text-sm bg-accent text-accent-fg hover:opacity-90 transition"
              >
                <Plus size={16} /> New chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {hydrated && chats.length === 0 && (
                <div className="text-xs text-muted px-2 py-4 text-center">
                  No chats yet.
                </div>
              )}
              {sortedChats.map((c) => (
                <ChatRow key={c.id} chat={c} isActive={activeChatId === c.id} />
              ))}
            </div>
          </>
        )}

        <div className="p-2 border-t flex flex-col gap-1">
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-app text-sm text-muted hover:text-text hover:bg-surface-2"
          >
            <Settings size={16} /> Settings
          </button>
          <button
            onClick={() => setThemeOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-app text-sm text-muted hover:text-text hover:bg-surface-2"
          >
            <Palette size={16} /> Theme
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
        {children}
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ThemeCustomizer open={themeOpen} onClose={() => setThemeOpen(false)} />
    </div>
  );
}

function ChatRow({ chat, isActive }: { chat: Chat; isActive: boolean }) {
  const setActiveChat = useStore((s) => s.setActiveChat);
  const deleteChat = useStore((s) => s.deleteChat);
  const renameChat = useStore((s) => s.renameChat);
  const togglePinChat = useStore((s) => s.togglePinChat);
  const spaceEmoji = useStore((s) =>
    chat.spaceId ? s.spaces.find((sp) => sp.id === chat.spaceId)?.emoji : undefined
  );

  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(chat.title);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commitRename = () => {
    const next = draft.trim();
    if (next && next !== chat.title) renameChat(chat.id, next);
    setEditing(false);
  };

  return (
    <div
      className={clsx(
        "group flex items-center gap-1 rounded-app text-sm",
        isActive ? "bg-surface-2" : "hover:bg-surface-2"
      )}
    >
      {chat.pinned && (
        <Pin
          size={11}
          className="ml-1.5 text-muted shrink-0"
          fill="currentColor"
        />
      )}
      {spaceEmoji && (
        <span
          className={clsx("shrink-0 text-sm leading-none", chat.pinned ? "ml-0.5" : "ml-1.5")}
          title="From a space"
        >
          {spaceEmoji}
        </span>
      )}
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitRename();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setDraft(chat.title);
              setEditing(false);
            }
          }}
          className="flex-1 min-w-0 bg-transparent border rounded-app px-1.5 py-1 text-sm outline-none focus:border-accent"
        />
      ) : (
        <button
          onClick={() => setActiveChat(chat.id)}
          onDoubleClick={() => {
            setDraft(chat.title);
            setEditing(true);
          }}
          className={clsx(
            "flex-1 text-left py-1.5 truncate",
            chat.pinned || spaceEmoji ? "pl-1" : "pl-2.5"
          )}
          title={chat.title}
        >
          {chat.title || "Untitled"}
        </button>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          setMenuPos({ x: rect.right, y: rect.bottom });
        }}
        className={clsx(
          "p-1.5 text-muted hover:text-text transition",
          isActive ? "opacity-70" : "opacity-0 group-hover:opacity-70"
        )}
        title="More"
      >
        <MoreVertical size={14} />
      </button>

      {menuPos && (
        <ChatMenu
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setMenuPos(null)}
          onRename={() => {
            setDraft(chat.title);
            setEditing(true);
          }}
          onTogglePin={() => {
            togglePinChat(chat.id);
            toast(chat.pinned ? "Chat unpinned" : "Chat pinned");
          }}
          onDelete={async () => {
            if (
              await confirmDialog({
                title: "Delete this chat?",
                confirmLabel: "Delete",
                danger: true,
              })
            ) {
              deleteChat(chat.id);
              toast("Chat deleted");
            }
          }}
          pinned={!!chat.pinned}
        />
      )}
    </div>
  );
}

function ChatMenu({
  x,
  y,
  onClose,
  onRename,
  onTogglePin,
  onDelete,
  pinned,
}: {
  x: number;
  y: number;
  onClose: () => void;
  onRename: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  pinned: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // defer to next tick so the click that opened it doesn't immediately close it
    const id = window.setTimeout(() => {
      document.addEventListener("mousedown", onClick);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const menuWidth = 160;

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-surface border rounded-app shadow-lg py-1 text-sm"
      style={{
        left: Math.max(8, x - menuWidth),
        top: y + 4,
        width: menuWidth,
      }}
    >
      <MenuItem
        icon={<Pencil size={13} />}
        label="Rename"
        onClick={() => {
          onRename();
          onClose();
        }}
      />
      <MenuItem
        icon={pinned ? <PinOff size={13} /> : <Pin size={13} />}
        label={pinned ? "Unpin" : "Pin"}
        onClick={() => {
          onTogglePin();
          onClose();
        }}
      />
      <div className="my-1 border-t" />
      <MenuItem
        icon={<Trash2 size={13} />}
        label="Delete"
        danger
        onClick={() => {
          onDelete();
          onClose();
        }}
      />
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-surface-2 transition",
        danger ? "text-danger" : "text-text"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
