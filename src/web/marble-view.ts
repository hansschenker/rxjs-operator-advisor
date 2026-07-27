import type { MarbleDemo, MarbleStream, Marble, Comparison } from "./marbles.ts";
import { recompute, flatteningComparison, DEFAULT_FLATTENING_SOURCE } from "./marbles.ts";
import { h, clear } from "./render.ts";

/** Total time (seconds) the animation plays out across the whole timeline. */
const ANIM_SECONDS = 1.8;

function marbleNode(m: Marble, maxFrame: number, animate: boolean): HTMLElement {
  // Inset the timeline so a frame-0 marble doesn't collide with the row label.
  const left = 4 + (m.frame / (maxFrame + 1)) * 92;
  const parts = [`left:${left.toFixed(2)}%`];
  if (animate) parts.push(`animation-delay:${((m.frame / maxFrame) * ANIM_SECONDS).toFixed(2)}s`);
  const style = parts.join(";");
  if (m.kind === "complete") return h("span", { class: "m-bar", style });
  const cls = m.kind === "error" ? "m-dot m-dot--err" : "m-dot";
  return h("span", { class: cls, style }, m.text);
}

function streamRow(stream: MarbleStream, maxFrame: number, animate: boolean, extraClass = ""): HTMLElement {
  const track = h(
    "div",
    { class: "m-track" },
    stream.marbles.map((m) => marbleNode(m, maxFrame, animate)),
  );
  return h("div", { class: `m-row ${extraClass}`.trim() }, [
    h("span", { class: "m-label" }, stream.label),
    track,
  ]);
}

function buildDiagram(demo: MarbleDemo, animate: boolean): HTMLElement {
  return h("div", { class: animate ? "m-diagram" : "m-diagram m-diagram--static" }, [
    ...demo.inputs.map((s) => streamRow(s, demo.maxFrame, animate)),
    h("div", { class: "m-op" }, [h("span", { class: "m-op__arrow" }, "↓"), h("code", null, demo.operator)]),
    streamRow(demo.output, demo.maxFrame, animate, "m-row--out"),
  ]);
}

/**
 * Render an interactive marble diagram: marbles pop in along a shared virtual
 * timeline, learners can edit each input's marble string to see the output
 * recompute live (via the real operator), and "Replay" re-runs the animation.
 */
export function renderMarbleDemo(operator: string, initial: MarbleDemo): HTMLElement {
  let current = initial;

  const host = h("div", { class: "marble__host" });
  const draw = (animate: boolean): void => {
    clear(host);
    host.append(buildDiagram(current, animate));
  };

  const error = h("p", { class: "marble__error", hidden: true, role: "alert" });

  const fields = initial.inputs.map((input) =>
    h("input", {
      class: "m-edit",
      type: "text",
      value: input.marbleText ?? "",
      spellcheck: false,
      autocomplete: "off",
      autocapitalize: "off",
      maxlength: 40,
      "aria-label": `Marble input for ${input.label}`,
    }),
  );

  const onEdit = (): void => {
    const result = recompute(operator, fields.map((f) => f.value));
    if (result.demo) {
      current = result.demo;
      error.setAttribute("hidden", "");
      error.textContent = "";
      draw(false); // instant while typing — animate only on Replay
    } else {
      error.textContent = result.error ?? "Invalid marble diagram.";
      error.removeAttribute("hidden");
    }
  };
  fields.forEach((f) => f.addEventListener("input", onEdit));

  const reset = h("button", { class: "m-reset", type: "button" }, "Reset");
  reset.addEventListener("click", () => {
    fields.forEach((f, i) => {
      f.value = initial.inputs[i]?.marbleText ?? "";
    });
    current = initial;
    error.setAttribute("hidden", "");
    error.textContent = "";
    draw(true);
  });

  const replay = h("button", { class: "replay", type: "button" }, "▶ Replay");
  replay.addEventListener("click", () => draw(true));

  const editRows = initial.inputs.map((input, i) =>
    h("div", { class: "m-edit-row" }, [
      h("label", { class: "m-edit-label" }, input.label),
      fields[i]!,
    ]),
  );

  draw(true);

  return h("section", { class: "marble" }, [
    h("div", { class: "marble__head" }, [
      h("span", { class: "marble__title" }, "Marble demo"),
      h("code", { class: "marble__code" }, initial.code),
      replay,
    ]),
    h("p", { class: "marble__caption" }, initial.caption),
    host,
    h("div", { class: "marble__editor" }, [
      h("div", { class: "m-edit-head" }, [
        h("span", { class: "m-edit-hint" }, "Edit the input — output recomputes live:"),
        reset,
      ]),
      ...editRows,
      h(
        "p",
        { class: "m-edit-legend" },
        "- a tick · letter/digit a value (digits are numbers) · | complete · # error",
      ),
    ]),
    error,
  ]);
}

