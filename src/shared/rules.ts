// Regler for AI-svar (skjules) og AI-chat (blokeres hårdt). Kun data og ren logik.
//
// VIGTIGT: Søgemaskinernes HTML ændrer sig ofte. Felter markeret som "bedste bud"
// er ikke bekræftet i en rigtig browser endnu. Se README, afsnittet om regler.
(() => {
  const GOOGLE_TLDS = [
    "com", "dk", "de", "se", "no", "fi", "is", "nl", "be", "fr", "es", "it",
    "at", "ch", "pl", "ie", "co.uk", "ca", "com.au",
  ] as const;
  const googleDomains = GOOGLE_TLDS.map((t) => `google.${t}`);

  // Fælles fallback: overskrifter med links til eksterne sider = almindelige resultater.
  const GENERIC_ORGANIC = ["a[href^='http'] h2", "a[href^='http'] h3", "h2 > a[href^='http']", "h3 > a[href^='http']"];

  const engines: Engine[] = [
    {
      id: "google",
      name: "Google",
      answers: {
        domains: googleDomains,
        paths: ["/search"],
        hideSelectors: [],
        headingTexts: [
          "AI Overview", "AI Overviews", "AI-oversigt", "Oversigt fra AI", "AI-overblik",
          "Übersicht mit KI", "KI-Übersicht", "Översikt från AI", "AI-oversikt",
        ],
        organicSelectors: ["#rso a h3", "#search a h3", ...GENERIC_ORGANIC],
        stopSelectors: ["#rso", "#search", "#center_col", "#rcnt", "#main", "body"],
      },
      chat: [
        // Bekræftet: AI Mode bruger udm=50 (ghacks, Fortinet, Netskope).
        {
          domains: googleDomains,
          paths: ["/search"],
          query: { udm: "50" },
          fallback: { base: "/search", param: "q", source: "q", extra: { udm: "14" } },
          verified: true,
        },
      ],
      chatEntrySelectors: [
        "a[href*='udm=50']",
        "[role='listitem']:has(> a[href*='udm=50'])",
      ],
    },
    {
      id: "bing",
      name: "Bing",
      answers: {
        domains: ["bing.com"],
        paths: ["/search"],
        // Bedste bud: Copilot-svarbokse i resultaterne.
        hideSelectors: ["#b_copilot_answer", ".b_copilot_ans"],
        headingTexts: ["Copilot", "Copilot Answer", "Copilot-svar", "Svar fra Copilot"],
        organicSelectors: ["li.b_algo", ...GENERIC_ORGANIC],
        stopSelectors: ["#b_results", "#b_content", "main", "body"],
      },
      chat: [
        // Bekræftet: Copilot Search på bing.com/copilotsearch?q=...
        {
          domains: ["bing.com"],
          paths: ["/copilotsearch"],
          fallback: { base: "https://www.bing.com/search", param: "q", source: "q" },
          verified: true,
        },
        // Bedste bud: ældre chat-indgang på bing.com/chat.
        {
          domains: ["bing.com"],
          paths: ["/chat"],
          fallback: { base: "https://www.bing.com/" },
          verified: false,
        },
        {
          domains: ["copilot.microsoft.com"],
          fallback: { base: "https://www.bing.com/" },
          verified: true,
        },
      ],
      chatEntrySelectors: [
        "a[href*='/copilotsearch']",
        "a[href*='copilot.microsoft.com']",
        "a[href^='/chat']",
        "#b-scopeListItem-conv",
        "#b-scopeListItem-copilotsearch",
      ],
    },
    {
      id: "duckduckgo",
      name: "DuckDuckGo",
      answers: {
        domains: ["duckduckgo.com"],
        paths: [],
        hideSelectors: [],
        headingTexts: ["Search Assist", "Assist", "Søgeassistent", "Duck.ai"],
        organicSelectors: ["article[data-testid='result']", "[data-testid='result']", ...GENERIC_ORGANIC],
        stopSelectors: ["[data-testid='mainline']", "#react-layout", "main", "body"],
      },
      chat: [
        {
          domains: ["duck.ai"],
          fallback: { base: "https://duckduckgo.com/" },
          verified: true,
        },
        // Bedste bud: Duck.ai åbnet inde på duckduckgo.com.
        {
          domains: ["duckduckgo.com"],
          query: { ia: "chat" },
          fallback: { base: "https://duckduckgo.com/", param: "q", source: "q" },
          verified: false,
        },
        {
          domains: ["duckduckgo.com"],
          paths: ["/chat", "/aichat"],
          fallback: { base: "https://duckduckgo.com/" },
          verified: false,
        },
      ],
      chatEntrySelectors: ["a[href*='duck.ai']", "a[href*='ia=chat']", "a[href^='/chat']"],
    },
    {
      id: "ecosia",
      name: "Ecosia",
      answers: {
        domains: ["ecosia.org"],
        paths: ["/search"],
        hideSelectors: ["[data-test-id='ai-overview']"],
        headingTexts: ["AI Overview", "AI Overviews", "AI-oversigt", "KI-Überblick", "AI-overblik"],
        organicSelectors: ["[data-test-id='mainline-result-web']", ...GENERIC_ORGANIC],
        stopSelectors: ["[data-test-id='mainline']", "main", "body"],
      },
      chat: [
        // Fra projektoplægget: Ecosias AI-chat ligger på /ai-search.
        {
          domains: ["ecosia.org"],
          paths: ["/ai-search"],
          fallback: { base: "https://www.ecosia.org/search", param: "q", source: "q" },
          verified: true,
        },
        // Bedste bud: ældre chat-adresse.
        {
          domains: ["ecosia.org"],
          paths: ["/chat"],
          fallback: { base: "https://www.ecosia.org/" },
          verified: false,
        },
      ],
      chatEntrySelectors: ["a[href*='/ai-search']", "a[href^='/chat']", "a[href*='ecosia.org/chat']"],
    },
    {
      id: "yahoo",
      name: "Yahoo",
      answers: {
        domains: ["search.yahoo.com"],
        paths: ["/search"],
        hideSelectors: [],
        headingTexts: ["Yahoo Scout", "Scout", "AI Answer", "AI Answers"],
        organicSelectors: [".algo", "li .compTitle a", ...GENERIC_ORGANIC],
        stopSelectors: ["#web", "#main", "main", "body"],
      },
      chat: [
        // Bekræftet: Yahoo Scout på scout.yahoo.com (lanceret januar 2026, beta, USA).
        {
          domains: ["scout.yahoo.com"],
          fallback: { base: "https://search.yahoo.com/" },
          verified: true,
        },
      ],
      chatEntrySelectors: ["a[href*='scout.yahoo.com']"],
    },
  ];

  const general: Engine = {
    id: "general",
    name: "AI-chattjenester",
    answers: null,
    chat: [
      { domains: ["chatgpt.com", "chat.openai.com"], verified: true },
      { domains: ["gemini.google.com"], verified: true },
      { domains: ["claude.ai"], verified: true },
      { domains: ["perplexity.ai"], verified: true },
      { domains: ["chat.mistral.ai"], verified: true },
      { domains: ["chat.deepseek.com"], verified: true },
      { domains: ["meta.ai"], verified: true },
      { domains: ["grok.com"], verified: true },
      // AI-agenter (bekræftet via officielle sider).
      { domains: ["manus.im"], verified: true },
      { domains: ["genspark.ai"], verified: true },
      // Populære AI-chatsider (Similarweb-konkurrentliste for chatgpt.com).
      { domains: ["character.ai"], verified: true },
      { domains: ["poe.com"], verified: true },
      { domains: ["deepai.org"], verified: true },
      { domains: ["janitorai.com"], verified: true },
      // Bedste bud: kendte AI-chattjenester, domæner ikke bekræftet i denne version.
      { domains: ["chat.qwen.ai"], verified: false },
      { domains: ["kimi.com", "kimi.moonshot.cn"], verified: false },
      { domains: ["you.com"], verified: false },
      { domains: ["phind.com"], verified: false },
      { domains: ["pi.ai"], verified: false },
      { domains: ["monica.im"], verified: false },
      { domains: ["chat.z.ai"], verified: false },
      { domains: ["lmarena.ai"], verified: false },
      { domains: ["felo.ai"], verified: false },
      { domains: ["notebooklm.google.com", "aistudio.google.com"], verified: false },
      { domains: ["huggingface.co"], paths: ["/chat"], verified: false },
    ],
    chatEntrySelectors: [],
  };

  const categories: Category[] = [];
  for (const e of engines) {
    if (e.answers) categories.push({ id: `${e.id}.answers`, engineId: e.id, kind: "answers", defaultOn: true });
    categories.push({ id: `${e.id}.chat`, engineId: e.id, kind: "chat", defaultOn: true });
  }
  // Generelle AI-chattjenester er slået FRA som standard: det er et større indgreb,
  // som admin selv skal vælge.
  categories.push({ id: "general.chat", engineId: "general", kind: "chat", defaultOn: false });

  const contentMatches: string[] = [
    ...GOOGLE_TLDS.flatMap((t) => [`*://www.google.${t}/*`, `*://google.${t}/*`]),
    "*://*.bing.com/*",
    "*://copilot.microsoft.com/*",
    "*://*.duckduckgo.com/*",
    "*://*.duck.ai/*",
    "*://*.ecosia.org/*",
    "*://search.yahoo.com/*",
    "*://*.search.yahoo.com/*",
    "*://scout.yahoo.com/*",
    "*://*.chatgpt.com/*",
    "*://chat.openai.com/*",
    "*://gemini.google.com/*",
    "*://*.claude.ai/*",
    "*://*.perplexity.ai/*",
    "*://chat.mistral.ai/*",
    "*://chat.deepseek.com/*",
    "*://*.meta.ai/*",
    "*://*.grok.com/*",
    "*://*.manus.im/*",
    "*://*.genspark.ai/*",
    "*://*.character.ai/*",
    "*://*.poe.com/*",
    "*://*.deepai.org/*",
    "*://*.janitorai.com/*",
    "*://chat.qwen.ai/*",
    "*://*.kimi.com/*",
    "*://kimi.moonshot.cn/*",
    "*://*.you.com/*",
    "*://*.phind.com/*",
    "*://*.pi.ai/*",
    "*://*.monica.im/*",
    "*://chat.z.ai/*",
    "*://*.lmarena.ai/*",
    "*://*.felo.ai/*",
    "*://notebooklm.google.com/*",
    "*://aistudio.google.com/*",
    "*://huggingface.co/*",
  ];

  function engineForAnswers(url: URL): Engine | null {
    for (const e of engines) {
      const a = e.answers;
      if (!a) continue;
      if (!KS.match.hostMatchesAny(url.hostname, a.domains)) continue;
      if (a.paths.length > 0 && !a.paths.some((p) => KS.match.pathMatches(url.pathname, p))) continue;
      return e;
    }
    return null;
  }

  function engineByHost(host: string): Engine | null {
    for (const e of [...engines, general]) {
      const domains = [...(e.answers?.domains ?? []), ...e.chat.flatMap((r) => r.domains)];
      if (KS.match.hostMatchesAny(host, domains)) return e;
    }
    return null;
  }

  function blockingRule(
    url: URL,
    isOn: (categoryId: string) => boolean
  ): { rule: ChatRule; category: string } | null {
    for (const e of [...engines, general]) {
      const category = `${e.id}.chat`;
      if (!isOn(category)) continue;
      for (const rule of e.chat) {
        if (KS.match.ruleMatches(url, rule)) return { rule, category };
      }
    }
    return null;
  }

  KS.rules = { engines, categories, general, contentMatches, engineForAnswers, blockingRule, engineByHost };
})();
