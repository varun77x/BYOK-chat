"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  MessageSquarePlus,
  Trash2,
  Save,
} from "lucide-react";
import clsx from "clsx";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import { confirmDialog } from "@/lib/confirm";
import { countMessages } from "@/lib/threads";
import { EmojiPicker } from "./EmojiPicker";

export function SpaceDetailView({ spaceId }: { spaceId: string }) {
  const router = useRouter();
  const hydrated = useStore((s) => s.hydrated);
  const space = useStore((s) => s.spaces.find((sp) => sp.id === spaceId));
  const chats = useStore((s) => s.chats);
  const updateSpace = useStore((s) => s.updateSpace);
  const deleteSpace = useStore((s) => s.deleteSpace);
  const newChat = useStore((s) => s.newChat);
  const setActiveChat = useStore((s) => s.setActiveChat);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("📚");
  const [instructions, setInstructions] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!space) return;
    setName(space.name);
    setDescription(space.description);
    setEmoji(space.emoji || "📚");
    setInstructions(space.instructions);
    setDirty(false);
  }, [space?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const spaceChats = useMemo(
    () =>
      chats
        .filter((c) => c.spaceId === spaceId)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [chats, spaceId]
  );

  if (hydrated && !space) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-4">
        <div className="text-lg font-medium">Space not found</div>
        <button
          onClick={() => router.push("/spaces")}
          className="text-sm text-accent hover:underline"
        >
          Back to spaces
        </button>
      </div>
    );
  }

  if (!hydrated || !space) {
    return null;
  }

  const save = () => {
    updateSpace(spaceId, {
      name: name.trim() || "Untitled space",
      description,
      emoji: emoji || "📚",
      instructions,
    });
    setDirty(false);
    toast("Space saved");
  };

  const startChat = () => {
    const id = newChat(spaceId);
    setActiveChat(id);
    router.push("/");
  };

  const remove = async () => {
    if (
      await confirmDialog({
        title: `Delete "${space.name}"?`,
        message: `Its ${spaceChats.length} chat(s) will remain but no longer belong to this space.`,
        confirmLabel: "Delete space",
        danger: true,
      })
    ) {
      deleteSpace(spaceId);
      toast("Space deleted");
      router.push("/spaces");
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="border-b px-4 py-2.5 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.push("/spaces")}
          className="p-1 text-muted hover:text-text"
          title="Back to spaces"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="text-sm text-muted">Spaces</div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
          <section className="flex items-start gap-4">
            <EmojiPicker
              value={emoji}
              onChange={(e) => {
                setEmoji(e);
                setDirty(true);
              }}
            />
            <div className="flex-1 min-w-0 space-y-2">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setDirty(true);
                }}
                placeholder="Space name"
                className="w-full bg-transparent border-0 border-b border-transparent focus:border-accent text-2xl font-semibold outline-none px-0 py-1"
              />
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setDirty(true);
                }}
                placeholder="Short description (optional)"
                rows={2}
                className="w-full bg-surface-2 border rounded-app px-3 py-2 text-sm outline-none focus:border-accent resize-none"
              />
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Custom instructions for this space
              </label>
              <span className="text-xs text-muted">
                Added on top of your general instructions
              </span>
            </div>
            <textarea
              value={instructions}
              onChange={(e) => {
                setInstructions(e.target.value);
                setDirty(true);
              }}
              placeholder="e.g. You are an expert code reviewer. Focus on correctness and readability. Prefer functional style. Reply in Markdown."
              rows={6}
              className="w-full bg-surface-2 border rounded-app px-3 py-2 text-sm outline-none focus:border-accent resize-y font-mono"
            />
          </section>

          <section className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={!dirty}
              className={clsx(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-app text-sm transition",
                dirty
                  ? "bg-accent text-accent-fg hover:opacity-90"
                  : "bg-surface-2 text-muted cursor-not-allowed"
              )}
            >
              <Save size={14} /> {dirty ? "Save changes" : "Saved"}
            </button>
            <button
              onClick={remove}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-app text-sm text-danger hover:bg-surface-2 ml-auto"
            >
              <Trash2 size={14} /> Delete space
            </button>
          </section>

          <section className="pt-4 border-t space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">
                Chats in this space{" "}
                <span className="text-muted font-mono">({spaceChats.length})</span>
              </h2>
              <button
                onClick={startChat}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-app bg-accent text-accent-fg text-sm hover:opacity-90"
              >
                <MessageSquarePlus size={14} /> New chat in this space
              </button>
            </div>

            {spaceChats.length === 0 ? (
              <div className="text-sm text-muted border border-dashed rounded-app px-4 py-8 text-center">
                No chats yet. Start one — it&apos;ll automatically use both your general
                and this space&apos;s instructions.
              </div>
            ) : (
              <ul className="border rounded-app divide-y overflow-hidden">
                {spaceChats.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => {
                        setActiveChat(c.id);
                        router.push("/");
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-surface-2 flex items-center gap-2"
                    >
                      <span className="flex-1 truncate text-sm">
                        {c.title || "Untitled"}
                      </span>
                      <span className="text-xs text-muted">
                        {countMessages(c)} msg
                        {countMessages(c) === 1 ? "" : "s"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
