import { test } from "node:test";
import assert from "node:assert/strict";
import { loadKS } from "./helpers.mjs";

const KS = loadKS();
const P = KS.policy;

test("defaults: dansk ved dansk UI, ellers engelsk", () => {
  assert.equal(P.defaults("da-DK").language, "da");
  assert.equal(P.defaults("en-US").language, "en");
  assert.equal(P.defaults(undefined).language, "en");
});

test("defaults: søgemaskiner til, generelle AI-chattjenester fra", () => {
  const d = P.defaults("da");
  assert.equal(d.enabled, true);
  assert.equal(d.categories["google.answers"], true);
  assert.equal(d.categories["google.chat"], true);
  assert.equal(d.categories["ecosia.chat"], true);
  assert.equal(d.categories["general.chat"], false);
});

test("migrering: eksisterende brugere får nye kategorier, egne valg bevares", () => {
  // Simulerer en ældre version uden ecosia- og general-kategorier.
  const old = {
    schemaVersion: 0,
    enabled: true,
    categories: { "google.answers": false, "google.chat": true, "bing.answers": true },
    language: "da",
    theme: "dark",
  };
  const p = P.migrate(old, "en");
  assert.equal(p.categories["google.answers"], false, "eget valg bevaret");
  assert.equal(p.categories["ecosia.chat"], true, "ny kategori med standardværdi");
  assert.equal(p.categories["general.chat"], false, "ny kategori med standardværdi");
  assert.equal(p.language, "da");
  assert.equal(p.theme, "dark");
  assert.equal(p.ddgUseNoAi, true, "nyt felt får standardværdi");
  assert.equal(p.schemaVersion, P.SCHEMA_VERSION);
});

test("migrering: ukendte kategorier og forkerte typer ignoreres", () => {
  const p = P.migrate({ categories: { "old.removed": true, "google.chat": "yes" }, enabled: "no", language: "fr" }, "da");
  assert.equal("old.removed" in p.categories, false);
  assert.equal(p.categories["google.chat"], true);
  assert.equal(p.enabled, true);
  assert.equal(p.language, "da");
});

test("migrering: tomt eller ødelagt input giver standardpolitik", () => {
  for (const bad of [undefined, null, 42, "x", []]) {
    assert.deepEqual(P.migrate(bad, "da"), P.defaults("da"));
  }
});

test("managed: kun gyldige felter og kendte kategorier", () => {
  const m = P.sanitizeManaged({
    enabled: true, lockSettings: true, language: "xx", googleForceWeb: "true",
    categories: { "general.chat": true, "nope.chat": true, "bing.chat": 1 },
  });
  assert.deepEqual(m, { enabled: true, lockSettings: true, categories: { "general.chat": true } });
  assert.deepEqual(P.sanitizeManaged(null), {});
});

test("managed: overstyrer lokal politik og kan låse", () => {
  const local = P.defaults("da");
  local.enabled = false;
  const eff = P.applyManaged(local, { enabled: true, lockSettings: true, categories: { "general.chat": true } });
  assert.equal(eff.policy.enabled, true);
  assert.equal(eff.policy.categories["general.chat"], true);
  assert.equal(eff.locked, true);
  assert.equal(eff.managed, true);
  assert.equal(local.categories["general.chat"], false, "input ændres ikke");

  const none = P.applyManaged(P.defaults("da"), {});
  assert.equal(none.managed, false);
  assert.equal(none.locked, false);
});

test("egne domæner: normaliseres, dubletter og ugyldige fjernes", () => {
  const p = P.migrate({ customBlockedDomains: ["Manus.im", "https://www.manus.im/", "genspark.ai", "ikke et domæne", 42] }, "da");
  assert.deepEqual(p.customBlockedDomains, ["manus.im", "genspark.ai"]);
});

test("egne domæner: højst MAX_CUSTOM_DOMAINS", () => {
  const many = Array.from({ length: P.MAX_CUSTOM_DOMAINS + 50 }, (_, i) => `site${i}.dk`);
  assert.equal(P.migrate({ customBlockedDomains: many }, "da").customBlockedDomains.length, P.MAX_CUSTOM_DOMAINS);
});

test("migrering fra 1.0.0: customBlockedDomains tilføjes som tom liste", () => {
  const v1 = { schemaVersion: 1, enabled: true, categories: { "general.chat": true }, language: "da", theme: "auto", googleForceWeb: false, ddgUseNoAi: true };
  const p = P.migrate(v1, "da");
  assert.deepEqual(p.customBlockedDomains, []);
  assert.equal(p.categories["general.chat"], true);
  assert.equal(p.schemaVersion, 2);
});

test("managed: egne domæner lægges oven i brugerens, uden dubletter", () => {
  const local = P.defaults("da");
  local.customBlockedDomains = ["genspark.ai"];
  const m = P.sanitizeManaged({ customBlockedDomains: ["manus.im", "genspark.ai", "!!"] });
  assert.deepEqual(m.customBlockedDomains, ["manus.im", "genspark.ai"]);
  const eff = P.applyManaged(local, m);
  assert.deepEqual(eff.policy.customBlockedDomains, ["manus.im", "genspark.ai"]);
  assert.deepEqual(local.customBlockedDomains, ["genspark.ai"], "input ændres ikke");
});
