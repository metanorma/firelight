// CJS shim for Bun
import { createRequire } from "node:module";
import path from "node:path";
import url from "node:url";

globalThis.require = createRequire(import.meta.url);
globalThis.__require = createRequire(import.meta.url);

// Add compatibility for __dirname and __filename in ESM
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

globalThis.__filename = __filename;
globalThis.__dirname = __dirname;
