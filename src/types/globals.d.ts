// Globale typer for Klarsyn. Ingen bundler: alle filer er almindelige scripts,
// og deler data via det globale objekt `KS`, som oprettes i shared/ns.ts.

declare const browser: import("webextension-polyfill").Browser;
// Findes kun i service workers (Chrome/Edge baggrund). Tjekkes med typeof.
declare function importScripts(...urls: string[]): void;

type Lang = "da" | "en";
type Theme = "auto" | "light" | "dark";

interface Policy {
  schemaVersion: number;
  enabled: boolean;
  /** Kategori-id (fx "google.answers") -> til/fra. */
  categories: Record<string, boolean>;
  language: Lang;
  theme: Theme;
  /** Send almindelige Google-søgninger til "Web"-visningen (udm=14). */
  googleForceWeb: boolean;
  /** Send DuckDuckGo-søgninger til noai.duckduckgo.com. */
  ddgUseNoAi: boolean;
  /** Admins egne domæner, der blokeres af browseren (declarativeNetRequest). */
  customBlockedDomains: string[];
}

/** Det en admin kan sætte via storage.managed (Chrome/Edge politik, Firefox policies.json). */
interface ManagedConfig {
  enabled?: boolean;
  categories?: Record<string, boolean>;
  language?: Lang;
  googleForceWeb?: boolean;
  ddgUseNoAi?: boolean;
  lockSettings?: boolean;
  /** Lægges oven i brugerens egne domæner og kan ikke fjernes lokalt. */
  customBlockedDomains?: string[];
}

interface Effective {
  policy: Policy;
  /** true hvis indstillinger er låst af central politik. */
  locked: boolean;
  /** true hvis der findes central (managed) konfiguration. */
  managed: boolean;
}

type CategoryKind = "answers" | "chat";

interface Category {
  id: string;
  engineId: string;
  kind: CategoryKind;
  defaultOn: boolean;
}

interface FallbackSpec {
  /** Absolut URL, eller en sti der starter med "/" (samme origin som den blokerede side). */
  base: string;
  /** Navn på søgeparameter i fallback-URL'en (fx "q"). */
  param?: string;
  /** Navn på parameteren i den blokerede URL, som søgeteksten hentes fra. */
  source?: string;
  extra?: Record<string, string>;
}

interface ChatRule {
  domains: string[];
  /** Stier der matches på segmentgrænse ("/chat" matcher "/chat/x", ikke "/chatty"). */
  paths?: string[];
  /** Alle angivne parametre skal have præcis denne værdi. */
  query?: Record<string, string>;
  fallback?: FallbackSpec;
  /** true hvis reglen er bekræftet via officiel/uafhængig kilde, false = bedste bud. */
  verified: boolean;
}

interface AnswersSpec {
  domains: string[];
  /** Stier hvor AI-svar-filteret kører. Tom liste = alle stier. */
  paths: string[];
  /** CSS-selektorer, der skjules direkte. Bedste bud, skal testes i rigtig browser. */
  hideSelectors: string[];
  /** Overskrifter (præcis tekst) der markerer en AI-boks. */
  headingTexts: string[];
  /** Selektorer for almindelige søgeresultater. En AI-boks må aldrig indeholde dem. */
  organicSelectors: string[];
  /** Containere vi aldrig klatrer forbi. */
  stopSelectors: string[];
}

interface Engine {
  id: string;
  name: string;
  answers: AnswersSpec | null;
  chat: ChatRule[];
  /** Links/knapper der fører til AI-chat. Skjules når chat-kategorien er slået til. */
  chatEntrySelectors: string[];
}

interface MatchApi {
  hostMatches(host: string, domain: string): boolean;
  hostMatchesAny(host: string, domains: readonly string[]): boolean;
  pathMatches(path: string, prefix: string): boolean;
  ruleMatches(url: URL, rule: ChatRule): boolean;
  buildFallback(url: URL, spec: FallbackSpec | undefined): string | null;
  climbToContainer<T extends { parentElement: T | null }>(
    start: T,
    isStop: (el: T) => boolean,
    hasOrganic: (el: T) => boolean,
    maxDepth: number
  ): T | null;
  normalizeText(s: string): string;
  /** "https://www.Manus.im/app" -> "manus.im". null hvis ugyldigt. */
  normalizeDomain(input: string): string | null;
  headingMatches(text: string, wanted: readonly string[]): boolean;
}

interface RulesApi {
  engines: readonly Engine[];
  categories: readonly Category[];
  /** Pseudo-motor for generelle AI-chattjenester (ChatGPT, Gemini osv.). */
  general: Engine;
  /** Alle URL-mønstre content-scriptet skal køre på. Holdes i sync med manifesterne (testes). */
  contentMatches: readonly string[];
  engineForAnswers(url: URL): Engine | null;
  blockingRule(url: URL, isOn: (categoryId: string) => boolean): { rule: ChatRule; category: string } | null;
  engineByHost(host: string): Engine | null;
}

interface PolicyApi {
  SCHEMA_VERSION: number;
  MAX_CUSTOM_DOMAINS: number;
  cleanDomainList(raw: unknown): string[];
  defaults(uiLang?: string): Policy;
  migrate(stored: unknown, uiLang?: string): Policy;
  sanitizeManaged(raw: unknown): ManagedConfig;
  applyManaged(policy: Policy, managed: ManagedConfig): Effective;
}

interface I18nApi {
  dict: Record<Lang, Record<string, string>>;
  t(lang: Lang, key: string, vars?: Record<string, string>): string;
  apply(root: ParentNode, lang: Lang): void;
}

interface PinRecord {
  salt: string;
  hash: string;
  iterations: number;
}

interface PinApi {
  isValidPin(pin: string): boolean;
  create(pin: string): Promise<PinRecord>;
  verify(pin: string, rec: PinRecord): Promise<boolean>;
}

interface StoreApi {
  readSyncPolicy(): Promise<Policy>;
  writeSyncPolicy(p: Policy): Promise<void>;
  readManaged(): Promise<ManagedConfig>;
  computeEffective(): Promise<Effective>;
  readEffective(): Promise<Effective>;
  readPin(): Promise<PinRecord | null>;
  /** Opdaterer browserens blokeringsregler for egne domæner. */
  syncBlockRules(eff: Effective): Promise<void>;
  writePin(rec: PinRecord | null): Promise<void>;
}

interface UiApi {
  applyTheme(theme: Theme): void;
  el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attrs?: Record<string, string>,
    children?: (Node | string)[]
  ): HTMLElementTagNameMap[K];
  byId<T extends HTMLElement>(id: string): T;
}

interface OverlayApi {
  show(opts: { lang: Lang; fallbackUrl: string | null }): void;
  hide(): void;
  isShown(): boolean;
}

interface KSNamespace {
  match: MatchApi;
  rules: RulesApi;
  policy: PolicyApi;
  i18n: I18nApi;
  pin: PinApi;
  store: StoreApi;
  ui: UiApi;
  overlay: OverlayApi;
}

declare var KS: KSNamespace;
