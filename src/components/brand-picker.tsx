import { useEffect, useId, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { MAX_LOGO_URL_LENGTH, WIDGET_ICONS, type WidgetBrand } from "@/lib/widget-brand";
import { useHydrated } from "@/lib/use-hydrated";
import { WidgetIconGraphic } from "./widget-mark";

async function prepareLogo(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("Choose a PNG, JPG, or WebP image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Choose an image smaller than 5 MB.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This image could not be opened. Try another file.");
  }
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width > 8192 || bitmap.height > 8192)
      throw new Error("Choose an image up to 8192 pixels on each side.");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this image.");
    for (let size = 256; size >= 64; size = Math.floor(size * 0.75)) {
      const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      if (dataUrl.length <= MAX_LOGO_URL_LENGTH) return dataUrl;
    }
    throw new Error("This image is too detailed. Try a simpler logo.");
  } finally {
    bitmap.close();
  }
}

export function BrandPicker({
  value,
  onChange,
}: {
  value: WidgetBrand;
  onChange: (brand: WidgetBrand) => void;
}) {
  const id = useId();
  const ready = useHydrated();
  const [mode, setMode] = useState<WidgetBrand["kind"]>(value.kind);
  const [uploaded, setUploaded] = useState(value.kind === "logo" ? value.dataUrl : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  const choose = (brand: WidgetBrand) => {
    generation.current++;
    setBusy(false);
    setError(null);
    setMode(brand.kind);
    onChange(brand);
  };
  const upload = async (file: File) => {
    const attempt = ++generation.current;
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await prepareLogo(file);
      if (attempt !== generation.current) return;
      setUploaded(dataUrl);
      onChange({ kind: "logo", dataUrl });
    } catch (cause) {
      if (attempt === generation.current)
        setError(cause instanceof Error ? cause.message : "Could not upload this logo.");
    } finally {
      if (attempt === generation.current) setBusy(false);
    }
  };
  return (
    <fieldset disabled={!ready}>
      <legend className="text-sm font-semibold">App icon</legend>
      <p className="mt-1 text-xs text-muted">Choose the mark above your app's welcome message.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {(
          [
            { kind: "initials", label: "Initials" },
            { kind: "none", label: "No icon" },
            { kind: "icon", label: "Icon gallery" },
            { kind: "logo", label: "Upload logo" },
          ] as const
        ).map((option) => (
          <label
            key={option.kind}
            className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-xs ${mode === option.kind ? "border-fg bg-bg-alt" : "border-line"}`}
          >
            <input
              type="radio"
              name={`${id}-brand`}
              checked={mode === option.kind}
              onChange={() => {
                if (option.kind === "icon")
                  choose(value.kind === "icon" ? value : { kind: "icon", icon: "shield" });
                else if (option.kind === "logo") {
                  if (uploaded) choose({ kind: "logo", dataUrl: uploaded });
                  else {
                    generation.current++;
                    setBusy(false);
                    setMode("logo");
                    setError(null);
                  }
                } else choose({ kind: option.kind });
              }}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {mode === "icon" ? (
        <div className="mt-3 grid grid-cols-4 gap-2" role="group" aria-label="Icon gallery">
          {WIDGET_ICONS.map((icon) => (
            <button
              type="button"
              key={icon.id}
              aria-label={`${icon.label} icon`}
              aria-pressed={value.kind === "icon" && value.icon === icon.id}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border p-2 text-[10px] ${value.kind === "icon" && value.icon === icon.id ? "border-fg bg-bg-alt" : "border-line"}`}
              onClick={() => choose({ kind: "icon", icon: icon.id })}
            >
              <span className="size-6">
                <WidgetIconGraphic icon={icon.id} />
              </span>
              {icon.label}
            </button>
          ))}
        </div>
      ) : null}
      {mode === "logo" ? (
        <div className="mt-3 rounded-2xl border border-line bg-bg-alt p-4">
          {uploaded ? (
            <div className="mb-3 flex items-center gap-3">
              <img
                src={uploaded}
                alt="Uploaded logo preview"
                width="48"
                height="48"
                className="size-12 rounded-lg object-contain"
              />
              <span className="flex-1 text-xs text-muted">Your uploaded logo</span>
              <button
                type="button"
                className="inline-flex size-11 items-center justify-center rounded-xl border border-line bg-bg"
                aria-label="Remove uploaded logo"
                onClick={() => {
                  setUploaded(null);
                  choose({ kind: "initials" });
                }}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}
          <div className="rounded-xl focus-within:ring-2 focus-within:ring-focus">
            <label
              className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-bg px-3 text-sm font-medium"
              htmlFor={`${id}-upload`}
            >
              <Upload className="size-4" aria-hidden="true" />
              {busy ? "Preparing logo…" : uploaded ? "Replace logo" : "Choose a logo"}
            </label>
            <input
              id={`${id}-upload`}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label="Upload app logo"
              className="sr-only"
              disabled={busy}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file) void upload(file);
              }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            PNG, JPG, or WebP, up to 5 MB. Images are optimized for the widget; transparent PNG
            works well.
          </p>
          <p role="status" className="sr-only">
            {busy ? "Preparing logo" : ""}
          </p>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
