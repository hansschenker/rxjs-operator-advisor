/** Tiny, framework-less DOM helpers for the advisor UI. */

type Attrs = Record<string, string | number | boolean>;
type Child = Node | string | null | undefined | false;

/** Hyperscript-style element factory: `h("button", { class: "chip" }, "text")`. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Attrs | null,
  children?: Child[] | Child,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (key === "class") el.className = String(value);
      else el.setAttribute(key, String(value));
    }
  }
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child === null || child === undefined || child === false) continue;
    el.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return el;
}

/** Remove all children of a node. */
export function clear(node: HTMLElement): void {
  node.replaceChildren();
}

/** Copy text to the clipboard, resolving to whether it succeeded. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
