/** Optional local static preview; direct file:// opening remains supported. */
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "../dist");
const mime = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  svg: "image/svg+xml",
  woff2: "font/woff2",
};
/** Resolve requests within the public directory and return explicit HTTP errors. */
function serve(request, response) {
  let name;
  try {
    name = decodeURIComponent(request.url.split("?")[0]);
  } catch {
    response.writeHead(400).end("Invalid URL");
    return;
  }
  const file = path.resolve(root, "." + (name === "/" ? "/index.html" : name));
  if (!file.startsWith(root + path.sep)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  fs.readFile(file, (error, data) => {
    if (error) {
      response.writeHead(404).end("Not found");
      return;
    }
    response.setHeader(
      "Content-Type",
      mime[path.extname(file).slice(1)] || "application/octet-stream",
    );
    response.end(data);
  });
}
http
  .createServer(serve)
  .listen(4173, "127.0.0.1", () => console.log("Local: http://127.0.0.1:4173"));
