// Serve the built frontend without compiling or writing files at runtime.
import { extname, resolve, sep } from "node:path";

export function createHostHandler({ dist, api, checkDatabase }: {
  dist: string;
  api: (request: Request) => Response | Promise<Response>;
  checkDatabase: () => Promise<unknown>;
}) {
  const root = resolve(dist);
  const index = Bun.file(resolve(root, "index.html"));
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      try {
        await checkDatabase();
        if (!(await index.exists())) throw new Error("Frontend build is missing.");
        return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
      } catch {
        return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
      }
    }
    if (url.pathname.startsWith("/api/")) return api(request);
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    let pathname: string;
    try { pathname = decodeURIComponent(url.pathname); }
    catch { return new Response("Invalid path", { status: 400 }); }
    const path = resolve(root, `.${pathname}`);
    if (path !== root && !path.startsWith(root + sep)) return new Response("Forbidden", { status: 403 });
    const file = Bun.file(path);
    if (path !== root && await file.exists()) {
      return new Response(request.method === "HEAD" ? null : file, {
        headers: {
          "Content-Type": file.type,
          "Cache-Control": pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
        },
      });
    }
    // Missing assets must not be answered with HTML; page routes use the SPA shell.
    if (pathname.startsWith("/assets/") || extname(pathname)) return new Response("Not found", { status: 404 });
    if (!(await index.exists())) return new Response("Frontend is not built. Run bun run build.", { status: 503 });
    return new Response(request.method === "HEAD" ? null : index, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" },
    });
  };
}
