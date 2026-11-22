// Små DOM-hjælpere til popup og indstillinger.
(() => {
  function applyTheme(theme: Theme): void {
    const root = document.documentElement;
    if (theme === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }

  function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attrs: Record<string, string> = {},
    children: (Node | string)[] = []
  ): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    for (const c of children) node.append(c);
    return node;
  }

  function byId<T extends HTMLElement>(id: string): T {
    const node = document.getElementById(id);
    if (!node) throw new Error(`Mangler element #${id}`);
    return node as T;
  }

  KS.ui = { applyTheme, el, byId };
})();
