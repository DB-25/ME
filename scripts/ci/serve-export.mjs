// Serves the static export the way GitHub Pages does: under a base path, directory -> index.html, 404.html for misses.
// Usage: node scripts/ci/serve-export.mjs <outDir> <port> [basePath]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const [dir, portArg, base = ""] = process.argv.slice(2);
const root = path.resolve(dir);
const types = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml",
  ".woff2": "font/woff2", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".mp4": "video/mp4",
  ".txt": "text/plain", ".xml": "application/xml", ".pdf": "application/pdf", ".mp3": "audio/mpeg",
};

function resolveFile(urlPath) {
  if (!urlPath.startsWith(base)) return null;
  const rel = decodeURIComponent(urlPath.slice(base.length)).replace(/^\/+/, "");
  const file = path.join(root, rel);
  if (!file.startsWith(root)) return null;
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    const index = path.join(file, "index.html");
    return fs.existsSync(index) ? index : null;
  }
  return fs.existsSync(file) ? file : null;
}

// GitHub Pages sends gzip for text assets; serve the same so transfer sizes (and Lighthouse's network model) match.
const gzipped = new Set([".html", ".js", ".css", ".json", ".svg", ".txt", ".xml"]);
const cache = new Map();
const gzipOf = (file) => {
  if (!cache.has(file)) cache.set(file, zlib.gzipSync(fs.readFileSync(file)));
  return cache.get(file);
};

http
  .createServer((req, res) => {
    const file = resolveFile(req.url.split("?")[0]);
    const notFound = path.join(root, "404.html");
    const target = file ?? (fs.existsSync(notFound) ? notFound : null);
    if (!target) {
      res.writeHead(404);
      return res.end();
    }
    const ext = path.extname(target);
    const headers = { "content-type": types[ext] ?? "application/octet-stream", "cache-control": "max-age=600" };
    if (gzipped.has(ext) && /gzip/.test(req.headers["accept-encoding"] ?? "")) {
      const body = gzipOf(target);
      res.writeHead(file ? 200 : 404, { ...headers, "content-encoding": "gzip", "content-length": body.length });
      return res.end(body);
    }
    res.writeHead(file ? 200 : 404, headers);
    fs.createReadStream(target).pipe(res);
  })
  .listen(Number(portArg), () => console.log(`serving ${root} at http://localhost:${portArg}${base}/`));
