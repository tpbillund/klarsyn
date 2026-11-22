// Får Firefox-udgaven signeret af Mozilla som "unlisted" (ikke offentlig på addons.mozilla.org).
// En signeret .xpi kan installeres permanent i almindelig Firefox og tvangsinstalleres via politik.
//
// Kræver API-nøgler fra https://addons.mozilla.org/developers/addon/api/key/
// PowerShell:
//   $env:WEB_EXT_API_KEY = "user:12345:67"
//   $env:WEB_EXT_API_SECRET = "din-hemmelige-nøgle"
//   npm run sign:firefox
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, BUILD, makeSourceZip } from "./lib.mjs";

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const RELEASE = path.join(ROOT, "release");
const key = process.env.WEB_EXT_API_KEY;
const secret = process.env.WEB_EXT_API_SECRET;

if (!key || !secret) {
  console.error(
    [
      "Mangler API-nøgler fra Mozilla.",
      "1. Log ind på https://addons.mozilla.org/developers/addon/api/key/ og lav nøgler.",
      "2. Sæt dem i PowerShell (de gemmes ikke nogen steder):",
      '     $env:WEB_EXT_API_KEY = "user:..."',
      '     $env:WEB_EXT_API_SECRET = "..."',
      "3. Kør igen: npm run sign:firefox",
      "",
      "Alternativ uden nøgler: upload release\\klarsyn-<version>-firefox.zip manuelt.",
      "Se docs\\FIREFOX-PERMANENT.md.",
    ].join("\n")
  );
  process.exit(1);
}

const dir = path.join(BUILD, "firefox");
if (!fs.existsSync(path.join(dir, "manifest.json"))) {
  console.error("Mangler build\\firefox. Kør 'npm run build' først.");
  process.exit(1);
}

const source = makeSourceZip(path.join(RELEASE, `klarsyn-${pkg.version}-source.zip`));
const webExt = path.join(ROOT, "node_modules", "web-ext", "bin", "web-ext.js");

const result = spawnSync(
  process.execPath,
  [
    webExt, "sign",
    "--source-dir", dir,
    "--artifacts-dir", RELEASE,
    "--channel", "unlisted",
    "--upload-source-code", source,
  ],
  { stdio: "inherit", env: process.env }
);

if (result.status !== 0) {
  console.error("\nSigneringen fejlede. Læs beskeden ovenfor. Versionsnummeret skal være nyt for hver signering.");
  process.exit(result.status ?? 1);
}
console.log(`\nFærdig. Den signerede .xpi ligger i release\\. Se docs\\FIREFOX-PERMANENT.md for udrulning.`);
