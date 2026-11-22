// Indstillingsside. Låses af admin-PIN og/eller central politik (storage.managed).
(() => {
  const MAX_TRIES = 5;
  const LOCKOUT_MS = 30_000;

  let policy: Policy;
  let eff: Effective;
  let managed: ManagedConfig;
  let pin: PinRecord | null = null;
  let unlocked = false;
  let tries = 0;
  let lockedUntil = 0;
  let toastTimer: number | undefined;

  const $ = KS.ui.byId;
  const el = KS.ui.el;
  const lang = (): Lang => eff.policy.language;
  const t = (k: string, v?: Record<string, string>) => KS.i18n.t(lang(), k, v);

  async function load(): Promise<void> {
    [policy, managed, pin] = await Promise.all([KS.store.readSyncPolicy(), KS.store.readManaged(), KS.store.readPin()]);
    eff = KS.policy.applyManaged(policy, managed);
    if (!pin) unlocked = true;
  }

  function baseEditable(): boolean {
    return !eff.locked && unlocked;
  }

  function fieldEditable(field: keyof ManagedConfig): boolean {
    return baseEditable() && managed[field] === undefined;
  }

  function categoryEditable(id: string): boolean {
    return baseEditable() && !(managed.categories && id in managed.categories);
  }

  function toast(text: string): void {
    const node = $("toast");
    node.textContent = text;
    node.classList.add("show");
    if (toastTimer !== undefined) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => node.classList.remove("show"), 1600);
  }

  async function save(mutate: (p: Policy) => void): Promise<void> {
    mutate(policy);
    await KS.store.writeSyncPolicy(policy);
    eff = await KS.store.computeEffective();
    render();
    toast(t("saved"));
  }

  function makeSwitch(label: string, checked: boolean, disabled: boolean, onChange: (v: boolean) => void): HTMLElement {
    const input = el("input", { type: "checkbox", role: "switch", "aria-label": label });
    input.checked = checked;
    input.disabled = disabled;
    input.addEventListener("change", () => onChange(input.checked));
    return el("span", { class: "switch" }, [input, el("span", { class: "track" })]);
  }

  function renderEngines(): void {
    const rows = $("engineRows");
    rows.replaceChildren();
    for (const engine of KS.rules.engines) {
      const ansId = `${engine.id}.answers`;
      const chatId = `${engine.id}.chat`;
      const name = el("span", { class: "engine-name", role: "cell" }, [
        el("span", { class: "engine-dot", "aria-hidden": "true" }, [engine.name.charAt(0)]),
        engine.name,
      ]);
      const ans = engine.answers
        ? makeSwitch(`${engine.name}: ${t("colAnswers")}`, eff.policy.categories[ansId] === true, !categoryEditable(ansId), (v) =>
            void save((p) => {
              p.categories[ansId] = v;
            })
          )
        : el("span", { class: "na" }, ["-"]);
      const chat = makeSwitch(`${engine.name}: ${t("colChat")}`, eff.policy.categories[chatId] === true, !categoryEditable(chatId), (v) =>
        void save((p) => {
          p.categories[chatId] = v;
        })
      );
      ans.setAttribute("role", "cell");
      chat.setAttribute("role", "cell");
      rows.append(el("div", { class: "grid-row", role: "row" }, [name, ans, chat]));
    }
  }

  function settingRow(titleKey: string, helpKey: string, control: HTMLElement): HTMLElement {
    return el("div", { class: "setting" }, [
      el("div", { class: "setting-text" }, [
        el("span", { class: "setting-title" }, [t(titleKey)]),
        el("span", { class: "setting-help" }, [t(helpKey)]),
      ]),
      control,
    ]);
  }

  function renderExtra(): void {
    const rows = $("extraRows");
    rows.replaceChildren(
      settingRow(
        "optGeneral",
        "optGeneralHelp",
        makeSwitch(t("optGeneral"), eff.policy.categories["general.chat"] === true, !categoryEditable("general.chat"), (v) =>
          void save((p) => {
            p.categories["general.chat"] = v;
          })
        )
      ),
      settingRow(
        "optGoogleWeb",
        "optGoogleWebHelp",
        makeSwitch(t("optGoogleWeb"), eff.policy.googleForceWeb, !fieldEditable("googleForceWeb"), (v) =>
          void save((p) => {
            p.googleForceWeb = v;
          })
        )
      ),
      settingRow(
        "optDdgNoAi",
        "optDdgNoAiHelp",
        makeSwitch(t("optDdgNoAi"), eff.policy.ddgUseNoAi, !fieldEditable("ddgUseNoAi"), (v) =>
          void save((p) => {
            p.ddgUseNoAi = v;
          })
        )
      )
    );
  }

  function renderCustom(): void {
    const list = $("customList");
    list.replaceChildren();
    const fromManaged = new Set(managed.customBlockedDomains ?? []);
    const editable = baseEditable();
    for (const d of eff.policy.customBlockedDomains) {
      const isManaged = fromManaged.has(d);
      const li = el("li", isManaged ? { class: "managed", title: t("customManaged") } : {}, [d]);
      if (!isManaged) {
        const x = el("button", { type: "button", class: "chip-x", "aria-label": t("customRemove", { d }) }, ["\u00d7"]);
        x.disabled = !editable;
        x.addEventListener("click", () =>
          void save((p) => {
            p.customBlockedDomains = p.customBlockedDomains.filter((v) => v !== d);
          })
        );
        li.append(x);
      }
      list.append(li);
    }
    $("customEmpty").classList.toggle("hidden", eff.policy.customBlockedDomains.length > 0);
    $("customForm")
      .querySelectorAll<HTMLInputElement | HTMLButtonElement>("input, button")
      .forEach((n) => {
        n.disabled = !editable;
      });
  }

  function renderSegmented(id: string, value: string, editable: boolean): void {
    $(id)
      .querySelectorAll<HTMLButtonElement>("button")
      .forEach((b) => {
        b.setAttribute("aria-pressed", String(b.dataset.value === value));
        b.disabled = !editable;
      });
  }

  function renderPin(): void {
    $("pinState").textContent = pin ? t("pinIsSet") : t("pinNone");
    const editable = baseEditable();
    $("pinForm")
      .querySelectorAll<HTMLInputElement | HTMLButtonElement>("input, button")
      .forEach((n) => {
        n.disabled = !editable;
      });
    $("pinRemove").classList.toggle("hidden", !pin);
  }

  function render(): void {
    KS.ui.applyTheme(eff.policy.theme);
    KS.i18n.apply(document, lang());

    const pill = $("statusPill");
    pill.textContent = eff.policy.enabled ? t("statusOn") : t("statusOff");
    pill.classList.toggle("off", !eff.policy.enabled);
    $("version").textContent = t("version", { v: browser.runtime.getManifest().version });

    $("managedBanner").classList.toggle("hidden", !eff.managed);
    $("lockBanner").classList.toggle("hidden", !pin || unlocked || eff.locked);

    renderEngines();
    renderExtra();
    renderCustom();
    renderSegmented("langSeg", eff.policy.language, fieldEditable("language"));
    renderSegmented("themeSeg", eff.policy.theme, baseEditable());
    renderPin();
    $<HTMLButtonElement>("reset").disabled = !baseEditable();
  }

  function setMsg(id: string, text: string, kind: "ok" | "err"): void {
    const m = $(id);
    m.textContent = text;
    m.className = `msg ${kind}`;
  }

  function wire(): void {
    $<HTMLFormElement>("lockBanner").addEventListener("submit", (e) => {
      e.preventDefault();
      void (async () => {
        const now = Date.now();
        if (now < lockedUntil) {
          setMsg("unlockMsg", t("pinLockedOut", { s: String(Math.ceil((lockedUntil - now) / 1000)) }), "err");
          return;
        }
        const input = $<HTMLInputElement>("unlockInput");
        if (pin && (await KS.pin.verify(input.value, pin))) {
          unlocked = true;
          tries = 0;
          input.value = "";
          setMsg("unlockMsg", "", "ok");
          render();
          return;
        }
        tries++;
        if (tries >= MAX_TRIES) {
          tries = 0;
          lockedUntil = Date.now() + LOCKOUT_MS;
          setMsg("unlockMsg", t("pinLockedOut", { s: String(LOCKOUT_MS / 1000) }), "err");
        } else {
          setMsg("unlockMsg", t("pinWrong"), "err");
        }
      })();
    });

    $<HTMLFormElement>("customForm").addEventListener("submit", (e) => {
      e.preventDefault();
      if (!baseEditable()) return;
      const input = $<HTMLInputElement>("customInput");
      const d = KS.match.normalizeDomain(input.value);
      if (!d) return setMsg("customMsg", t("customInvalid"), "err");
      if (eff.policy.customBlockedDomains.includes(d)) return setMsg("customMsg", t("customExists"), "err");
      if (policy.customBlockedDomains.length >= KS.policy.MAX_CUSTOM_DOMAINS) return setMsg("customMsg", t("customFull"), "err");
      void save((p) => {
        p.customBlockedDomains = [...p.customBlockedDomains, d];
      }).then(() => {
        input.value = "";
        setMsg("customMsg", t("customAdded", { d }), "ok");
      });
    });

    $("langSeg").addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-value]");
      if (!b || b.disabled) return;
      const v: Lang = b.dataset.value === "en" ? "en" : "da";
      void save((p) => {
        p.language = v;
      });
    });

    $("themeSeg").addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-value]");
      if (!b || b.disabled) return;
      const v = b.dataset.value;
      const theme: Theme = v === "light" || v === "dark" ? v : "auto";
      void save((p) => {
        p.theme = theme;
      });
    });

    $<HTMLFormElement>("pinForm").addEventListener("submit", (e) => {
      e.preventDefault();
      void (async () => {
        const a = $<HTMLInputElement>("pinNew");
        const b = $<HTMLInputElement>("pinRepeat");
        if (!KS.pin.isValidPin(a.value)) return setMsg("pinMsg", t("pinInvalid"), "err");
        if (a.value !== b.value) return setMsg("pinMsg", t("pinMismatch"), "err");
        pin = await KS.pin.create(a.value);
        await KS.store.writePin(pin);
        a.value = "";
        b.value = "";
        setMsg("pinMsg", t("pinSaved"), "ok");
        render();
      })();
    });

    $("pinRemove").addEventListener("click", () => {
      if (!baseEditable()) return;
      void (async () => {
        pin = null;
        await KS.store.writePin(null);
        setMsg("pinMsg", t("pinRemoved"), "ok");
        render();
      })();
    });

    $("reset").addEventListener("click", () => {
      if (!baseEditable()) return;
      const keepLang = policy.language;
      void save((p) => {
        Object.assign(p, KS.policy.defaults(keepLang));
      }).then(() => toast(t("resetDone")));
    });

    // Opdater hvis noget ændres et andet sted (fx pop-op eller central politik).
    browser.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && "effective" in changes) {
        void load().then(render);
      }
    });
  }

  void (async () => {
    await load();
    render();
    wire();
  })();
})();
