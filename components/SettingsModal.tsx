"use client";

import { useState } from "react";
import { Eye, EyeOff, Trash2, ExternalLink } from "lucide-react";
import { Modal } from "./Modal";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import { confirmDialog } from "@/lib/confirm";
import { PROVIDERS, getProvider } from "@/lib/providers";

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const providers = useStore((s) => s.providers);
  const activeProviderId = useStore((s) => s.activeProviderId);
  const setActiveProvider = useStore((s) => s.setActiveProvider);
  const updateProvider = useStore((s) => s.updateProvider);
  const addCustomModel = useStore((s) => s.addCustomModel);
  const removeCustomModel = useStore((s) => s.removeCustomModel);
  const clearAllChats = useStore((s) => s.clearAllChats);
  const historyTurns = useStore((s) => s.historyTurns);
  const setHistoryTurns = useStore((s) => s.setHistoryTurns);
  const generalInstructions = useStore((s) => s.generalInstructions);
  const setGeneralInstructions = useStore((s) => s.setGeneralInstructions);

  const [showKey, setShowKey] = useState(false);
  const [newModel, setNewModel] = useState("");

  const config = providers[activeProviderId];
  const preset = getProvider(activeProviderId);
  const allModels = [...(preset?.suggestedModels ?? []), ...config.customModels];

  return (
    <Modal open={open} onClose={onClose} title="Settings" wide>
      <div className="space-y-6">
        <section>
          <label className="block text-sm font-medium mb-2">Provider</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveProvider(p.id)}
                className={`px-3 py-2 rounded-app border text-sm text-left transition ${
                  activeProviderId === p.id
                    ? "border-accent bg-surface-2"
                    : "hover:bg-surface-2"
                }`}
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted truncate">
                  {p.baseUrl || "custom endpoint"}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">API key</label>
            {preset?.docsUrl && (
              <a
                href={preset.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-accent hover:underline inline-flex items-center gap-1"
              >
                Get one <ExternalLink size={12} />
              </a>
            )}
          </div>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={config.apiKey}
              onChange={(e) => updateProvider(activeProviderId, { apiKey: e.target.value })}
              placeholder={preset?.keyPrefix ? `${preset.keyPrefix}...` : "your-api-key"}
              className="w-full px-3 py-2 pr-10 rounded-app bg-surface-2 border font-mono text-sm outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-text p-1"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-muted">
            Stored only in this browser&apos;s localStorage. Never sent anywhere except
            directly to the provider.
          </p>
        </section>

        <section className="space-y-3">
          <label className="text-sm font-medium">Base URL</label>
          <input
            type="text"
            value={config.baseUrl}
            onChange={(e) => updateProvider(activeProviderId, { baseUrl: e.target.value })}
            placeholder="https://api.deepseek.com/v1"
            className="w-full px-3 py-2 rounded-app bg-surface-2 border font-mono text-sm outline-none focus:border-accent"
          />
        </section>

        <section className="space-y-3">
          <label className="text-sm font-medium">Model</label>
          <select
            value={config.model}
            onChange={(e) => updateProvider(activeProviderId, { model: e.target.value })}
            className="w-full px-3 py-2 rounded-app bg-surface-2 border text-sm outline-none focus:border-accent"
          >
            {allModels.length === 0 && <option value="">No models yet — add one below</option>}
            {allModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <div className="space-y-2">
            <div className="text-xs text-muted">Add a custom model ID</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newModel.trim()) {
                    addCustomModel(activeProviderId, newModel.trim());
                    updateProvider(activeProviderId, { model: newModel.trim() });
                    toast(`Model "${newModel.trim()}" added`);
                    setNewModel("");
                  }
                }}
                placeholder="e.g. deepseek-v4-preview"
                className="flex-1 px-3 py-2 rounded-app bg-surface-2 border font-mono text-sm outline-none focus:border-accent"
              />
              <button
                onClick={() => {
                  if (!newModel.trim()) return;
                  addCustomModel(activeProviderId, newModel.trim());
                  updateProvider(activeProviderId, { model: newModel.trim() });
                  toast(`Model "${newModel.trim()}" added`);
                  setNewModel("");
                }}
                className="px-3 py-2 rounded-app bg-accent text-accent-fg text-sm hover:opacity-90"
              >
                Add
              </button>
            </div>
            {config.customModels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {config.customModels.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center gap-1 text-xs bg-surface-2 border rounded-app px-2 py-1"
                  >
                    <span className="font-mono">{m}</span>
                    <button
                      onClick={() => removeCustomModel(activeProviderId, m)}
                      className="text-muted hover:text-danger"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="pt-4 border-t space-y-2">
          <label className="text-sm font-medium">General custom instructions</label>
          <textarea
            value={generalInstructions}
            onChange={(e) => setGeneralInstructions(e.target.value)}
            rows={5}
            placeholder="e.g. Be concise. Use British spelling. When writing code, prefer TypeScript and functional style."
            className="w-full px-3 py-2 rounded-app bg-surface-2 border text-sm outline-none focus:border-accent resize-y font-mono"
          />
          <p className="text-xs text-muted">
            Prepended as a system message on every chat send. Chats inside a Space
            add that space&apos;s instructions after this one.
          </p>
        </section>

        <section className="pt-4 border-t space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">Conversation history sent</label>
              <span className="text-xs text-muted font-mono">
                {historyTurns === 0
                  ? "unlimited"
                  : `last ${historyTurns} turn${historyTurns === 1 ? "" : "s"}`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={historyTurns}
              onChange={(e) => setHistoryTurns(parseInt(e.target.value))}
            />
            <p className="text-xs text-muted mt-1">
              LLMs are stateless — every request resends prior turns. Capping keeps
              cost predictable on long chats. System prompt is always kept. 0 =
              unlimited (until the model rejects).
            </p>
          </div>
        </section>

        <section className="pt-4 border-t">
          <button
            onClick={async () => {
              if (
                await confirmDialog({
                  title: "Delete all chats?",
                  message: "This deletes your entire chat history and cannot be undone.",
                  confirmLabel: "Delete all",
                  danger: true,
                })
              ) {
                clearAllChats();
                toast("All chats cleared");
              }
            }}
            className="text-sm text-danger hover:underline"
          >
            Clear all chats
          </button>
        </section>
      </div>
    </Modal>
  );
}
