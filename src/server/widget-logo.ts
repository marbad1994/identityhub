import { inflateSync } from "node:zlib";
import { MAX_LOGO_BYTES } from "@/lib/widget-brand";

/** Accept only small, non-interlaced RGB/RGBA PNGs produced by the upload canvas. */
export function validWidgetLogo(dataUrl: string): boolean {
  try {
    if (!dataUrl.startsWith("data:image/png;base64,")) return false;
    const encoded = dataUrl.slice(22),
      bytes = Buffer.from(encoded, "base64");
    if (
      bytes.length > MAX_LOGO_BYTES ||
      bytes.toString("base64") !== encoded ||
      bytes.length < 57 ||
      bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
    )
      return false;
    if (bytes.readUInt32BE(8) !== 13 || bytes.toString("ascii", 12, 16) !== "IHDR") return false;
    const width = bytes.readUInt32BE(16),
      height = bytes.readUInt32BE(20),
      channels = bytes[25] === 6 ? 4 : bytes[25] === 2 ? 3 : 0;
    if (
      !width ||
      !height ||
      width > 256 ||
      height > 256 ||
      !channels ||
      bytes[24] !== 8 ||
      bytes[26] !== 0 ||
      bytes[27] !== 0 ||
      bytes[28] !== 0
    )
      return false;
    const chunks: Buffer[] = [];
    let offset = 33;
    while (offset + 12 <= bytes.length) {
      const length = bytes.readUInt32BE(offset),
        type = bytes.toString("ascii", offset + 4, offset + 8);
      if (offset + 12 + length > bytes.length) return false;
      if (type === "IDAT") chunks.push(bytes.subarray(offset + 8, offset + 8 + length));
      else if (type === "IEND") {
        if (length !== 0 || offset + 12 !== bytes.length || chunks.length === 0) return false;
        const expected = height * (1 + width * channels);
        return (
          inflateSync(Buffer.concat(chunks), { maxOutputLength: expected }).length === expected
        );
      } else return false;
      offset += length + 12;
    }
    return false;
  } catch {
    return false;
  }
}
