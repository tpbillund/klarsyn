// Opretter det delte, globale navnerum. Skal indlæses før alle andre Klarsyn-filer.
(() => {
  const g = globalThis as unknown as { KS?: KSNamespace };
  if (!g.KS) {
    g.KS = {} as KSNamespace;
  }
})();
