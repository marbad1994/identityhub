import { useId, useState, type PointerEvent, type KeyboardEvent } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import {
  ACCENT_PRESETS,
  accentHex,
  hexToHsv,
  hsvToHex,
  type HsvColor,
  type WidgetAccent,
} from "@/lib/widget-appearance";

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export function AccentPicker({
  value,
  onChange,
}: {
  value: WidgetAccent;
  onChange: (value: WidgetAccent) => void;
}) {
  const id = useId();
  const ready = useHydrated();
  const [custom, setCustom] = useState(value.startsWith("#"));
  const [hsv, setHsv] = useState(() => hexToHsv(accentHex(value)));
  const [draft, setDraft] = useState(() => accentHex(value));
  const [error, setError] = useState(false);
  const color = hsvToHex(hsv);

  const change = (next: HsvColor) => {
    setHsv(next);
    const hex = hsvToHex(next);
    setDraft(hex);
    setError(false);
    onChange(hex);
  };
  const point = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left - bounds.width / 2) / (bounds.width / 2);
    const y = (event.clientY - bounds.top - bounds.height / 2) / (bounds.height / 2);
    const saturation = clamp(Math.hypot(x, y));
    change({
      h: saturation < 0.001 ? hsv.h : ((Math.atan2(y, x) * 180) / Math.PI + 450) % 360,
      s: saturation,
      v: hsv.v,
    });
  };
  const key = (event: KeyboardEvent<HTMLDivElement>) => {
    const amount = event.shiftKey ? 10 : 1;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key))
      return;
    event.preventDefault();
    let next = { ...hsv };
    if (event.key === "ArrowLeft") next.h = (hsv.h - amount + 360) % 360;
    if (event.key === "ArrowRight") next.h = (hsv.h + amount) % 360;
    if (event.key === "ArrowUp") next.s = clamp(hsv.s + amount / 100);
    if (event.key === "ArrowDown") next.s = clamp(hsv.s - amount / 100);
    if (event.key === "Home") next = { ...hsv, h: 0, s: 1 };
    if (event.key === "End") next.s = 0;
    change(next);
  };

  return (
    <fieldset disabled={!ready}>
      <legend className="text-sm font-semibold">Accent color</legend>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ACCENT_PRESETS.map((preset) => (
          <label
            key={preset.id}
            className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs ${value === preset.id ? "border-fg bg-bg-alt" : "border-line"}`}
          >
            <input
              type="radio"
              name={`${id}-accent`}
              checked={value === preset.id}
              onChange={() => {
                setCustom(false);
                setHsv(hexToHsv(preset.hex));
                setDraft(preset.hex);
                setError(false);
                onChange(preset.id);
              }}
            />
            <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0" aria-hidden="true">
              <circle cx="7" cy="7" r="6" fill={preset.hex} />
            </svg>
            <span>{preset.label}</span>
          </label>
        ))}
      </div>
      <label
        className={`mt-3 flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 ${custom ? "border-fg bg-bg-alt" : "border-line"}`}
      >
        <input
          type="radio"
          name={`${id}-accent`}
          checked={custom}
          onChange={() => {
            setCustom(true);
            change(hsv);
          }}
        />
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
          <defs>
            <linearGradient id={`${id}-rainbow`}>
              <stop stopColor="#e24c4b" />
              <stop offset=".33" stopColor="#e7bd41" />
              <stop offset=".66" stopColor="#47b7a5" />
              <stop offset="1" stopColor="#7958bd" />
            </linearGradient>
          </defs>
          <circle cx="11" cy="11" r="10" fill={`url(#${id}-rainbow)`} />
        </svg>
        <span className="text-sm font-medium">Custom color</span>
        <span className="ml-auto text-xs text-muted">Color wheel &amp; hex</span>
      </label>
      {custom ? (
        <div className="mt-3 rounded-2xl border border-line bg-bg-alt p-4">
          <p className="mb-4 text-xs text-muted">Choose a color, then adjust its brightness.</p>
          <div
            className="ih-color-wheel"
            role="slider"
            tabIndex={0}
            aria-label="Custom color wheel"
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={Math.round(hsv.h)}
            aria-valuetext={`Hue ${Math.round(hsv.h)} degrees, saturation ${Math.round(hsv.s * 100)} percent`}
            aria-describedby={`${id}-wheel-help`}
            onKeyDown={key}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.currentTarget.focus();
              event.currentTarget.setPointerCapture(event.pointerId);
              point(event);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) point(event);
            }}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId))
                event.currentTarget.releasePointerCapture(event.pointerId);
            }}
          >
            <svg viewBox="0 0 200 200" aria-hidden="true">
              <circle cx="100" cy="100" r="100" fill="#000000" fillOpacity={1 - hsv.v} />
              <circle
                cx={100 + Math.sin((hsv.h * Math.PI) / 180) * hsv.s * 94}
                cy={100 - Math.cos((hsv.h * Math.PI) / 180) * hsv.s * 94}
                r="7"
                fill={color}
                stroke="#ffffff"
                strokeWidth="3"
              />
              <circle
                cx={100 + Math.sin((hsv.h * Math.PI) / 180) * hsv.s * 94}
                cy={100 - Math.cos((hsv.h * Math.PI) / 180) * hsv.s * 94}
                r="9"
                fill="none"
                stroke="#1a2925"
                strokeWidth="1"
              />
            </svg>
          </div>
          <p id={`${id}-wheel-help`} className="mt-3 text-xs text-muted">
            Drag to choose. Keyboard: left/right changes hue; up/down changes saturation.
          </p>
          <label className="mt-4 block text-xs font-medium">
            Brightness <span className="float-right tabular-nums">{Math.round(hsv.v * 100)}%</span>
            <input
              className="mt-2 min-h-11 w-full cursor-pointer accent-ink"
              type="range"
              min="0"
              max="100"
              step="1"
              value={Math.round(hsv.v * 100)}
              onChange={(event) => change({ ...hsv, v: Number(event.target.value) / 100 })}
            />
          </label>
          <label className="mt-3 block text-xs font-medium" htmlFor={`${id}-hex`}>
            Hex color
          </label>
          <div className="mt-1 flex items-center gap-3">
            <svg className="shrink-0" width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
              <rect x="1" y="1" width="38" height="38" rx="9" fill={color} stroke="#a4afa8" />
            </svg>
            <input
              id={`${id}-hex`}
              value={draft}
              maxLength={7}
              spellCheck={false}
              autoComplete="off"
              aria-invalid={error}
              aria-describedby={`${id}-hex-help`}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 font-mono text-sm"
              onChange={(event) => {
                setDraft(event.target.value);
                const hex = event.target.value.startsWith("#")
                  ? event.target.value
                  : `#${event.target.value}`;
                if (/^#[0-9a-f]{6}$/i.test(hex)) {
                  setHsv(hexToHsv(hex));
                  setError(false);
                  onChange(hex.toLowerCase() as WidgetAccent);
                }
              }}
              onBlur={() => {
                const hex = draft.startsWith("#") ? draft : `#${draft}`;
                if (/^#[0-9a-f]{6}$/i.test(hex)) {
                  setDraft(hex.toLowerCase());
                  setError(false);
                } else setError(true);
              }}
            />
          </div>
          <p
            id={`${id}-hex-help`}
            className={`mt-2 text-xs ${error ? "text-danger" : "text-muted"}`}
            role={error ? "alert" : undefined}
          >
            {error
              ? "Enter six hex digits, for example #2a9d8f. Your last valid color is kept."
              : "Text and button shades adapt to keep your color readable in both themes."}
          </p>
        </div>
      ) : null}
    </fieldset>
  );
}
