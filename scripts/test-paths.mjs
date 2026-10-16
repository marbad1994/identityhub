import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const src = fileURLToPath(new URL("../src/", import.meta.url));

function withExtension(abs) {
  for (const ext of [".ts", ".tsx", ".js", ".mjs"]) {
    if (existsSync(abs + ext)) return abs + ext;
  }
  for (const ext of [".ts", ".tsx"]) {
    const index = path.join(abs, `index${ext}`);
    if (existsSync(index)) return index;
  }
  return null;
}

/** node:test does not apply tsconfig paths or extensionless TypeScript imports. */
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const file = withExtension(path.join(src, specifier.slice(2)));
    if (file) return nextResolve(pathToFileURL(file).href, context);
  }
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !path.extname(specifier) &&
    context.parentURL
  ) {
    const file = withExtension(
      path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier),
    );
    if (file) return nextResolve(pathToFileURL(file).href, context);
  }
  return nextResolve(specifier, context);
}
