export const WIDGET_ICONS = [
  { id: "shield", label: "Shield", path: "M12 3 20 6v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6" },
  {
    id: "leaf",
    label: "Leaf",
    path: "M20 3c-8 0-15 3-15 10a6 6 0 0 0 6 6c7 0 9-8 9-16ZM4 21l12-12",
  },
  {
    id: "sparkles",
    label: "Sparkles",
    path: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM3 3v4M1 5h4M20 18v4M18 20h4",
  },
  {
    id: "rocket",
    label: "Rocket",
    path: "M14 5c3-3 7-2 7-2s1 4-2 7l-7 7-5-5 7-7ZM7 12l-4 1 1-6 7-1M12 17l-1 4 6-1 1-7M6 16l-3 5 5-3M15 8h.01",
  },
  {
    id: "heart",
    label: "Heart",
    path: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
  },
  {
    id: "globe",
    label: "Globe",
    path: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z",
  },
  {
    id: "briefcase",
    label: "Briefcase",
    path: "M3 7h18v14H3V7ZM8 7V3h8v4M3 12c5 4 13 4 18 0M10 12h4",
  },
  {
    id: "camera",
    label: "Camera",
    path: "M3 7h4l2-4h6l2 4h4v14H3V7ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  },
  { id: "code", label: "Code", path: "m8 5-6 7 6 7M16 5l6 7-6 7M14 3l-4 18" },
  {
    id: "music",
    label: "Music",
    path: "M9 18V5l12-2v13M9 8l12-2M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  },
  {
    id: "star",
    label: "Star",
    path: "m12 3 2.8 5.7L21 9.6l-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z",
  },
  {
    id: "layers",
    label: "Layers",
    path: "m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5",
  },
] as const;
export type WidgetIcon = (typeof WIDGET_ICONS)[number]["id"];
export type WidgetBrand =
  | { kind: "initials" }
  | { kind: "none" }
  | { kind: "icon"; icon: WidgetIcon }
  | { kind: "logo"; dataUrl: string };
export const MAX_LOGO_BYTES = 128 * 1024;
export const MAX_LOGO_URL_LENGTH = Math.ceil(MAX_LOGO_BYTES / 3) * 4 + 22;

export function isWidgetBrand(value: unknown): value is WidgetBrand {
  if (!value || typeof value !== "object") return false;
  const brand = value as Record<string, unknown>;
  if (brand.kind === "none" || brand.kind === "initials") return true;
  if (brand.kind === "icon") return WIDGET_ICONS.some((icon) => icon.id === brand.icon);
  return (
    brand.kind === "logo" &&
    typeof brand.dataUrl === "string" &&
    brand.dataUrl.length <= MAX_LOGO_URL_LENGTH &&
    /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(brand.dataUrl)
  );
}

export function widgetBrand(value: unknown): WidgetBrand {
  if (!isWidgetBrand(value)) return { kind: "initials" };
  if (value.kind === "logo") return { kind: "logo", dataUrl: value.dataUrl };
  if (value.kind === "icon") return { kind: "icon", icon: value.icon };
  return { kind: value.kind };
}

export function publicWidgetBrand(value: unknown) {
  const brand = widgetBrand(value);
  return brand.kind === "icon"
    ? { ...brand, path: WIDGET_ICONS.find((icon) => icon.id === brand.icon)!.path }
    : brand;
}
