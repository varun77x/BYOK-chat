import { ChatMessage } from "./api";

/**
 * Keep the last N user/assistant turns while preserving any leading
 * system messages. Passing 0 (or negative) disables truncation.
 *
 * A "turn" is one user message + its assistant reply (2 messages).
 * If truncation would leave a dangling assistant at the head of the
 * conversation, drop it too — most providers reject histories that
 * don't start with a user (after the system prompt).
 */
export function truncateHistory(
  messages: ChatMessage[],
  maxTurns: number
): ChatMessage[] {
  if (maxTurns <= 0) return messages;

  let systemEnd = 0;
  while (systemEnd < messages.length && messages[systemEnd].role === "system") {
    systemEnd++;
  }
  const leading = messages.slice(0, systemEnd);
  const rest = messages.slice(systemEnd);

  const targetCount = maxTurns * 2;
  if (rest.length <= targetCount) return messages;

  let tail = rest.slice(-targetCount);
  while (tail.length > 0 && tail[0].role !== "user") tail.shift();

  return [...leading, ...tail];
}
