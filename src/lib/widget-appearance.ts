import { widgetBrand, type WidgetBrand } from "./widget-brand";

export const ACCENT_PRESETS = [
  { id: "sage", label: "Sage", hex: "#315d4c" },
  { id: "blue", label: "Ocean", hex: "#285b87" },
  { id: "violet", label: "Iris", hex: "#66508d" },
  { id: "emerald", label: "Emerald", hex: "#087f5b" },
  { id: "teal", label: "Teal", hex: "#0f766e" },
  { id: "sky", label: "Sky", hex: "#0369a1" },
  { id: "indigo", label: "Indigo", hex: "#4338ca" },
  { id: "rose", label: "Rose", hex: "#be185d" },
  { id: "coral", label: "Coral", hex: "#c24134" },
  { id: "amber", label: "Amber", hex: "#a16207" },
  { id: "slate", label: "Slate", hex: "#475569" },
  { id: "charcoal", label: "Charcoal", hex: "#292524" },
] as const;
export const WIDGET_ACCENTS = ACCENT_PRESETS.map((preset) => preset.id);
export type WidgetAccent = (typeof ACCENT_PRESETS)[number]["id"] | `#${string}`;
export type WidgetTheme = "light" | "dark";
export type WidgetAppearance = { theme: WidgetTheme; accent: WidgetAccent; brand?: WidgetBrand };

export function isWidgetAccent(value: string): value is WidgetAccent {
  return /^#[0-9a-f]{6}$/i.test(value) || ACCENT_PRESETS.some((preset) => preset.id === value);
}

export function accentHex(accent: WidgetAccent): string {
  return (
    ACCENT_PRESETS.find((preset) => preset.id === accent)?.hex ??
    (/^#[0-9a-f]{6}$/i.test(accent) ? accent.toLowerCase() : "#315d4c")
  );
}

export function widgetAppearance(
  theme?: string,
  accent?: string,
  brand?: unknown,
): WidgetAppearance {
  return {
    theme: theme === "dark" ? "dark" : "light",
    accent: accent && isWidgetAccent(accent) ? (accent.toLowerCase() as WidgetAccent) : "sage",
    ...(brand === undefined ? {} : { brand: widgetBrand(brand) }),
  };
}

function rgb(hex: string): number[] {
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
}

function hex(channels: number[]): string {
  return `#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

export function mixColor(first: string, second: string, amount: number): string {
  const target = rgb(second);
  return hex(rgb(first).map((channel, index) => channel + (target[index] - channel) * amount));
}

export function contrastRatio(first: string, second: string): number {
  const luminance = (value: string) =>
    rgb(value)
      .map((channel) => {
        const c = channel / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      })
      .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const a = luminance(first),
    b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Retain the saved brand color; derive readable text and button shades for each theme. */
export function accentPalette(theme: WidgetTheme, value: WidgetAccent) {
  const raw = accentHex(value);
  const surface = theme === "dark" ? "#1a2520" : "#ffffff";
  const soft = mixColor(raw, surface, theme === "dark" ? 0.84 : 0.92);
  const target = theme === "dark" ? "#ffffff" : "#000000";
  let accent = raw;
  for (let step = 0; step <= 100; step++) {
    accent = mixColor(raw, target, step / 100);
    if (contrastRatio(accent, surface) >= 4.5 && contrastRatio(accent, soft) >= 4.5) break;
  }
  const onAccent =
    contrastRatio(accent, "#ffffff") >= contrastRatio(accent, "#000000") ? "#ffffff" : "#000000";
  return { accent, soft, onAccent };
}

export type HsvColor = { h: number; s: number; v: number };

export function hsvToHex({ h, s, v }: HsvColor): `#${string}` {
  const hue = ((h % 360) + 360) % 360;
  const chroma = v * s,
    x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1)),
    m = v - chroma;
  const channels =
    hue < 60
      ? [chroma, x, 0]
      : hue < 120
        ? [x, chroma, 0]
        : hue < 180
          ? [0, chroma, x]
          : hue < 240
            ? [0, x, chroma]
            : hue < 300
              ? [x, 0, chroma]
              : [chroma, 0, x];
  return hex(channels.map((channel) => (channel + m) * 255)) as `#${string}`;
}

export function hexToHsv(value: string): HsvColor {
  const channels = rgb(value).map((channel) => channel / 255);
  const [r, g, b] = channels,
    max = Math.max(...channels),
    min = Math.min(...channels),
    delta = max - min;
  const hue =
    delta === 0
      ? 0
      : max === r
        ? ((g - b) / delta) % 6
        : max === g
          ? (b - r) / delta + 2
          : (r - g) / delta + 4;
  return { h: (hue * 60 + 360) % 360, s: max === 0 ? 0 : delta / max, v: max };
}