function comparisonDiagram(comparison: Comparison, animate: boolean): HTMLElement {
  return h("div", { class: `m-diagram m-diagram--cmp ${animate ? "" : "m-diagram--static"}`.trim() }, [
    streamRow(comparison.source, comparison.maxFrame, animate),
    h("div", { class: "m-cmp-sep" }),
    ...comparison.rows.map((r) => streamRow(r.output, comparison.maxFrame, animate, "m-row--out m-row--cmp")),
  ]);
}

/**
 * Render an interactive side-by-side comparison of the four flattening
 * operators on ONE shared, editable source — the clearest way to teach that
 * they differ only in concurrency policy.
 */
export function renderFlatteningComparison(): HTMLElement {
  const initial = flatteningComparison();
  let current = initial.comparison!; // default source is always valid

  const host = h("div", { class: "marble__host" });
  const draw = (animate: boolean): void => {
    clear(host);
    host.append(comparisonDiagram(current, animate));
  };

  const error = h("p", { class: "marble__error", hidden: true, role: "alert" });

  const field = h("input", {
    class: "m-edit",
    type: "text",
    value: current.source.marbleText ?? "",
    spellcheck: false,
    autocomplete: "off",
    autocapitalize: "off",
    maxlength: 40,
    "aria-label": "Shared source marble input",
  });
  field.addEventListener("input", () => {
    const result = flatteningComparison(field.value);
    if (result.comparison) {
      current = result.comparison;
      error.setAttribute("hidden", "");
      error.textContent = "";
      draw(false);
    } else {
      error.textContent = result.error ?? "Invalid marble diagram.";
      error.removeAttribute("hidden");
    }
  });

  const reset = h("button", { class: "m-reset", type: "button" }, "Reset");
  reset.addEventListener("click", () => {
    field.value = DEFAULT_FLATTENING_SOURCE;
    current = flatteningComparison().comparison!;
    error.setAttribute("hidden", "");
    error.textContent = "";
    draw(true);
  });

  const replay = h("button", { class: "replay", type: "button" }, "▶ Replay");
  replay.addEventListener("click", () => draw(true));

  draw(true);

  return h("section", { class: "marble marble--cmp" }, [
    h("div", { class: "marble__head" }, [
      h("span", { class: "marble__title" }, "Side by side"),
      h("span", { class: "marble__cmp-lead" }, "one source through all four operators"),
      replay,
    ]),
    h(
      "p",
      { class: "marble__caption" },
      "Each value maps to the same inner Observable (a-b|). Only the concurrency policy differs — watch how the outputs diverge.",
    ),
    host,
    h("div", { class: "marble__editor" }, [
      h("div", { class: "m-edit-head" }, [
        h("span", { class: "m-edit-hint" }, "Edit the shared source — all four recompute live:"),
        reset,
      ]),
      h("div", { class: "m-edit-row" }, [h("label", { class: "m-edit-label" }, "source"), field]),
      h("p", { class: "m-edit-legend" }, "- a tick · letter a value · | complete"),
    ]),
    error,
  ]);
}
