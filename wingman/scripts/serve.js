// Tiny zero-dependency static server for local testing: `npm run dev` → http://localhost:3000
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..", "public");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const f = path.normalize(path.join(root, p));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("Not found"); }
  res.writeHead(200, { "Content-Type": (types[path.extname(f)] || "application/octet-stream") + "; charset=utf-8" });
  fs.createReadStream(f).pipe(res);
}).listen(3000, () => console.log("http://localhost:3000"));
