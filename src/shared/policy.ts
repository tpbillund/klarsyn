// Standardpolitik, migrering og central (managed) konfiguration. Ren logik.
(() => {
  /**
   * Hæv dette tal når nye felter/kategorier kommer til. migrate() tilføjer
   * altid manglende kategorier med deres standardværdi, uanset version, så
   * eksisterende brugere også får nye kategorier. Eksisterende valg bevares.
   */
  const SCHEMA_VERSION = 2; // 2: customBlockedDomains
  const MAX_CUSTOM_DOMAINS = 200;

  /** Gyldige, normaliserede og unikke domæner. Alt andet ignoreres. */
  function cleanDomainList(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    const out: string[] = [];
    for (const v of raw) {
      if (typeof v !== "string") continue;
      const d = KS.match.normalizeDomain(v);
      if (d && !out.includes(d)) out.push(d);
      if (out.length >= MAX_CUSTOM_DOMAINS) break;
    }
    return out;
  }

  function pickLang(uiLang?: string): Lang {
    return uiLang && uiLang.toLowerCase().startsWith("da") ? "da" : "en";
  }

  function defaultCategories(): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    for (const c of KS.rules.categories) out[c.id] = c.defaultOn;
    return out;
  }

  function defaults(uiLang?: string): Policy {
    return {
      schemaVersion: SCHEMA_VERSION,
      enabled: true,
      categories: defaultCategories(),
      language: pickLang(uiLang),
      theme: "auto",
      googleForceWeb: false,
      ddgUseNoAi: true,
      customBlockedDomains: [],
    };
  }

  function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
  }

  function isLang(v: unknown): v is Lang {
    return v === "da" || v === "en";
  }

  function isTheme(v: unknown): v is Theme {
    return v === "auto" || v === "light" || v === "dark";
  }

  function migrate(stored: unknown, uiLang?: string): Policy {
    const base = defaults(uiLang);
    if (!isRecord(stored)) return base;

    const categories = { ...base.categories };
    if (isRecord(stored.categories)) {
      for (const [k, v] of Object.entries(stored.categories)) {
        // Kun kendte kategorier, og kun booleans. Ukendte (udgåede) droppes.
        if (k in categories && typeof v === "boolean") categories[k] = v;
      }
    }

    return {
      schemaVersion: SCHEMA_VERSION,
      enabled: typeof stored.enabled === "boolean" ? stored.enabled : base.enabled,
      categories,
      language: isLang(stored.language) ? stored.language : base.language,
      theme: isTheme(stored.theme) ? stored.theme : base.theme,
      googleForceWeb: typeof stored.googleForceWeb === "boolean" ? stored.googleForceWeb : base.googleForceWeb,
      ddgUseNoAi: typeof stored.ddgUseNoAi === "boolean" ? stored.ddgUseNoAi : base.ddgUseNoAi,
      customBlockedDomains: cleanDomainList(stored.customBlockedDomains),
    };
  }

  function sanitizeManaged(raw: unknown): ManagedConfig {
    const out: ManagedConfig = {};
    if (!isRecord(raw)) return out;
    if (typeof raw.enabled === "boolean") out.enabled = raw.enabled;
    if (isLang(raw.language)) out.language = raw.language;
    if (typeof raw.googleForceWeb === "boolean") out.googleForceWeb = raw.googleForceWeb;
    if (typeof raw.ddgUseNoAi === "boolean") out.ddgUseNoAi = raw.ddgUseNoAi;
    if (typeof raw.lockSettings === "boolean") out.lockSettings = raw.lockSettings;
    if (Array.isArray(raw.customBlockedDomains)) out.customBlockedDomains = cleanDomainList(raw.customBlockedDomains);
    if (isRecord(raw.categories)) {
      const known = new Set(KS.rules.categories.map((c) => c.id));
      const cats: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(raw.categories)) {
        if (known.has(k) && typeof v === "boolean") cats[k] = v;
      }
      out.categories = cats;
    }
    return out;
  }

  function applyManaged(policy: Policy, managed: ManagedConfig): Effective {
    const hasAny = Object.keys(managed).length > 0;
    const p: Policy = { ...policy, categories: { ...policy.categories }, customBlockedDomains: [...policy.customBlockedDomains] };
    if (managed.enabled !== undefined) p.enabled = managed.enabled;
    if (managed.language !== undefined) p.language = managed.language;
    if (managed.googleForceWeb !== undefined) p.googleForceWeb = managed.googleForceWeb;
    if (managed.ddgUseNoAi !== undefined) p.ddgUseNoAi = managed.ddgUseNoAi;
    if (managed.categories) Object.assign(p.categories, managed.categories);
    if (managed.customBlockedDomains) {
      p.customBlockedDomains = cleanDomainList([...managed.customBlockedDomains, ...p.customBlockedDomains]);
    }
    return { policy: p, locked: managed.lockSettings === true, managed: hasAny };
  }

  KS.policy = { SCHEMA_VERSION, MAX_CUSTOM_DOMAINS, cleanDomainList, defaults, migrate, sanitizeManaged, applyManaged };
})();
