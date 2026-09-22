// Local-only production-build server for repeatable smoke tests; never deploy this server.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve('dist/kheera-ui/browser');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json' };
await readFile(resolve(root, 'index.html')); // Fail early if the production build is missing.
createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (path === '/config.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript' });
      return res.end('window.__config = { apiUrl: "/api/" };');
    }
    if (path.startsWith('/api/')) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end('{"message":"Smoke tests must supply an isolated API fixture."}');
    }
    const file = resolve(root, '.' + path);
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403); return res.end();
    }
    const target = extname(path) ? file : resolve(root, 'index.html');
    const data = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[extname(target)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
}).listen(4300, '127.0.0.1');
