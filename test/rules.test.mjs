import { test } from "node:test";
import assert from "node:assert/strict";
import { loadKS } from "./helpers.mjs";

const KS = loadKS();
const allOn = () => true;
const defaults = KS.policy.defaults("da");
const defaultOn = (c) => defaults.categories[c] === true;
const blocked = (href, isOn = defaultOn) => KS.rules.blockingRule(new URL(href), isOn)?.category ?? null;

test("Google: AI Mode (udm=50) blokeres, almindelig søgning gør ikke", () => {
  assert.equal(blocked("https://www.google.com/search?q=x&udm=50"), "google.chat");
  assert.equal(blocked("https://www.google.dk/search?q=x&udm=50"), "google.chat");
  assert.equal(blocked("https://www.google.dk/search?q=x"), null);
  assert.equal(blocked("https://www.google.dk/search?q=x&udm=14"), null);
  assert.equal(blocked("https://www.google.dk/search?q=x&udm=2"), null);
});

test("Bing: Copilot Search og copilot.microsoft.com blokeres", () => {
  assert.equal(blocked("https://www.bing.com/copilotsearch?q=x"), "bing.chat");
  assert.equal(blocked("https://copilot.microsoft.com/"), "bing.chat");
  assert.equal(blocked("https://www.bing.com/search?q=x"), null);
});

test("DuckDuckGo: duck.ai blokeres, almindelig og noai-søgning gør ikke", () => {
  assert.equal(blocked("https://duck.ai/"), "duckduckgo.chat");
  assert.equal(blocked("https://duckduckgo.com/?q=x&ia=chat"), "duckduckgo.chat");
  assert.equal(blocked("https://duckduckgo.com/?q=x"), null);
  assert.equal(blocked("https://noai.duckduckgo.com/?q=x"), null);
});

test("Ecosia: /ai-search blokeres, /search gør ikke", () => {
  assert.equal(blocked("https://www.ecosia.org/ai-search?q=x"), "ecosia.chat");
  assert.equal(blocked("https://www.ecosia.org/search?q=x"), null);
  assert.equal(blocked("https://www.ecosia.org/ai-searchx"), null);
});

test("Yahoo: Scout blokeres, almindelig søgning gør ikke", () => {
  assert.equal(blocked("https://scout.yahoo.com/"), "yahoo.chat");
  assert.equal(blocked("https://search.yahoo.com/search?p=x"), null);
});

test("Generelle AI-chattjenester er FRA som standard, men kan slås til", () => {
  assert.equal(blocked("https://chatgpt.com/"), null);
  assert.equal(blocked("https://chatgpt.com/", allOn), "general.chat");
  assert.equal(blocked("https://gemini.google.com/app", allOn), "general.chat");
  assert.equal(blocked("https://www.perplexity.ai/", allOn), "general.chat");
});

test("Kategori fra = ingen blokering (filter og blokering er adskilt)", () => {
  const onlyAnswers = (c) => c.endsWith(".answers");
  assert.equal(blocked("https://www.google.com/search?q=x&udm=50", onlyAnswers), null);
});

test("engineForAnswers: kun på resultatsider", () => {
  const f = (h) => KS.rules.engineForAnswers(new URL(h))?.id ?? null;
  assert.equal(f("https://www.google.dk/search?q=x"), "google");
  assert.equal(f("https://www.google.dk/maps"), null);
  assert.equal(f("https://gemini.google.com/app"), null);
  assert.equal(f("https://www.bing.com/search?q=x"), "bing");
  assert.equal(f("https://noai.duckduckgo.com/?q=x"), "duckduckgo");
  assert.equal(f("https://www.ecosia.org/search?q=x"), "ecosia");
  assert.equal(f("https://dk.search.yahoo.com/search?p=x"), "yahoo");
  assert.equal(f("https://netflix.com/search"), null);
});

test("Kategorier: unikke id'er, hver motor har en chat-kategori", () => {
  const ids = KS.rules.categories.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const e of KS.rules.engines) assert.ok(ids.includes(`${e.id}.chat`), e.id);
  assert.ok(ids.includes("general.chat"));
});

test("Alle fallback-URL'er er https eller relative", () => {
  for (const e of [...KS.rules.engines, KS.rules.general]) {
    for (const r of e.chat) {
      if (!r.fallback) continue;
      assert.ok(r.fallback.base.startsWith("https://") || r.fallback.base.startsWith("/"), r.fallback.base);
    }
  }
});

test("AI-agenter: Manus og Genspark blokeres, når AI-chattjenester er slået til", () => {
  assert.equal(blocked("https://manus.im/app"), null, "fra som standard");
  assert.equal(blocked("https://manus.im/app", allOn), "general.chat");
  assert.equal(blocked("https://www.genspark.ai/agents", allOn), "general.chat");
  assert.equal(blocked("https://character.ai/", allOn), "general.chat");
  assert.equal(blocked("https://notmanus.im/", allOn), null);
});

test("Hugging Face: kun /chat blokeres, ikke resten af siden", () => {
  assert.equal(blocked("https://huggingface.co/chat/", allOn), "general.chat");
  assert.equal(blocked("https://huggingface.co/models", allOn), null);
});
