"use client";

import { useRef } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "@/lib/toast";

/**
 * Downscale an uploaded image to a small square data URL. Avatars live in
 * localStorage alongside all chats, so a full-res photo would risk blowing the
 * storage quota — we centre-crop to `size`px and re-encode as WebP (~a few KB).
 */
async function fileToAvatarDataUrl(file: File, size = 128): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("Could not read image"));
    im.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  const scale = Math.max(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL("image/webp", 0.85);
}

export function AvatarPicker({
  label,
  value,
  presets,
  fallback,
  onChange,
}: {
  label: string;
  value: string;
  presets: string[];
  fallback: React.ReactNode;
  onChange: (value: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const isImage = value.startsWith("data:");

  const onPick = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Please choose an image file");
      return;
    }
    try {
      onChange(await fileToAvatarDataUrl(file));
    } catch {
      toast("Could not load that image");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full border bg-surface-2 flex items-center justify-center overflow-hidden shrink-0">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : value ? (
            <span className="text-2xl leading-none">{value}</span>
          ) : (
            fallback
          )}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium">{label}</div>
          <div className="flex items-center gap-3 mt-0.5">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-xs text-accent hover:underline inline-flex items-center gap-1"
            >
              <Upload size={12} /> Upload image
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-xs text-muted hover:text-danger inline-flex items-center gap-1"
              >
                <X size={12} /> Reset
              </button>
            )}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            onPick(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
      </div>

      <div className="grid grid-cols-8 gap-1">
        {presets.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onChange(e)}
            className={`text-xl w-8 h-8 flex items-center justify-center rounded-app border transition ${
              value === e
                ? "border-accent bg-surface-2"
                : "border-transparent hover:bg-surface-2"
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      <input
        type="text"
        maxLength={8}
        placeholder="Or paste any emoji, then press Enter…"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const v = (e.target as HTMLInputElement).value.trim();
            if (v) {
              onChange(v);
              (e.target as HTMLInputElement).value = "";
            }
          }
        }}
        className="w-full bg-surface-2 border rounded-app px-2 py-1 text-xs outline-none focus:border-accent"
      />
    </div>
  );
}
