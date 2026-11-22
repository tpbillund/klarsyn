// Baggrund. Chrome/Edge: service worker (importScripts). Firefox: background.scripts.
// Opgaver: migrering af politik ved installation/opdatering, og beregning af den
// effektive politik (lokal + central) som indholdsscripts læser.
(() => {
  if (typeof importScripts === "function") {
    importScripts(
      "/vendor/browser-polyfill.min.js",
      "/shared/ns.js",
      "/shared/match.js",
      "/shared/rules.js",
      "/shared/policy.js",
      "/shared/store.js"
    );
  }

  async function migrateAndCompute(): Promise<Effective> {
    // migrate() tilføjer nye kategorier med standardværdi og bevarer eksisterende valg.
    const policy = await KS.store.readSyncPolicy();
    await KS.store.writeSyncPolicy(policy);
    return KS.store.computeEffective();
  }

  browser.runtime.onInstalled.addListener((details) => {
    void migrateAndCompute().then((eff) => {
      // Vis indstillinger ved første installation, men ikke ved central udrulning.
      if (details.reason === "install" && !eff.managed) {
        void browser.runtime.openOptionsPage().catch(() => undefined);
      }
    });
  });

  browser.runtime.onStartup.addListener(() => {
    void KS.store.computeEffective();
  });

  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "managed" || (area === "sync" && "policy" in changes)) {
      void KS.store.computeEffective();
    }
  });
})();
