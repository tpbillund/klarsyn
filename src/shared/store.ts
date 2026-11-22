// Lagring. Politik i storage.sync, beregnet "effektiv" politik i storage.local,
// central konfiguration læses fra storage.managed. Ingen netværkskald.
(() => {
  const POLICY_KEY = "policy";
  const PIN_KEY = "adminPin";
  const EFFECTIVE_KEY = "effective";

  function uiLang(): string {
    try {
      return browser.i18n.getUILanguage();
    } catch {
      return "en";
    }
  }

  async function readSyncPolicy(): Promise<Policy> {
    const got = await browser.storage.sync.get(POLICY_KEY);
    return KS.policy.migrate(got[POLICY_KEY], uiLang());
  }

  async function writeSyncPolicy(p: Policy): Promise<void> {
    await browser.storage.sync.set({ [POLICY_KEY]: p });
  }

  async function readManaged(): Promise<ManagedConfig> {
    try {
      // Firefox kaster en fejl, hvis der ikke er nogen managed-konfiguration.
      const got = await browser.storage.managed.get(null);
      return KS.policy.sanitizeManaged(got);
    } catch {
      return {};
    }
  }

  const BLOCK_RULE_ID = 1;

  /**
   * Egne domæner blokeres af browseren selv (declarativeNetRequest, handlingen "block").
   * Kræver ingen adgang til websiderne. Findes ikke i indholdsscripts, derfor try/catch.
   */
  async function syncBlockRules(eff: Effective): Promise<void> {
    const dnr = browser.declarativeNetRequest as typeof browser.declarativeNetRequest | undefined;
    if (!dnr || typeof dnr.updateDynamicRules !== "function") return;
    try {
      const existing = await dnr.getDynamicRules();
      const domains = eff.policy.enabled ? eff.policy.customBlockedDomains : [];
      await dnr.updateDynamicRules({
        removeRuleIds: existing.map((r) => r.id),
        addRules:
          domains.length === 0
            ? []
            : [
                {
                  id: BLOCK_RULE_ID,
                  priority: 1,
                  action: { type: "block" },
                  condition: { requestDomains: domains, resourceTypes: ["main_frame", "sub_frame"] },
                },
              ],
      });
    } catch {
      /* Ikke tilgængelig i denne kontekst. */
    }
  }

  async function computeEffective(): Promise<Effective> {
    const [policy, managed] = await Promise.all([readSyncPolicy(), readManaged()]);
    const eff = KS.policy.applyManaged(policy, managed);
    await browser.storage.local.set({ [EFFECTIVE_KEY]: eff });
    await syncBlockRules(eff);
    return eff;
  }

  function isEffective(v: unknown): v is Effective {
    return typeof v === "object" && v !== null && "policy" in v && "locked" in v;
  }

  async function readEffective(): Promise<Effective> {
    const got = await browser.storage.local.get(EFFECTIVE_KEY);
    const v: unknown = got[EFFECTIVE_KEY];
    if (isEffective(v)) {
      // Kør altid gennem migrate, så nye kategorier også virker før baggrunden har kørt.
      return { ...v, policy: KS.policy.migrate(v.policy, uiLang()) };
    }
    return computeEffective();
  }

  async function readPin(): Promise<PinRecord | null> {
    const got = await browser.storage.sync.get(PIN_KEY);
    const v: unknown = got[PIN_KEY];
    if (typeof v === "object" && v !== null && "hash" in v && "salt" in v && "iterations" in v) {
      return v as PinRecord;
    }
    return null;
  }

  async function writePin(rec: PinRecord | null): Promise<void> {
    if (rec) await browser.storage.sync.set({ [PIN_KEY]: rec });
    else await browser.storage.sync.remove(PIN_KEY);
  }

  KS.store = { readSyncPolicy, writeSyncPolicy, readManaged, computeEffective, readEffective, readPin, writePin, syncBlockRules };
})();
