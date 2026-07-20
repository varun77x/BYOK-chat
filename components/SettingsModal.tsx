"use client";

import { useEffect, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
  User,
  Bot,
  Server,
  SlidersHorizontal,
  Smile,
  Palette,
  Database,
  Download,
  Upload,
} from "lucide-react";
import clsx from "clsx";
import { Modal } from "./Modal";
import { useStore, type ImportMode } from "@/lib/store";
import { toast } from "@/lib/toast";
import { confirmDialog } from "@/lib/confirm";
import { PROVIDERS, getProvider } from "@/lib/providers";
import { AvatarPicker } from "./AvatarPicker";
import { ThemeSettings } from "./ThemeSettings";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  parseBackup,
  summarizeBackup,
  downloadJson,
  type Backup,
} from "@/lib/backup";

const USER_AVATAR_PRESETS = [
  "🧑‍💻", "😎", "🦊", "🐱", "🐼", "🦁", "🐧", "🐙",
  "🤓", "👽", "🐲", "🦉", "🌟", "🚀", "🎧", "🧢",
];
const ASSISTANT_AVATAR_PRESETS = [
  "🤖", "🧠", "✨", "👾", "🛸", "🔮", "💡", "🦾",
  "🌀", "⚡", "🐉", "🦄", "🌈", "🧩", "🪐", "🦋",
];

export type SettingsTab = "provider" | "chat" | "avatars" | "theme" | "data";

const TABS: {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}[] = [
  { id: "provider", label: "Provider", icon: Server },
  { id: "chat", label: "Chat", icon: SlidersHorizontal },
  { id: "avatars", label: "Avatars", icon: Smile },
  { id: "theme", label: "Theme", icon: Palette },
  { id: "data", label: "Data", icon: Database },
];

export function SettingsModal({
  open,
  onClose,
  initialTab = "provider",
}: {
  open: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
}) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);

  // Jump to the requested tab each time the modal is opened.
  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  return (
    <Modal open={open} onClose={onClose} title="Settings" maxW="max-w-5xl">
      <div className="flex gap-4 h-[72vh]">
        <nav className="w-36 shrink-0 flex flex-col gap-1 border-r pr-2 overflow-y-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  "flex items-center gap-2 px-2.5 py-2 rounded-app text-sm text-left transition",
                  tab === t.id
                    ? "bg-surface-2 text-text font-medium"
                    : "text-muted hover:text-text hover:bg-surface-2"
                )}
              >
                <Icon size={16} /> {t.label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 min-w-0 overflow-y-auto pr-1">
          {tab === "provider" && <ProviderTab />}
          {tab === "chat" && <ChatTab />}
          {tab === "avatars" && <AvatarsTab />}
          {tab === "theme" && <ThemeTab />}
          {tab === "data" && <DataTab />}
        </div>
      </div>
    </Modal>
  );
}

