// Ren matching-logik uden browser-API'er, så den kan testes i Node.
(() => {
  /**
   * Præcis host eller subdomæne. Aldrig substring.
   * Regression: "netflix.com" må ikke matche "x.com".
   */
  function hostMatches(host: string, domain: string): boolean {
    const h = host.toLowerCase().replace(/\.$/, "");
    const d = domain.toLowerCase().replace(/\.$/, "");
    if (!h || !d) return false;
    return h === d || h.endsWith("." + d);
  }

  function hostMatchesAny(host: string, domains: readonly string[]): boolean {
    return domains.some((d) => hostMatches(host, d));
  }

  /** Sti-præfiks på segmentgrænse: "/chat" matcher "/chat" og "/chat/x", ikke "/chatty". */
  function pathMatches(path: string, prefix: string): boolean {
    if (prefix === "/" || prefix === "") return true;
    const p = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
    return path === p || path.startsWith(p + "/");
  }

  function ruleMatches(url: URL, rule: ChatRule): boolean {
    if (!hostMatchesAny(url.hostname, rule.domains)) return false;
    if (rule.paths && rule.paths.length > 0) {
      if (!rule.paths.some((p) => pathMatches(url.pathname, p))) return false;
    }
    if (rule.query) {
      for (const [k, v] of Object.entries(rule.query)) {
        if (url.searchParams.get(k) !== v) return false;
      }
    }
    return true;
  }

  function buildFallback(url: URL, spec: FallbackSpec | undefined): string | null {
    if (!spec) return null;
    let target: URL;
    try {
      target = new URL(spec.base, url.origin);
    } catch {
      return null;
    }
    if (target.protocol !== "https:" && target.protocol !== "http:") return null;
    if (spec.param && spec.source) {
      const q = url.searchParams.get(spec.source);
      if (q) target.searchParams.set(spec.param, q);
    }
    if (spec.extra) {
      for (const [k, v] of Object.entries(spec.extra)) target.searchParams.set(k, v);
    }
    return target.toString();
  }

  /**
   * Klatrer op fra en AI-overskrift og returnerer den største forfader, som
   * ikke indeholder almindelige søgeresultater og ikke er en stop-container.
   * Returnerer null hvis selv den nærmeste forælder indeholder resultater.
   */
  function climbToContainer<T extends { parentElement: T | null }>(
    start: T,
    isStop: (el: T) => boolean,
    hasOrganic: (el: T) => boolean,
    maxDepth: number
  ): T | null {
    let best: T | null = null;
    let node: T | null = start.parentElement;
    let depth = 0;
    while (node && depth < maxDepth) {
      if (isStop(node) || hasOrganic(node)) break;
      best = node;
      node = node.parentElement;
      depth++;
    }
    return best;
  }

  const DOMAIN_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

  function normalizeDomain(input: string): string | null {
    const raw = input.trim().toLowerCase();
    if (!raw || /\s/.test(raw)) return null;
    let host: string;
    try {
      host = new URL(raw.includes("://") ? raw : `https://${raw}`).hostname;
    } catch {
      return null;
    }
    host = host.replace(/\.$/, "").replace(/^www\./, "");
    return DOMAIN_RE.test(host) ? host : null;
  }

  function normalizeText(s: string): string {
    return s.replace(/\s+/g, " ").trim().toLowerCase();
  }

  /** Præcis match, eller overskrift der starter med teksten og kun har lidt ekstra (fx "AI Overview Learn more"). */
  function headingMatches(text: string, wanted: readonly string[]): boolean {
    const t = normalizeText(text);
    if (!t || t.length > 80) return false;
    return wanted.some((w) => {
      const n = normalizeText(w);
      return t === n || (t.startsWith(n + " ") && t.length <= n.length + 24);
    });
  }

  KS.match = {
    hostMatches,
    hostMatchesAny,
    pathMatches,
    ruleMatches,
    buildFallback,
    climbToContainer,
    normalizeText,
    normalizeDomain,
    headingMatches,
  };
})();
