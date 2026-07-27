import type { MarbleDemo, MarbleStream, Marble } from "./marbles.ts";
import { h, clear } from "./render.ts";

/** Total time (seconds) the animation plays out across the whole timeline. */
const ANIM_SECONDS = 1.8;

function marbleNode(m: Marble, maxFrame: number): HTMLElement {
  // Inset the timeline so a frame-0 marble doesn't collide with the row label.
  const left = 4 + (m.frame / (maxFrame + 1)) * 92;
  const delay = (m.frame / maxFrame) * ANIM_SECONDS;
  const style = `left:${left.toFixed(2)}%;animation-delay:${delay.toFixed(2)}s`;
  if (m.kind === "complete") return h("span", { class: "m-bar", style });
  const cls = m.kind === "error" ? "m-dot m-dot--err" : "m-dot";
  return h("span", { class: cls, style }, m.text);
}

function streamRow(stream: MarbleStream, maxFrame: number, extraClass = ""): HTMLElement {
  const track = h(
    "div",
    { class: "m-track" },
    stream.marbles.map((m) => marbleNode(m, maxFrame)),
  );
  return h("div", { class: `m-row ${extraClass}`.trim() }, [
    h("span", { class: "m-label" }, stream.label),
    track,
  ]);
}

function buildDiagram(demo: MarbleDemo): HTMLElement {
  return h("div", { class: "m-diagram" }, [
    ...demo.inputs.map((s) => streamRow(s, demo.maxFrame)),
    h("div", { class: "m-op" }, [h("span", { class: "m-op__arrow" }, "↓"), h("code", null, demo.operator)]),
    streamRow(demo.output, demo.maxFrame, "m-row--out"),
  ]);
}

/**
 * Render an animated marble diagram for a computed demo. Marbles pop in along a
 * shared virtual timeline; "Replay" rebuilds the diagram to restart the animation.
 */
export function renderMarbleDemo(demo: MarbleDemo): HTMLElement {
  const host = h("div", { class: "marble__host" });
  const draw = (): void => {
    clear(host);
    host.append(buildDiagram(demo));
  };
  draw();

  const replay = h("button", { class: "replay", type: "button" }, "▶ Replay");
  replay.addEventListener("click", draw);

  return h("section", { class: "marble" }, [
    h("div", { class: "marble__head" }, [
      h("span", { class: "marble__title" }, "Marble demo"),
      h("code", { class: "marble__code" }, demo.code),
      replay,
    ]),
    h("p", { class: "marble__caption" }, demo.caption),
    host,
  ]);
}
