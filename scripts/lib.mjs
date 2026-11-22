// Fælles hjælpere til build-, validerings- og pakkescripts.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import zlib from "node:zlib";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DIST = path.join(ROOT, "dist");
export const BUILD = path.join(ROOT, "build");
export const TARGETS = {
  chromium: { manifest: "manifests/manifest.json", label: "Chrome / Edge" },
  firefox: { manifest: "manifests/manifest.firefox.json", label: "Firefox" },
};

/** Indlæser de kompilerede, rene moduler (uden browser-API'er) i Node. */
export function loadKS() {
  const require = createRequire(import.meta.url);
  for (const f of ["shared/ns.js", "shared/match.js", "shared/rules.js", "shared/policy.js", "shared/i18n.js"]) {
    require(path.join(DIST, f));
  }
  return globalThis.KS;
}

/** JSON-skema til storage.managed (Chrome/Edge), genereret ud fra reglerne. */
export function managedSchema(KS) {
  const categories = {};
  for (const c of KS.rules.categories) {
    categories[c.id] = {
      type: "boolean",
      title: c.id,
      description: `${c.kind === "answers" ? "Hide AI answers" : "Block AI chat"} (${c.engineId}). Default: ${c.defaultOn}`,
    };
  }
  return {
    type: "object",
    properties: {
      enabled: { type: "boolean", title: "Enabled", description: "Turn Klarsyn on or off." },
      lockSettings: { type: "boolean", title: "Lock settings", description: "Users cannot change settings in the extension." },
      language: { type: "string", title: "Language", enum: ["da", "en"] },
      googleForceWeb: { type: "boolean", title: "Google Web view", description: "Add udm=14 to Google searches." },
      ddgUseNoAi: { type: "boolean", title: "DuckDuckGo No AI", description: "Use noai.duckduckgo.com." },
      categories: { type: "object", title: "Categories", properties: categories },
      customBlockedDomains: {
        type: "array",
        title: "Extra blocked domains",
        description: "Domains blocked by the browser, for example manus.im. Added to the user's own list.",
        items: { type: "string" },
      },
    },
  };
}

export function listFiles(dir, base = dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(p, base));
    else out.push({ abs: p, rel: path.relative(base, p).split(path.sep).join("/") });
  }
  return out;
}

function dosTime(d) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

export function zip(files, outFile) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const { time, date } = dosTime(new Date());
  for (const f of files) {
    const data = fs.readFileSync(f.abs);
    const comp = zlib.deflateRawSync(data, { level: 9 });
    const name = Buffer.from(f.rel, "utf8");
    const crc = zlib.crc32(data) >>> 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 filnavne
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, name, comp);

    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0x0800, 8);
    cen.writeUInt16LE(8, 10);
    cen.writeUInt16LE(time, 12);
    cen.writeUInt16LE(date, 14);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(comp.length, 20);
    cen.writeUInt32LE(data.length, 24);
    cen.writeUInt16LE(name.length, 28);
    cen.writeUInt32LE(offset, 42);
    central.push(cen, name);
    offset += local.length + name.length + comp.length;
  }
  const cenBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cenBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  fs.writeFileSync(outFile, Buffer.concat([...chunks, cenBuf, end]));
}


/** Filer der hører til kildekoden (det samme som i Git). */
export const SOURCE_ENTRIES = [
  "src", "static", "manifests", "scripts", "test", ".github",
  "package.json", "package-lock.json", "tsconfig.json",
  "README.md", "README.en.md", "CHANGELOG.md", "LICENSE",
  ".gitignore", ".gitattributes", ".editorconfig",
];

export function makeSourceZip(outFile) {
  const files = [];
  for (const entry of SOURCE_ENTRIES) {
    const abs = path.join(ROOT, entry);
    if (!fs.existsSync(abs)) continue;
    if (fs.statSync(abs).isDirectory()) {
      for (const f of listFiles(abs)) files.push({ abs: f.abs, rel: `${entry}/${f.rel}` });
    } else {
      files.push({ abs, rel: entry });
    }
  }
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  zip(files, outFile);
  return outFile;
}