function ProviderTab() {
  const providers = useStore((s) => s.providers);
  const activeProviderId = useStore((s) => s.activeProviderId);
  const setActiveProvider = useStore((s) => s.setActiveProvider);
  const updateProvider = useStore((s) => s.updateProvider);
  const addCustomModel = useStore((s) => s.addCustomModel);
  const removeCustomModel = useStore((s) => s.removeCustomModel);

  const [showKey, setShowKey] = useState(false);
  const [newModel, setNewModel] = useState("");

  const config = providers[activeProviderId];
  const preset = getProvider(activeProviderId);
  const allModels = [...(preset?.suggestedModels ?? []), ...config.customModels];

  const commitModel = () => {
    const m = newModel.trim();
    if (!m) return;
    addCustomModel(activeProviderId, m);
    updateProvider(activeProviderId, { model: m });
    toast(`Model "${m}" added`);
    setNewModel("");
  };

  return (
    <div className="space-y-6">
      <section>
        <label className="block text-sm font-medium mb-2">Provider</label>
        <div className="grid grid-cols-2 gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveProvider(p.id)}
              className={`px-3 py-2 rounded-app border text-sm text-left transition ${
                activeProviderId === p.id ? "border-accent bg-surface-2" : "hover:bg-surface-2"
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
                if (e.key === "Enter") commitModel();
              }}
              placeholder="e.g. deepseek-v4-preview"
              className="flex-1 px-3 py-2 rounded-app bg-surface-2 border font-mono text-sm outline-none focus:border-accent"
            />
            <button
              onClick={commitModel}
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
    </div>
  );
}

function ChatTab() {
  const historyTurns = useStore((s) => s.historyTurns);
  const setHistoryTurns = useStore((s) => s.setHistoryTurns);
  const generalInstructions = useStore((s) => s.generalInstructions);
  const setGeneralInstructions = useStore((s) => s.setGeneralInstructions);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <label className="text-sm font-medium">General custom instructions</label>
        <textarea
          value={generalInstructions}
          onChange={(e) => setGeneralInstructions(e.target.value)}
          rows={6}
          placeholder="e.g. Be concise. Use British spelling. When writing code, prefer TypeScript and functional style."
          className="w-full px-3 py-2 rounded-app bg-surface-2 border text-sm outline-none focus:border-accent resize-y font-mono"
        />
        <p className="text-xs text-muted">
          Prepended as a system message on every chat send. Chats inside a Space add
          that space&apos;s instructions after this one.
        </p>
      </section>

      <section className="pt-4 border-t space-y-1">
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
          className="w-full"
        />
        <p className="text-xs text-muted mt-1">
          LLMs are stateless — every request resends prior turns. Capping keeps cost
          predictable on long chats. System prompt is always kept. 0 = unlimited
          (until the model rejects).
        </p>
      </section>
    </div>
  );
}

function AvatarsTab() {
  const userAvatar = useStore((s) => s.userAvatar);
  const assistantAvatar = useStore((s) => s.assistantAvatar);
  const setAvatar = useStore((s) => s.setAvatar);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Avatars</label>
        <p className="text-xs text-muted mt-0.5">
          Shown next to messages in chat. Pick an emoji or upload your own image.
        </p>
      </div>
      <AvatarPicker
        label="You"
        value={userAvatar}
        presets={USER_AVATAR_PRESETS}
        fallback={<User size={18} className="text-muted" />}
        onChange={(v) => setAvatar("user", v)}
      />
      <AvatarPicker
        label="Assistant"
        value={assistantAvatar}
        presets={ASSISTANT_AVATAR_PRESETS}
        fallback={<Bot size={18} className="text-muted" />}
        onChange={(v) => setAvatar("assistant", v)}
      />
    </div>
  );
}

function ThemeTab() {
  return <ThemeSettings />;
}

function DataTab() {
  const clearAllChats = useStore((s) => s.clearAllChats);
  const getBackupData = useStore((s) => s.getBackupData);
  const importBackup = useStore((s) => s.importBackup);

  const [includeKeys, setIncludeKeys] = useState(false);
  const [pending, setPending] = useState<Backup | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const doExport = () => {
    const backup: Backup = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: Date.now(),
      data: getBackupData(includeKeys),
    };
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJson(`byok-backup-${stamp}.json`, backup);
    toast("Backup exported");
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    try {
      setPending(parseBackup(await file.text()));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not read that file");
    }
  };

  const applyImport = async (mode: ImportMode) => {
    if (!pending) return;
    if (mode === "replace") {
      const ok = await confirmDialog({
        title: "Replace everything?",
        message:
          "This overwrites your current chats, spaces, and settings with the backup. It can't be undone.",
        confirmLabel: "Replace",
        danger: true,
      });
      if (!ok) return;
    }
    importBackup(pending.data, mode);
    setPending(null);
    toast(mode === "replace" ? "Backup restored" : "Backup merged in");
  };

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <label className="text-sm font-medium">Export</label>
        <p className="text-xs text-muted">
          Download a JSON backup of your chats, spaces, and settings.
        </p>
        <label className="flex items-center gap-2 text-sm mt-1 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={includeKeys}
            onChange={(e) => setIncludeKeys(e.target.checked)}
            className="accent-accent"
          />
          Include API keys
        </label>
        {includeKeys && (
          <p className="text-xs text-danger">
            ⚠ The file will contain your API keys in plain text — keep it private.
          </p>
        )}
        <div>
          <button
            onClick={doExport}
            className="inline-flex items-center gap-2 text-sm border rounded-app px-3 py-2 hover:bg-surface-2 transition"
          >
            <Download size={14} /> Export backup
          </button>
        </div>
      </section>

      <section className="pt-4 border-t space-y-2">
        <label className="text-sm font-medium">Import</label>
        <p className="text-xs text-muted">
          Load a backup file, then choose to replace everything or merge it in.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        {!pending ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 text-sm border rounded-app px-3 py-2 hover:bg-surface-2 transition"
          >
            <Upload size={14} /> Choose backup file…
          </button>
        ) : (
          <div className="rounded-app border bg-surface-2 p-3 space-y-2.5">
            <div className="text-sm">
              Loaded backup:{" "}
              <span className="text-muted">{summarizeBackup(pending)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => applyImport("replace")}
                className="text-sm rounded-app px-3 py-1.5 border border-danger/50 text-danger hover:bg-danger/10 transition"
              >
                Replace all
              </button>
              <button
                onClick={() => applyImport("merge")}
                className="text-sm rounded-app px-3 py-1.5 bg-accent text-accent-fg hover:opacity-90 transition"
              >
                Merge in
              </button>
              <button
                onClick={() => setPending(null)}
                className="text-sm rounded-app px-3 py-1.5 text-muted hover:text-text transition"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-muted">
              Replace overwrites everything. Merge adds these chats &amp; spaces to
              yours and keeps your current settings.
            </p>
          </div>
        )}
      </section>

      <section className="pt-4 border-t space-y-2">
        <div>
          <label className="text-sm font-medium">Danger zone</label>
          <p className="text-xs text-muted mt-0.5">
            Irreversible. Your chats live only in this browser.
          </p>
        </div>
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
          className="inline-flex items-center gap-2 text-sm text-danger border border-danger/40 rounded-app px-3 py-2 hover:bg-danger/10 transition"
        >
          <Trash2 size={14} /> Clear all chats
        </button>
      </section>
    </div>
  );
}
