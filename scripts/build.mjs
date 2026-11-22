// Bygger to mapper, der kan indlæses direkte i browseren:
//   build/chromium  (Chrome og Edge)
//   build/firefox   (Firefox)
// Testfiler må aldrig komme med. Kør "npm run build" (som også kompilerer TypeScript).
import fs from "node:fs";
import path from "node:path";
import { ROOT, DIST, BUILD, TARGETS, loadKS, managedSchema } from "./lib.mjs";

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

function copyDir(src, dst, filter = () => true) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (!filter(s)) continue;
    if (entry.isDirectory()) copyDir(s, d, filter);
    else fs.copyFileSync(s, d);
  }
}

const isTestFile = (p) => /(^|[\\/])(test|tests|__tests__)([\\/]|$)|\.test\.|\.spec\./.test(p);
const noTests = (p) => !isTestFile(path.relative(ROOT, p));

if (!fs.existsSync(DIST)) {
  console.error("Mangler dist/. Kør 'npm run build' (ikke kun build-scriptet).");
  process.exit(1);
}

fs.rmSync(BUILD, { recursive: true, force: true });
const KS = loadKS();

for (const [name, target] of Object.entries(TARGETS)) {
  const out = path.join(BUILD, name);
  copyDir(DIST, out, (p) => noTests(p) && !p.endsWith(".map"));
  copyDir(path.join(ROOT, "static"), out, noTests);
  fs.mkdirSync(path.join(out, "vendor"), { recursive: true });
  fs.copyFileSync(
    path.join(ROOT, "node_modules/webextension-polyfill/dist/browser-polyfill.min.js"),
    path.join(out, "vendor/browser-polyfill.min.js")
  );

  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, target.manifest), "utf8"));
  manifest.version = pkg.version;
  fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

  if (name === "chromium") {
    fs.writeFileSync(path.join(out, "managed_schema.json"), JSON.stringify(managedSchema(KS), null, 2) + "\n");
  }

  fs.writeFileSync(
    path.join(out, "LOAD-THIS-FOLDER.txt"),
    [
      `Klarsyn ${pkg.version} - ${target.label}`,
      "",
      "DANSK",
      name === "chromium"
        ? "Chrome: chrome://extensions  |  Edge: edge://extensions\nSlå 'Udviklertilstand' til, klik 'Indlæs upakket' og vælg DENNE mappe."
        : "Firefox: about:debugging#/runtime/this-firefox\nKlik 'Indlæs midlertidig tilføjelse' og vælg filen manifest.json i DENNE mappe (build\\firefox).\nVælg IKKE filer i mappen 'manifests' eller 'build\\chromium'. Så får du fejlen 'background.service_worker is currently disabled'.",
      "",
      "ENGLISH",
      name === "chromium"
        ? "Chrome: chrome://extensions  |  Edge: edge://extensions\nTurn on 'Developer mode', click 'Load unpacked' and pick THIS folder."
        : "Firefox: about:debugging#/runtime/this-firefox\nClick 'Load Temporary Add-on' and pick the file manifest.json in THIS folder (build\\firefox).\nDo NOT pick files in 'manifests' or 'build\\chromium'. That gives the error 'background.service_worker is currently disabled'.",
      "",
    ].join("\n")
  );
}

fs.writeFileSync(
  path.join(BUILD, "LOAD-THIS-FOLDER.txt"),
  [
    `Klarsyn ${pkg.version}`,
    "",
    "Vælg den undermappe, der passer til din browser / Pick the subfolder for your browser:",
    "  chromium  ->  Chrome og Edge",
    "  firefox   ->  Firefox (vælg manifest.json INDE i mappen firefox / pick manifest.json INSIDE the firefox folder)",
    "",
  ].join("\n")
);

// Sikkerhedsnet: ingen testfiler i build/.
const leaked = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (isTestFile(path.relative(BUILD, p))) leaked.push(p);
  }
})(BUILD);
if (leaked.length) {
  console.error("Testfiler fundet i build/:", leaked);
  process.exit(1);
}

console.log(`Klarsyn ${pkg.version} bygget til build/chromium og build/firefox`);
