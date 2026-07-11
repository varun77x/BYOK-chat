"use client";

import { useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import { useStore } from "@/lib/store";
import { streamChat } from "@/lib/api";
import { Markdown } from "./Markdown";
import clsx from "clsx";

export function PlaygroundView() {
  const providers = useStore((s) => s.providers);
  const activeProviderId = useStore((s) => s.activeProviderId);
  const provider = providers[activeProviderId];

  const [systemPrompt, setSystemPrompt] = useState("You are a helpful assistant.");
  const [userPrompt, setUserPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [topP, setTopP] = useState(1);
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canRun = !!provider.apiKey && !!provider.model && !!provider.baseUrl;

  const run = async () => {
    if (running || !canRun) return;
    setError(null);
    setOutput("");
    setRunning(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      let full = "";
      for await (const delta of streamChat({
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
        model: provider.model,
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        messages: [
          ...(systemPrompt.trim()
            ? [{ role: "system" as const, content: systemPrompt }]
            : []),
          { role: "user" as const, content: userPrompt },
        ],
        signal: controller.signal,
      })) {
        full += delta;
        setOutput(full);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setRunning(false);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="border-b px-4 py-2.5 flex items-center gap-3 text-sm">
        <div className="text-muted">
          Model: <span className="text-text font-mono text-xs">{provider.model || "—"}</span>
        </div>
        <div className="text-muted">
          Provider: <span className="text-text">{activeProviderId}</span>
        </div>
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_320px] overflow-hidden">
        <div className="flex flex-col min-h-0 overflow-hidden border-r">
          <div className="p-4 border-b">
            <label className="text-xs font-medium text-muted mb-1 block">
              System prompt
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={2}
              className="w-full bg-surface-2 border rounded-app px-3 py-2 text-sm outline-none focus:border-accent resize-y"
            />
          </div>

          <div className="p-4 border-b">
            <label className="text-xs font-medium text-muted mb-1 block">
              User prompt
            </label>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              rows={6}
              className="w-full bg-surface-2 border rounded-app px-3 py-2 text-sm outline-none focus:border-accent resize-y font-mono"
              placeholder="Ask anything…"
            />
            <div className="mt-2 flex items-center gap-2">
              {running ? (
                <button
                  onClick={stop}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-app bg-danger text-white text-sm hover:opacity-90"
                >
                  <Square size={14} fill="currentColor" /> Stop
                </button>
              ) : (
                <button
                  onClick={run}
                  disabled={!canRun || !userPrompt.trim()}
                  className={clsx(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-app bg-accent text-accent-fg text-sm",
                    canRun && userPrompt.trim()
                      ? "hover:opacity-90"
                      : "opacity-40 cursor-not-allowed"
                  )}
                >
                  <Play size={14} /> Run
                </button>
              )}
              {!canRun && (
                <span className="text-xs text-muted">
                  Set API key in Settings.
                </span>
              )}
            </div>
            {error && <div className="text-sm text-danger mt-2">{error}</div>}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <label className="text-xs font-medium text-muted mb-1 block">Output</label>
            <div className="bg-surface-2 border rounded-app p-3 min-h-[8rem]">
              {output ? (
                <Markdown>{output}</Markdown>
              ) : (
                <div className="text-sm text-muted italic">
                  Response will appear here.
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="p-4 space-y-5 overflow-y-auto">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium">Temperature</span>
              <span className="text-muted font-mono">{temperature.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
            />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium">Max tokens</span>
              <span className="text-muted font-mono">{maxTokens}</span>
            </div>
            <input
              type="range"
              min={64}
              max={8192}
              step={64}
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
            />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium">Top P</span>
              <span className="text-muted font-mono">{topP.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={topP}
              onChange={(e) => setTopP(parseFloat(e.target.value))}
            />
          </div>
          <div className="text-xs text-muted pt-4 border-t">
            One-shot completion — no conversation history. Use the Chat page for
            multi-turn.
          </div>
        </aside>
      </div>
    </div>
  );
}
