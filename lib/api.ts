export type TextPart = { type: "text"; text: string };
export type ImagePart = { type: "image_url"; image_url: { url: string } };
export type ContentPart = TextPart | ImagePart;

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
};

export type ChatOptions = {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  signal?: AbortSignal;
};

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return `${b}/${p}`;
}

/** Simple delay helper. */
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Retry an async function up to `maxRetries` times with exponential backoff.
 * Only retries on network/fetch errors — not on AbortError.
 * Returns the result of the first successful attempt.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (e) {
      lastError = e;
      if (e instanceof DOMException && e.name === "AbortError") throw e;
      if (attempt < maxRetries) {
        await delay(Math.pow(2, attempt - 1) * 1000); // 1s, 2s, 4s, ...
      }
    }
  }
  throw lastError;
}

/**
 * Stream chat completions from any OpenAI-compatible endpoint.
 * Yields incremental delta strings.
 */
export async function* streamChat(opts: ChatOptions): AsyncGenerator<string, void, unknown> {
  const url = joinUrl(opts.baseUrl, "chat/completions");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
      "X-Title": "BYOK Chat",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      stream: true,
      temperature: opts.temperature,
      max_tokens: opts.max_tokens,
      top_p: opts.top_p,
    }),
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${errText || res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload);
        const delta =
          json.choices?.[0]?.delta?.content ??
          json.choices?.[0]?.message?.content ??
          "";
        if (delta) yield delta as string;
      } catch {
        // ignore keep-alives / partial chunks
      }
    }
  }
}

/**
 * Non-streaming one-shot completion (used by the playground).
 */
export async function completeChat(opts: ChatOptions): Promise<string> {
  const url = joinUrl(opts.baseUrl, "chat/completions");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
      "X-Title": "BYOK Chat",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature,
      max_tokens: opts.max_tokens,
      top_p: opts.top_p,
      stream: false,
    }),
    signal: opts.signal,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${errText || res.statusText}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

export type ImageGenOptions = {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  n?: number;
  size?: string;
  signal?: AbortSignal;
};

export type GeneratedImage = { url?: string; b64_json?: string };

export async function generateImage(opts: ImageGenOptions): Promise<GeneratedImage[]> {
  const url = joinUrl(opts.baseUrl, "images/generations");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      prompt: opts.prompt,
      n: opts.n ?? 1,
      size: opts.size ?? "1024x1024",
    }),
    signal: opts.signal,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Image request failed (${res.status}): ${errText || res.statusText}`);
  }
  const json = await res.json();
  return (json.data ?? []) as GeneratedImage[];
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
