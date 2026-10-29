export const WIDGET_ACCENTS = ["sage", "blue", "violet"] as const;
export type WidgetAccent = (typeof WIDGET_ACCENTS)[number];
export type WidgetTheme = "light" | "dark";
export type WidgetAppearance = { theme: WidgetTheme; accent: WidgetAccent };

export function widgetAppearance(theme?: string, accent?: string): WidgetAppearance {
  return {
    theme: theme === "dark" ? "dark" : "light",
    accent: WIDGET_ACCENTS.includes(accent as WidgetAccent) ? (accent as WidgetAccent) : "sage",
  };
}
