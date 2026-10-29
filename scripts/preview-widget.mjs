/** Serve the standalone prototype without a database, credentials, or the app server. */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const assets = {
  "/widget-demo.html": "text/html; charset=utf-8",
  "/widget-demo.css": "text/css; charset=utf-8",
  "/widget-demo.js": "text/javascript; charset=utf-8",
  "/favicon.svg": "image/svg+xml",
};
const port = Number(process.env.WIDGET_PREVIEW_PORT || 4178);
const server = createServer(async (request, response) => {
  const path = new URL(request.url, "http://localhost").pathname;
  if (path === "/") {
    response.writeHead(302, { Location: "/widget-demo.html" });
    response.end();
    return;
  }
  if (!assets[path] || !["GET", "HEAD"].includes(request.method)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  try {
    const body = await readFile(new URL(`../public${path}`, import.meta.url));
    response.writeHead(200, {
      "Content-Type": assets[path],
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(500);
    response.end("Preview asset unavailable");
  }
});
server.listen(port, "127.0.0.1", () => {
  console.log(`Widget playground: http://127.0.0.1:${port}/widget-demo.html`);
});
