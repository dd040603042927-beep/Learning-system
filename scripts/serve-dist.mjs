import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve("dist");
const port = Number(process.argv[2] || process.env.PORT || 5173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

function resolveRequest(url = "/") {
  const pathname = decodeURIComponent(url.split("?")[0] || "/");
  const requested = normalize(pathname === "/" ? "/index.html" : pathname);
  const candidate = resolve(join(root, requested));
  if (!candidate.startsWith(root)) return join(root, "index.html");
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  return join(root, "index.html");
}

createServer((request, response) => {
  const filePath = resolveRequest(request.url);
  const ext = extname(filePath);
  response.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
  createReadStream(filePath)
    .on("error", () => {
      response.statusCode = 404;
      response.end("Not found");
    })
    .pipe(response);
}).listen(port, "0.0.0.0", () => {
  console.log(`Learning system is running at http://127.0.0.1:${port}`);
});
