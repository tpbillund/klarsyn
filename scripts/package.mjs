// Pakker build/chromium og build/firefox som zip-filer i release/.
// Ingen ekstra afhængigheder: en lille zip-skriver med Node's zlib.
import fs from "node:fs";
import path from "node:path";
import { ROOT, BUILD, TARGETS, listFiles, zip, makeSourceZip } from "./lib.mjs";

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const RELEASE = path.join(ROOT, "release");

fs.mkdirSync(RELEASE, { recursive: true });
for (const name of Object.keys(TARGETS)) {
  const dir = path.join(BUILD, name);
  if (!fs.existsSync(dir)) {
    console.error(`Mangler ${dir}. Kør 'npm run build' først.`);
    process.exit(1);
  }
  const out = path.join(RELEASE, `klarsyn-${pkg.version}-${name}.zip`);
  zip(listFiles(dir), out);
  console.log("Pakket:", path.relative(ROOT, out));
}

// Kildekode til Mozillas gennemgang (TypeScript bliver oversat, så de kan bede om den).
const src = makeSourceZip(path.join(RELEASE, `klarsyn-${pkg.version}-source.zip`));
console.log("Pakket:", path.relative(ROOT, src));
