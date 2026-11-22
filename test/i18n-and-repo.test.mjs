import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadKS, ROOT } from "./helpers.mjs";

const KS = loadKS();
const { da, en } = KS.i18n.dict;

test("i18n: dansk og engelsk har præcis de samme nøgler", () => {
  assert.deepEqual(Object.keys(da).sort(), Object.keys(en).sort());
});

test("i18n: ingen tomme tekster", () => {
  for (const [lang, d] of Object.entries(KS.i18n.dict)) {
    for (const [k, v] of Object.entries(d)) assert.ok(v.trim().length > 0, `${lang}.${k}`);
  }
});

test("i18n: alle nøgler brugt i HTML findes", () => {
  for (const page of ["popup.html", "options.html"]) {
    const html = fs.readFileSync(path.join(ROOT, "static", page), "utf8");
    for (const m of html.matchAll(/data-i18n(?:-placeholder|-aria)?="([^"]+)"/g)) {
      assert.ok(m[1] in da, `${page}: mangler nøgle ${m[1]}`);
    }
  }
});

test("i18n: alle nøgler brugt i TypeScript findes", () => {
  const files = ["src/ui/popup.ts", "src/ui/options.ts", "src/content/overlay.ts"];
  for (const f of files) {
    const src = fs.readFileSync(path.join(ROOT, f), "utf8");
    for (const m of src.matchAll(/\bt\("([A-Za-z0-9]+)"/g)) {
      assert.ok(m[1] in da, `${f}: mangler nøgle ${m[1]}`);
    }
  }
});

test("i18n: t() udfylder variable og falder tilbage til nøglen", () => {
  assert.equal(KS.i18n.t("da", "version", { v: "1.2.3" }), "Version 1.2.3");
  assert.equal(KS.i18n.t("en", "doesNotExist"), "doesNotExist");
});

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", "build", "release", ".git"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|mjs|js|json|html|css|md|txt|yml|svg|ps1)$/.test(e.name)) out.push(p);
  }
  return out;
}

test("ingen tankestreger (em dash) i kode eller tekster", () => {
  const offenders = walk(ROOT).filter((f) => fs.readFileSync(f, "utf8").includes(String.fromCharCode(0x2014)));
  assert.deepEqual(offenders.map((f) => path.relative(ROOT, f)), []);
});

test("ingen netværkskald i kildekoden (alt er lokalt)", () => {
  const src = walk(path.join(ROOT, "src"));
  for (const f of src) {
    const code = fs.readFileSync(f, "utf8");
    assert.ok(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|new WebSocket/.test(code), path.relative(ROOT, f));
  }
});

test("manifester: content_scripts.matches svarer til reglerne", () => {
  for (const f of ["manifests/manifest.json", "manifests/manifest.firefox.json"]) {
    const m = JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));
    assert.deepEqual([...m.content_scripts[0].matches].sort(), [...KS.rules.contentMatches].sort(), f);
  }
});

test("manifester: Chrome/Edge bruger service_worker, Firefox bruger scripts", () => {
  const c = JSON.parse(fs.readFileSync(path.join(ROOT, "manifests/manifest.json"), "utf8"));
  const ff = JSON.parse(fs.readFileSync(path.join(ROOT, "manifests/manifest.firefox.json"), "utf8"));
  assert.ok(c.background.service_worker);
  assert.equal(c.background.scripts, undefined);
  assert.ok(Array.isArray(ff.background.scripts));
  assert.ok(ff.browser_specific_settings.gecko.id);
});

test("Firefox: samme udvidelses-id i manifest, installationsscript og eksempelpolitik", () => {
  const ff = JSON.parse(fs.readFileSync(path.join(ROOT, "manifests/manifest.firefox.json"), "utf8"));
  const id = ff.browser_specific_settings.gecko.id;
  const ps1 = fs.readFileSync(path.join(ROOT, "scripts/windows/Install-KlarsynFirefox.ps1"), "utf8");
  assert.ok(ps1.includes(`$ExtensionId = "${id}"`), "ps1");
  const ex = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/firefox-policies.example.json"), "utf8"));
  assert.equal(ex.policies.ExtensionSettings[id].installation_mode, "force_installed");
  assert.ok(ex.policies["3rdparty"].Extensions[id]);
});

test("PowerShell-script: UTF-8 med BOM (Windows PowerShell 5.1 læser ellers æøå forkert)", () => {
  const buf = fs.readFileSync(path.join(ROOT, "scripts/windows/Install-KlarsynFirefox.ps1"));
  assert.deepEqual([...buf.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
});
