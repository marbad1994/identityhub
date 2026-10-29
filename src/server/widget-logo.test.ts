import assert from "node:assert/strict";
import { test } from "node:test";
import { deflateSync } from "node:zlib";
import { validWidgetLogo } from "./widget-logo.ts";
import { isWidgetBrand, publicWidgetBrand, widgetBrand } from "../lib/widget-brand.ts";

function chunk(type: string, data: Buffer): Buffer {
  const header = Buffer.alloc(8),
    crcBytes = Buffer.alloc(4);
  header.writeUInt32BE(data.length);
  header.write(type, 4);
  let crc = 0xffffffff;
  for (const byte of Buffer.concat([header.subarray(4), data])) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  crcBytes.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([header, data, crcBytes]);
}

function png(width = 1, pixels = Buffer.from([0, 255, 0, 0, 255])): string {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(1, 4);
  header[8] = 8;
  header[9] = 6;
  return `data:image/png;base64,${Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), chunk("IHDR", header), chunk("IDAT", deflateSync(pixels)), chunk("IEND", Buffer.alloc(0))]).toString("base64")}`;
}

test("logos accept bounded raster PNGs and reject SVGs, bad images, and oversized decoded data", () => {
  assert.ok(validWidgetLogo(png()));
  assert.equal(validWidgetLogo("data:image/svg+xml;base64,PHN2Zy8+"), false);
  assert.equal(validWidgetLogo("data:image/png;base64,c2NyaXB0"), false);
  assert.equal(validWidgetLogo(png(257)), false);
  assert.equal(validWidgetLogo(png(1, Buffer.alloc(100000))), false);
  assert.equal(validWidgetLogo(png().slice(0, -4)), false);
});

test("brand choices are restricted to known icons or PNG uploads and only public fields are returned", () => {
  assert.ok(isWidgetBrand({ kind: "none" }));
  assert.ok(isWidgetBrand({ kind: "icon", icon: "leaf" }));
  assert.equal(isWidgetBrand({ kind: "icon", icon: "<script>" }), false);
  assert.equal(isWidgetBrand({ kind: "logo", dataUrl: "https://example.com/logo.svg" }), false);
  assert.deepEqual(widgetBrand({ kind: "none", private: "hidden" }), { kind: "none" });
  assert.deepEqual(widgetBrand(null), { kind: "initials" });
  const logo = { kind: "logo" as const, dataUrl: png() };
  assert.deepEqual(publicWidgetBrand(logo), logo);
  const icon = publicWidgetBrand({ kind: "icon", icon: "leaf" });
  assert.ok("path" in icon && icon.path.length > 0);
});
