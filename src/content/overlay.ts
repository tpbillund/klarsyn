// Spærreskærm for AI-chat-sider.
// <dialog> + showModal() giver "top layer" og gør resten af siden inaktiv.
// <dialog> understøtter ikke attachShadow, så en <div> indeni bærer shadow root.
// CSS lægges via constructable stylesheets (ikke påvirket af sidens CSP), med <style> som reserve.
(() => {
  const CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.wrap {
  --bg: #f4f7f6; --card: #ffffff; --text: #0f1f1d; --muted: #4b5d5a; --accent: #0f766e;
  --accent-text: #ffffff; --border: #d9e3e1; --shadow: 0 20px 60px rgba(15, 40, 38, 0.18);
  position: fixed; inset: 0; display: grid; place-items: center; padding: 24px;
  background: var(--bg); color: var(--text);
  font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
@media (prefers-color-scheme: dark) {
  .wrap { --bg: #0b1514; --card: #13201e; --text: #e6f0ee; --muted: #9fb3af; --accent: #2dd4bf;
    --accent-text: #062522; --border: #24403c; --shadow: 0 20px 60px rgba(0, 0, 0, 0.5); }
}
.card {
  width: min(460px, 100%); background: var(--card); border: 1px solid var(--border);
  border-radius: 20px; padding: 36px 32px 28px; text-align: center; box-shadow: var(--shadow);
}
svg { width: 72px; height: 72px; display: block; margin: 0 auto 18px; }
h1 { font-size: 22px; line-height: 1.3; margin: 0 0 10px; font-weight: 700; }
p { margin: 0 0 24px; color: var(--muted); }
.actions { display: flex; flex-direction: column; gap: 10px; }
a, button {
  font: inherit; font-weight: 600; border-radius: 12px; padding: 12px 18px; cursor: pointer;
  text-decoration: none; border: 1px solid var(--border); background: transparent; color: var(--text);
}
a.primary { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }
a:focus-visible, button:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
.brand { margin-top: 22px; font-size: 13px; color: var(--muted); }
`;

  const SVG_NS = "http://www.w3.org/2000/svg";
  let dialog: HTMLDialogElement | null = null;
  let wanted = false;
  let watchTimer: number | undefined;

  function svgEl(tag: string, attrs: Record<string, string>): SVGElement {
    const n = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  }

  function logo(): SVGElement {
    const svg = svgEl("svg", { viewBox: "0 0 128 128", "aria-hidden": "true" });
    svg.append(
      svgEl("rect", { width: "128", height: "128", rx: "30", fill: "#0F766E" }),
      svgEl("circle", { cx: "55", cy: "55", r: "29", fill: "none", stroke: "#fff", "stroke-width": "11" }),
      svgEl("line", { x1: "77", y1: "77", x2: "101", y2: "101", stroke: "#fff", "stroke-width": "14", "stroke-linecap": "round" }),
      svgEl("path", {
        d: "M55 37 C56.6 48.5 61.5 53.4 73 55 C61.5 56.6 56.6 61.5 55 73 C53.4 61.5 48.5 56.6 37 55 C48.5 53.4 53.4 48.5 55 37 Z",
        fill: "#fff",
      }),
      svgEl("line", { x1: "39", y1: "71", x2: "71", y2: "39", stroke: "#0F766E", "stroke-width": "9", "stroke-linecap": "round" }),
      svgEl("line", { x1: "39", y1: "71", x2: "71", y2: "39", stroke: "#FCD34D", "stroke-width": "5", "stroke-linecap": "round" })
    );
    return svg;
  }

  function addStyles(shadow: ShadowRoot): void {
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(CSS);
      shadow.adoptedStyleSheets = [sheet];
      return;
    } catch {
      // Reserve: fx Firefox-indholdsscripts, hvor adoptedStyleSheets kan fejle.
    }
    const style = document.createElement("style");
    style.textContent = CSS;
    shadow.append(style);
  }

  function important(el: HTMLElement, props: Record<string, string>): void {
    for (const [k, v] of Object.entries(props)) el.style.setProperty(k, v, "important");
  }

  function build(lang: Lang, fallbackUrl: string | null): HTMLDialogElement {
    const t = (k: string) => KS.i18n.t(lang, k);
    const d = document.createElement("dialog");
    d.setAttribute("data-klarsyn-overlay", "1");
    d.setAttribute("aria-label", t("blockTitle"));
    important(d, {
      position: "fixed", inset: "0", width: "100vw", height: "100vh", "max-width": "none",
      "max-height": "none", margin: "0", padding: "0", border: "0", background: "transparent",
      display: "block", "z-index": "2147483647", overflow: "hidden",
    });

    const host = document.createElement("div");
    important(host, { position: "fixed", inset: "0", display: "block" });
    const shadow = host.attachShadow({ mode: "closed" });
    addStyles(shadow);

    const title = document.createElement("h1");
    title.textContent = t("blockTitle");
    const text = document.createElement("p");
    text.textContent = t("blockText");

    const actions = document.createElement("div");
    actions.className = "actions";
    if (fallbackUrl) {
      const go = document.createElement("a");
      go.className = "primary";
      go.href = fallbackUrl;
      go.textContent = t("blockSearch");
      actions.append(go);
    }
    const back = document.createElement("button");
    back.type = "button";
    back.textContent = t("blockBack");
    back.addEventListener("click", () => history.back());
    actions.append(back);

    const brand = document.createElement("div");
    brand.className = "brand";
    brand.textContent = "Klarsyn";

    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("role", "document");
    card.append(logo(), title, text, actions, brand);

    const wrap = document.createElement("div");
    wrap.className = "wrap";
    wrap.append(card);
    shadow.append(wrap);
    d.append(host);

    // Escape må ikke lukke spærreskærmen.
    d.addEventListener("cancel", (e) => e.preventDefault());
    d.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
    // Chrome kan lukke en dialog ved gentaget Escape trods preventDefault. Åbn den igen.
    d.addEventListener("close", () => {
      if (wanted) reopen();
    });
    return d;
  }

  function reopen(): void {
    if (!dialog) return;
    if (!dialog.isConnected) (document.body ?? document.documentElement).append(dialog);
    if (!dialog.open) {
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute("open", "");
      }
    }
    important(document.documentElement, { overflow: "hidden" });
  }

  function show(opts: { lang: Lang; fallbackUrl: string | null }): void {
    wanted = true;
    if (dialog) {
      dialog.remove();
      dialog = null;
    }
    dialog = build(opts.lang, opts.fallbackUrl);
    reopen();
    // Siden kan fjerne vores element (SPA'er der genbygger DOM). Sæt det tilbage.
    if (watchTimer === undefined) {
      watchTimer = window.setInterval(() => {
        if (wanted && dialog && (!dialog.isConnected || !dialog.open)) reopen();
      }, 400);
    }
  }

  function hide(): void {
    wanted = false;
    if (watchTimer !== undefined) {
      window.clearInterval(watchTimer);
      watchTimer = undefined;
    }
    if (dialog) {
      dialog.close();
      dialog.remove();
      dialog = null;
    }
    document.documentElement.style.removeProperty("overflow");
  }

  function isShown(): boolean {
    return wanted;
  }

  KS.overlay = { show, hide, isShown };
})();
