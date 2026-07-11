import { Chat, Thread, StoredMessage } from "./store";
import { ChatMessage } from "./api";

export function getThread(chat: Chat, threadId: string): Thread | undefined {
  return chat.threads?.find((t) => t.id === threadId);
}

export function getRootThread(chat: Chat): Thread | undefined {
  const threads = chat.threads ?? [];
  return (
    threads.find((t) => t.id === chat.rootThreadId) ??
    threads.find((t) => t.parentThreadId === null) ??
    threads[0]
  );
}

/**
 * Messages inherited from all ancestor threads: for each parent up the chain,
 * its messages up to AND INCLUDING the anchor message this branch forked from.
 * Excludes sibling branches and anything below the anchor.
 */
export function ancestorContext(chat: Chat, thread: Thread): StoredMessage[] {
  if (thread.parentThreadId === null) return [];
  const parent = getThread(chat, thread.parentThreadId);
  if (!parent) return [];
  const anchorIdx = parent.messages.findIndex(
    (m) => m.id === thread.anchorMessageId
  );
  const upToAnchor =
    anchorIdx >= 0 ? parent.messages.slice(0, anchorIdx + 1) : parent.messages;
  return [...ancestorContext(chat, parent), ...upToAnchor];
}

/**
 * Full context to send to the API for a given thread:
 * inherited ancestor context + this thread's own messages.
 */
export function buildContext(chat: Chat, threadId: string): StoredMessage[] {
  const thread = getThread(chat, threadId);
  if (!thread) return [];
  return [...ancestorContext(chat, thread), ...thread.messages];
}

/** Strip stored-only fields (id) so the payload is a clean API message. */
export function toApiMessages(msgs: StoredMessage[]): ChatMessage[] {
  return msgs.map(({ role, content }) => ({ role, content }));
}

/** Root → … → thread path, for breadcrumbs. */
export function threadPath(chat: Chat, threadId: string): Thread[] {
  const path: Thread[] = [];
  let cur = getThread(chat, threadId);
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    path.unshift(cur);
    cur = cur.parentThreadId ? getThread(chat, cur.parentThreadId) : undefined;
  }
  return path;
}

/** Direct child branches anchored at a specific message of a given thread. */
export function childBranches(
  chat: Chat,
  parentThreadId: string,
  anchorMessageId: string
): Thread[] {
  return (chat.threads ?? []).filter(
    (t) =>
      t.parentThreadId === parentThreadId &&
      t.anchorMessageId === anchorMessageId
  );
}

/** All descendant thread IDs (children, grandchildren, etc.) of a thread. */
export function descendantThreadIds(chat: Chat, threadId: string): string[] {
  const result: string[] = [];
  const stack = [threadId];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    const children = (chat.threads ?? []).filter(
      (t) => t.parentThreadId === cur
    );
    for (const child of children) {
      result.push(child.id);
      stack.push(child.id);
    }
  }
  return result;
}

/** Total messages across every thread in the chat. */
export function countMessages(chat: Chat): number {
  return (chat.threads ?? []).reduce((n, t) => n + t.messages.length, 0);
}

function contentToText(content: StoredMessage["content"]): string {
  if (typeof content === "string") return content;
  return content
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ");
}

function clip(text: string, max = 24): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > max ? t.slice(0, max) + "…" : t;
}

/**
 * A short human label for a branch. Precedence:
 *   1. an explicit user-given name (`thread.title`);
 *   2. the branch's OWN first user message — this is what keeps sibling
 *      branches forked from the same output distinct from one another
 *      (they all share the same anchor, so the anchor text can't);
 *   3. an ordinal ("Branch 2") among siblings at the same anchor, used only
 *      while the branch is still empty.
 */
export function branchLabel(chat: Chat, thread: Thread): string {
  if (thread.parentThreadId === null) return "Main";

  const custom = thread.title?.trim();
  if (custom) return custom;

  const firstUser = thread.messages.find((m) => m.role === "user");
  const own = firstUser ? clip(contentToText(firstUser.content)) : "";
  if (own) return own;

  const siblings = thread.anchorMessageId
    ? childBranches(chat, thread.parentThreadId, thread.anchorMessageId)
    : [];
  const idx = siblings.findIndex((t) => t.id === thread.id);
  return `Branch ${idx >= 0 ? idx + 1 : siblings.length + 1}`;
}
