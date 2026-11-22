// Validerer de to manifester og de byggede mapper. Kører i CI efter "npm run build".
import fs from "node:fs";
import path from "node:path";
import { ROOT, BUILD, TARGETS, loadKS } from "./lib.mjs";

const errors = [];
const fail = (msg) => errors.push(msg);
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const KS = loadKS();

/** Simpel implementering af Chromes match-mønstre for værtsnavne. */
function patternCoversHost(pattern, host) {
  const m = /^(\*|https?):\/\/([^/]+)\//.exec(pattern);
  if (!m) return false;
  const h = m[2];
  if (h.startsWith("*.")) {
    const base = h.slice(2);
    return host === base || host.endsWith("." + base);
  }
  return host === h;
}

for (const [name, target] of Object.entries(TARGETS)) {
  const src = JSON.parse(fs.readFileSync(path.join(ROOT, target.manifest), "utf8"));
  const label = target.manifest;

  if (src.manifest_version !== 3) fail(`${label}: manifest_version skal være 3`);
  if (src.version !== pkg.version) fail(`${label}: version ${src.version} != package.json ${pkg.version}`);
  if (/[\u2014]/.test(JSON.stringify(src))) fail(`${label}: indeholder tankestreg (em dash)`);

  if (name === "chromium") {
    if (!src.background?.service_worker) fail(`${label}: mangler background.service_worker`);
    if (src.background?.scripts) fail(`${label}: Edge afviser background.scripts`);
    if (src.browser_specific_settings) fail(`${label}: browser_specific_settings hører kun til Firefox`);
  } else {
    if (!Array.isArray(src.background?.scripts)) fail(`${label}: mangler background.scripts`);
    if (src.background?.service_worker) fail(`${label}: Firefox bruger background.scripts, ikke service_worker`);
    if (!src.browser_specific_settings?.gecko?.id) fail(`${label}: mangler gecko.id`);
  }

  // Indholdsscriptets mønstre skal være præcis dem, reglerne forventer.
  const cs = src.content_scripts?.[0];
  const want = [...KS.rules.contentMatches].sort();
  const got = [...(cs?.matches ?? [])].sort();
  if (JSON.stringify(want) !== JSON.stringify(got)) {
    fail(`${label}: content_scripts.matches passer ikke med rules.contentMatches`);
  }

  // Alle domæner i reglerne skal være dækket af et mønster.
  const domains = new Set();
  for (const e of [...KS.rules.engines, KS.rules.general]) {
    for (const d of e.answers?.domains ?? []) domains.add(d);
    for (const r of e.chat) for (const d of r.domains) domains.add(d);
  }
  for (const d of domains) {
    const hosts = d.startsWith("google.") || d === "bing.com" || d === "ecosia.org" ? [`www.${d}`] : [d];
    for (const h of hosts) {
      if (!got.some((p) => patternCoversHost(p, h))) fail(`${label}: domænet ${h} er ikke dækket af content_scripts.matches`);
    }
  }

  // Byggede filer skal findes.
  const out = path.join(BUILD, name);
  if (!fs.existsSync(out)) {
    fail(`build/${name} findes ikke. Kør 'npm run build' først.`);
    continue;
  }
  const files = new Set();
  const add = (f) => f && files.add(f);
  add(src.background?.service_worker);
  (src.background?.scripts ?? []).forEach(add);
  (cs?.js ?? []).forEach(add);
  Object.values(src.icons ?? {}).forEach(add);
  Object.values(src.action?.default_icon ?? {}).forEach(add);
  add(src.action?.default_popup);
  add(src.options_ui?.page);
  add(src.storage?.managed_schema);
  for (const f of files) {
    if (!fs.existsSync(path.join(out, f))) fail(`build/${name}: mangler ${f}`);
  }
  for (const f of ["manifest.json", "LOAD-THIS-FOLDER.txt"]) {
    if (!fs.existsSync(path.join(out, f))) fail(`build/${name}: mangler ${f}`);
  }

  // Scripts refereret fra HTML-sider skal findes.
  for (const page of ["popup.html", "options.html"]) {
    const html = fs.readFileSync(path.join(out, page), "utf8");
    for (const m of html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g)) {
      const ref = m[1];
      if (/^https?:/.test(ref)) fail(`build/${name}/${page}: eksternt link ${ref} er ikke tilladt`);
      else if (!fs.existsSync(path.join(out, ref))) fail(`build/${name}/${page}: mangler ${ref}`);
    }
  }
}

if (errors.length) {
  console.error("Manifest-validering fejlede:\n - " + errors.join("\n - "));
  process.exit(1);
}
console.log("Manifester og build/ er gyldige.");
