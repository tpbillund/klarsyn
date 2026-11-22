import { test } from "node:test";
import assert from "node:assert/strict";
import { loadKS } from "./helpers.mjs";

const KS = loadKS();
const m = KS.match;

test("hostMatches: præcis host og subdomæner", () => {
  assert.equal(m.hostMatches("google.com", "google.com"), true);
  assert.equal(m.hostMatches("www.google.com", "google.com"), true);
  assert.equal(m.hostMatches("WWW.Google.COM", "google.com"), true);
  assert.equal(m.hostMatches("google.com.", "google.com"), true);
});

test("regression: domæne-match er aldrig substring (netflix.com må ikke matche x.com)", () => {
  assert.equal(m.hostMatches("netflix.com", "x.com"), false);
  assert.equal(m.hostMatches("notgoogle.com", "google.com"), false);
  assert.equal(m.hostMatches("google.com.evil.net", "google.com"), false);
  assert.equal(m.hostMatches("myduck.ai", "duck.ai"), false);
  assert.equal(m.hostMatches("", "x.com"), false);
});

test("pathMatches: kun på segmentgrænse", () => {
  assert.equal(m.pathMatches("/ai-search", "/ai-search"), true);
  assert.equal(m.pathMatches("/ai-search/abc", "/ai-search"), true);
  assert.equal(m.pathMatches("/ai-searchx", "/ai-search"), false);
  assert.equal(m.pathMatches("/chatty", "/chat"), false);
  assert.equal(m.pathMatches("/anything", "/"), true);
});

test("ruleMatches: domæne, sti og query skal alle passe", () => {
  const rule = { domains: ["google.com"], paths: ["/search"], query: { udm: "50" }, verified: true };
  assert.equal(m.ruleMatches(new URL("https://www.google.com/search?q=a&udm=50"), rule), true);
  assert.equal(m.ruleMatches(new URL("https://www.google.com/search?q=a&udm=14"), rule), false);
  assert.equal(m.ruleMatches(new URL("https://www.google.com/search?q=a"), rule), false);
  assert.equal(m.ruleMatches(new URL("https://www.google.com/maps?udm=50"), rule), false);
  assert.equal(m.ruleMatches(new URL("https://notgoogle.com/search?udm=50"), rule), false);
});

test("buildFallback: relativ og absolut base, søgetekst bevares", () => {
  const g = m.buildFallback(new URL("https://www.google.dk/search?q=hej+verden&udm=50"), {
    base: "/search", param: "q", source: "q", extra: { udm: "14" },
  });
  const gu = new URL(g);
  assert.equal(gu.origin, "https://www.google.dk");
  assert.equal(gu.searchParams.get("q"), "hej verden");
  assert.equal(gu.searchParams.get("udm"), "14");

  const e = m.buildFallback(new URL("https://www.ecosia.org/ai-search?q=tr%C3%A6er"), {
    base: "https://www.ecosia.org/search", param: "q", source: "q",
  });
  assert.equal(new URL(e).searchParams.get("q"), "træer");

  assert.equal(m.buildFallback(new URL("https://duck.ai/"), undefined), null);
  assert.equal(m.buildFallback(new URL("https://duck.ai/"), { base: "javascript:alert(1)" }), null);
});

// Lille falsk DOM-træ til climbToContainer.
function tree() {
  const mk = (name, parent, organic = false, stop = false) => ({ name, parentElement: parent, organic, stop });
  const body = mk("body", null, false, true);
  const results = mk("results", body, true);   // indeholder både AI-boks og resultater
  const aiOuter = mk("aiOuter", results);
  const aiInner = mk("aiInner", aiOuter);
  const heading = mk("heading", aiInner);
  return { body, results, aiOuter, aiInner, heading };
}

test("climbToContainer: største forfader uden almindelige resultater", () => {
  const t = tree();
  const box = m.climbToContainer(t.heading, (n) => n.stop, (n) => n.organic, 10);
  assert.equal(box.name, "aiOuter");
});

test("regression: skjuler aldrig en container med almindelige resultater", () => {
  const t = tree();
  t.aiInner.organic = true; // resultater ligger helt tæt på overskriften
  const box = m.climbToContainer(t.heading, (n) => n.stop, (n) => n.organic, 10);
  assert.equal(box, null);
});

test("climbToContainer: respekterer maxDepth og stop", () => {
  const t = tree();
  assert.equal(m.climbToContainer(t.heading, (n) => n.stop, (n) => n.organic, 1).name, "aiInner");
  t.aiOuter.stop = true;
  assert.equal(m.climbToContainer(t.heading, (n) => n.stop, (n) => n.organic, 10).name, "aiInner");
});

test("headingMatches: præcis eller kort udvidelse, ikke lange tekster", () => {
  const wanted = ["AI Overview", "AI-oversigt"];
  assert.equal(m.headingMatches("  AI   Overview ", wanted), true);
  assert.equal(m.headingMatches("ai-oversigt", wanted), true);
  assert.equal(m.headingMatches("AI Overview Learn more", wanted), true);
  assert.equal(m.headingMatches("Overview", wanted), false);
  assert.equal(m.headingMatches("AI Overview of the history of computing in the twentieth century", wanted), false);
});

test("normalizeDomain: rydder op i det admin skriver", () => {
  assert.equal(m.normalizeDomain("manus.im"), "manus.im");
  assert.equal(m.normalizeDomain("  https://www.Manus.im/app?x=1 "), "manus.im");
  assert.equal(m.normalizeDomain("WWW.GENSPARK.AI"), "genspark.ai");
  assert.equal(m.normalizeDomain("chat.example.co.uk"), "chat.example.co.uk");
  assert.equal(m.normalizeDomain("xn--blbrgrd-fxak7p.dk"), "xn--blbrgrd-fxak7p.dk");
});

test("normalizeDomain: afviser ugyldigt input", () => {
  for (const bad of ["", "manus", "manus .im", "http://", "192.168.1.1", "-bad.com", "a..b.com", "*.manus.im", "javascript:alert(1)"]) {
    assert.equal(m.normalizeDomain(bad), null, bad);
  }
});
