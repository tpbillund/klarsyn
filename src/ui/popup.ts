// Pop-op: status, hovedkontakt (PIN-beskyttet ved slukning) og status for aktuel side.
(() => {
  const MAX_TRIES = 5;
  const LOCKOUT_MS = 30_000;
  let tries = 0;
  let lockedUntil = 0;

  let eff: Effective;
  let managed: ManagedConfig;
  let pin: PinRecord | null;
  let lang: Lang = "da";

  const t = (k: string, v?: Record<string, string>) => KS.i18n.t(lang, k, v);
  const $ = KS.ui.byId;

  async function load(): Promise<void> {
    [eff, managed, pin] = await Promise.all([KS.store.readEffective(), KS.store.readManaged(), KS.store.readPin()]);
    lang = eff.policy.language;
  }

  function renderStatus(): void {
    KS.ui.applyTheme(eff.policy.theme);
    KS.i18n.apply(document, lang);

    const pill = $("statusPill");
    pill.textContent = eff.policy.enabled ? t("statusOn") : t("statusOff");
    pill.classList.toggle("off", !eff.policy.enabled);
    $("managedPill").classList.toggle("hidden", !eff.managed);

    const master = $<HTMLInputElement>("master");
    master.checked = eff.policy.enabled;
    master.disabled = eff.locked || managed.enabled !== undefined;

    document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
      b.disabled = eff.locked || managed.language !== undefined;
    });
  }

  function row(label: string, on: boolean, onText: string, offText: string): HTMLLIElement {
    const tag = KS.ui.el("span", { class: on ? "tag on" : "tag" }, [on ? onText : offText]);
    return KS.ui.el("li", {}, [KS.ui.el("span", {}, [label]), tag]);
  }

  async function renderSite(): Promise<void> {
    const rows = $("siteRows");
    rows.replaceChildren();
    let url: URL | null = null;
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) url = new URL(tab.url);
    } catch {
      url = null;
    }
    const engine = url && /^https?:$/.test(url.protocol) ? KS.rules.engineByHost(url.hostname) : null;
    $("siteHost").textContent = url && /^https?:$/.test(url.protocol) ? url.hostname : "";
    $("siteUnknown").classList.toggle("hidden", !!engine);
    if (!engine) return;

    const on = (c: string) => eff.policy.enabled && eff.policy.categories[c] === true;
    if (engine.answers) {
      rows.append(row(t("siteAnswers"), on(`${engine.id}.answers`), t("valHidden"), t("valShown")));
    }
    rows.append(row(t("siteChat"), on(`${engine.id}.chat`), t("valBlocked"), t("valAllowed")));
  }

  async function savePolicy(mutate: (p: Policy) => void): Promise<void> {
    const p = await KS.store.readSyncPolicy();
    mutate(p);
    await KS.store.writeSyncPolicy(p);
    // Beregn straks, så pop-op'en ikke venter på baggrunden.
    eff = await KS.store.computeEffective();
    lang = eff.policy.language;
    renderStatus();
    await renderSite();
    $("reloadHint").classList.remove("hidden");
  }

  function showPin(show: boolean): void {
    $("pinBox").classList.toggle("hidden", !show);
    $("pinMsg").textContent = "";
    const input = $<HTMLInputElement>("pinInput");
    input.value = "";
    if (show) input.focus();
  }

  function wire(): void {
    const master = $<HTMLInputElement>("master");
    master.addEventListener("change", () => {
      const wantOn = master.checked;
      if (!wantOn && pin) {
        master.checked = true; // Rul tilbage, indtil PIN er bekræftet.
        showPin(true);
        return;
      }
      void savePolicy((p) => {
        p.enabled = wantOn;
      });
    });

    $("pinCancel").addEventListener("click", () => showPin(false));

    $<HTMLFormElement>("pinBox").addEventListener("submit", (e) => {
      e.preventDefault();
      void (async () => {
        const msg = $("pinMsg");
        const now = Date.now();
        if (now < lockedUntil) {
          msg.textContent = t("pinLockedOut", { s: String(Math.ceil((lockedUntil - now) / 1000)) });
          return;
        }
        const value = $<HTMLInputElement>("pinInput").value;
        if (pin && (await KS.pin.verify(value, pin))) {
          tries = 0;
          showPin(false);
          await savePolicy((p) => {
            p.enabled = false;
          });
          return;
        }
        tries++;
        if (tries >= MAX_TRIES) {
          tries = 0;
          lockedUntil = Date.now() + LOCKOUT_MS;
          msg.textContent = t("pinLockedOut", { s: String(LOCKOUT_MS / 1000) });
        } else {
          msg.textContent = t("pinWrong");
        }
      })();
    });

    document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => {
      b.addEventListener("click", () => {
        const next = b.dataset.lang === "en" ? "en" : "da";
        void savePolicy((p) => {
          p.language = next;
        }).then(() => $("reloadHint").classList.add("hidden"));
      });
    });

    $("openOptions").addEventListener("click", () => {
      void browser.runtime.openOptionsPage();
      window.close();
    });
  }

  void (async () => {
    await load();
    renderStatus();
    await renderSite();
    wire();
  })();
})();
