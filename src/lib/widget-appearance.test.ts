import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ACCENT_PRESETS,
  accentPalette,
  contrastRatio,
  hexToHsv,
  hsvToHex,
  isWidgetAccent,
  widgetAppearance,
  type WidgetAccent,
} from "./widget-appearance.ts";

test("existing accents and full RGB hex are accepted; CSS injection and malformed values are rejected", () => {
  for (const preset of ACCENT_PRESETS) assert.ok(isWidgetAccent(preset.id));
  for (const value of ["#000000", "#FFFFFF", "#2a9d8f"]) assert.ok(isWidgetAccent(value));
  for (const value of [
    "#abc",
    "red",
    "#123456; color:red",
    "url(https://example.com)",
    "#12345g",
    "#ffffff00",
    'sage"}',
  ])
    assert.equal(isWidgetAccent(value), false);
  assert.deepEqual(widgetAppearance("dark", "#AB12EF"), { theme: "dark", accent: "#ab12ef" });
  assert.equal(widgetAppearance("light", "bad").accent, "sage");
});

test("wheel colors round-trip through HSV, including the edge cases", () => {
  for (const color of ["#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff", "#2a9d8f", "#d43f92"])
    assert.equal(hsvToHex(hexToHsv(color)), color);
  assert.equal(hsvToHex({ h: 360, s: 1, v: 1 }), "#ff0000");
  assert.equal(hsvToHex({ h: 120, s: 0, v: 0.5 }), "#808080");
});

test("custom and preset palettes keep text and buttons readable in both themes", () => {
  const colors: WidgetAccent[] = [
    ...ACCENT_PRESETS.map((preset) => preset.id),
    "#ffffff",
    "#000000",
    "#ffff00",
    "#00ffff",
    "#ff00ff",
    "#777777",
    "#2a9d8f",
  ];
  for (const theme of ["light", "dark"] as const) {
    for (const color of colors) {
      const palette = accentPalette(theme, color);
      assert.ok(
        contrastRatio(palette.accent, theme === "dark" ? "#1a2520" : "#ffffff") >= 4.5,
        `${theme} ${color} surface`,
      );
      assert.ok(contrastRatio(palette.accent, palette.soft) >= 4.5, `${theme} ${color} tint`);
      assert.ok(contrastRatio(palette.accent, palette.onAccent) >= 4.5, `${theme} ${color} button`);
    }
  }
});
