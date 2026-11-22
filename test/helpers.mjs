// Indlæser de kompilerede filer (dist/) i Node. Kør via "npm test", som kompilerer først.
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

export function loadKS() {
  for (const f of ["ns", "match", "rules", "policy", "i18n", "pin"]) {
    require(path.join(ROOT, "dist", "shared", `${f}.js`));
  }
  return globalThis.KS;
}
