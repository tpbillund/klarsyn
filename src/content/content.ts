// Indholdsscript på søgemaskiner og AI-chattjenester.
// To adskilte funktioner:
//   1) AI-svar-filter: skjuler AI-bokse i resultaterne (UI), resten af siden virker.
//   2) AI-chat-blokering: hård spærreskærm over hele siden.
(() => {
  const HIDDEN_ATTR = "data-klarsyn-hidden";
  const PREV_ATTR = "data-klarsyn-prev-display";
  const HEADING_CANDIDATES = "h1, h2, h3, h4, h5, [role='heading'], span, strong, div[aria-level]";

  let eff: Effective | null = null;
  let lastHref = "";
  let scheduled = false;
  let observer: MutationObserver | null = null;
  let urlTimer: number | undefined;

  const googleEngine = KS.rules.engines.find((e) => e.id === "google");
  const googleDomains = googleEngine?.answers?.domains ?? [];

  function isOn(category: string): boolean {
    return !!eff && eff.policy.enabled && eff.policy.categories[category] === true;
  }

  function currentUrl(): URL {
    return new URL(location.href);
  }

  // ---------- skjul / vis ----------

  function hideEl(el: HTMLElement): void {
    if (el.hasAttribute(HIDDEN_ATTR)) return;
    if (el === document.body || el === document.documentElement) return;
    el.setAttribute(HIDDEN_ATTR, "1");
    const prev = el.style.getPropertyValue("display");
    if (prev) el.setAttribute(PREV_ATTR, prev);
    // Inline-stil med !important: virker uanset sidens CSP og uden stylesheet.
    el.style.setProperty("display", "none", "important");
  }

  function unhideAll(): void {
    document.querySelectorAll<HTMLElement>(`[${HIDDEN_ATTR}]`).forEach((el) => {
      const prev = el.getAttribute(PREV_ATTR);
      el.style.removeProperty("display");
      if (prev) el.style.setProperty("display", prev);
      el.removeAttribute(HIDDEN_ATTR);
      el.removeAttribute(PREV_ATTR);
    });
  }

  function hideAll(selector: string): void {
    let nodes: NodeListOf<HTMLElement>;
    try {
      nodes = document.querySelectorAll<HTMLElement>(selector);
    } catch {
      return; // Ugyldig selektor i denne browser (fx :has i ældre versioner).
    }
    nodes.forEach(hideEl);
  }

  function safeMatches(el: Element, selectors: readonly string[]): boolean {
    return selectors.some((s) => {
      try {
        return el.matches(s);
      } catch {
        return false;
      }
    });
  }

  function safeContains(el: Element, selectors: readonly string[]): boolean {
    return selectors.some((s) => {
      try {
        return el.querySelector(s) !== null;
      } catch {
        return false;
      }
    });
  }

  function hideAnswers(engine: Engine): void {
    const a = engine.answers;
    if (!a) return;
    for (const sel of a.hideSelectors) hideAll(sel);

    const candidates = document.querySelectorAll<HTMLElement>(HEADING_CANDIDATES);
    candidates.forEach((h) => {
      if (h.closest(`[${HIDDEN_ATTR}]`)) return;
      if (h.childElementCount > 3) return;
      const text = h.textContent ?? "";
      if (text.length > 80 || !KS.match.headingMatches(text, a.headingTexts)) return;
      const box = KS.match.climbToContainer<HTMLElement>(
        h,
        (el) => safeMatches(el, a.stopSelectors),
        (el) => safeContains(el, a.organicSelectors),
        14
      );
      if (box) hideEl(box);
    });
  }

  function pass(): void {
    scheduled = false;
    if (!eff || !eff.policy.enabled) return;
    const u = currentUrl();
    const engine = KS.rules.engineByHost(u.hostname);
    if (engine && isOn(`${engine.id}.chat`)) {
      for (const sel of engine.chatEntrySelectors) hideAll(sel);
    }
    const answersEngine = KS.rules.engineForAnswers(u);
    if (answersEngine && isOn(`${answersEngine.id}.answers`)) hideAnswers(answersEngine);
  }

  function schedule(): void {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(pass, 120);
  }

  // ---------- blokering og omdirigering ----------

  function checkBlock(): boolean {
    if (!eff) return false;
    const u = currentUrl();
    const hit = eff.policy.enabled ? KS.rules.blockingRule(u, isOn) : null;
    if (hit) {
      KS.overlay.show({ lang: eff.policy.language, fallbackUrl: KS.match.buildFallback(u, hit.rule.fallback) });
      return true;
    }
    if (KS.overlay.isShown()) KS.overlay.hide();
    return false;
  }

  /** Navigation til en AI-fri udgave af samme søgning. Ingen netværkskald fra os selv. */
  function maybeRedirect(): boolean {
    if (!eff || !eff.policy.enabled) return false;
    const u = currentUrl();
    const p = eff.policy;

    if (
      p.googleForceWeb &&
      KS.match.hostMatchesAny(u.hostname, googleDomains) &&
      u.hostname !== "gemini.google.com" &&
      u.pathname === "/search" &&
      u.searchParams.get("q") &&
      !u.searchParams.has("udm") &&
      !u.searchParams.has("tbm")
    ) {
      u.searchParams.set("udm", "14");
      location.replace(u.toString());
      return true;
    }

    if (
      p.ddgUseNoAi &&
      (u.hostname === "duckduckgo.com" || u.hostname === "www.duckduckgo.com") &&
      u.pathname === "/"
    ) {
      u.hostname = "noai.duckduckgo.com";
      location.replace(u.toString());
      return true;
    }
    return false;
  }

  function onUrlMaybeChanged(): void {
    if (location.href === lastHref) return;
    lastHref = location.href;
    if (checkBlock()) return;
    if (maybeRedirect()) return;
    schedule();
  }

  function startWatching(): void {
    if (!observer) {
      observer = new MutationObserver(schedule);
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
    if (urlTimer === undefined) {
      // SPA-navigation (pushState) giver ingen event til indholdsscripts. Billig polling.
      urlTimer = window.setInterval(onUrlMaybeChanged, 500);
    }
    window.addEventListener("popstate", onUrlMaybeChanged);
  }

  function applyAll(firstRun: boolean): void {
    unhideAll();
    lastHref = location.href;
    const blocked = checkBlock();
    if (blocked && firstRun) {
      // Stop indlæsningen af chat-appen. Spærreskærmen ligger allerede i DOM'en.
      try {
        window.stop();
      } catch {
        /* ignorer */
      }
    }
    if (!blocked && maybeRedirect()) return;
    schedule();
  }

  async function init(): Promise<void> {
    try {
      eff = await KS.store.readEffective();
    } catch {
      eff = { policy: KS.policy.defaults(navigator.language), locked: false, managed: false };
    }
    applyAll(true);
    startWatching();

    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !("effective" in changes)) return;
      void KS.store.readEffective().then((next) => {
        eff = next;
        applyAll(false);
      });
    });
  }

  void init();
})();
