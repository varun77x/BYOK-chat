"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Plus, FolderKanban } from "lucide-react";
import { useStore } from "@/lib/store";

export function SpacesGridView() {
  const spaces = useStore((s) => s.spaces);
  const chats = useStore((s) => s.chats);
  const newSpace = useStore((s) => s.newSpace);
  const hydrated = useStore((s) => s.hydrated);
  const router = useRouter();

  const sorted = useMemo(
    () => [...spaces].sort((a, b) => b.updatedAt - a.updatedAt),
    [spaces]
  );

  const chatCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of chats) if (c.spaceId) m[c.spaceId] = (m[c.spaceId] ?? 0) + 1;
    return m;
  }, [chats]);

  const create = () => {
    const id = newSpace();
    router.push(`/spaces/${id}`);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="border-b px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <FolderKanban size={16} className="text-muted" />
          <span className="font-medium">Spaces</span>
        </div>
        <button
          onClick={create}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-app bg-accent text-accent-fg text-sm hover:opacity-90"
        >
          <Plus size={14} /> New space
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto py-8 px-4">
          {!hydrated ? null : sorted.length === 0 ? (
            <EmptySpaces onCreate={create} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sorted.map((sp) => (
                <Link
                  key={sp.id}
                  href={`/spaces/${sp.id}`}
                  className="group p-4 border rounded-app bg-surface hover:border-accent transition flex flex-col gap-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl leading-none">{sp.emoji || "📚"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{sp.name}</div>
                      <div className="text-xs text-muted">
                        {chatCounts[sp.id] ?? 0} chat
                        {(chatCounts[sp.id] ?? 0) === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>
                  {sp.description && (
                    <p className="text-sm text-muted line-clamp-2">
                      {sp.description}
                    </p>
                  )}
                  {sp.instructions && (
                    <p className="text-xs text-muted italic line-clamp-2">
                      &ldquo;{sp.instructions}&rdquo;
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptySpaces({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="text-center py-16 flex flex-col items-center gap-3">
      <FolderKanban size={40} className="text-muted" />
      <div className="font-medium">No spaces yet</div>
      <p className="text-sm text-muted max-w-md">
        Spaces group related chats and share custom instructions —
        e.g. a &ldquo;Code review&rdquo; space that always follows your coding style,
        or a &ldquo;German tutor&rdquo; space that replies in German.
      </p>
      <button
        onClick={onCreate}
        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-app bg-accent text-accent-fg text-sm hover:opacity-90"
      >
        <Plus size={14} /> Create your first space
      </button>
    </div>
  );
}
