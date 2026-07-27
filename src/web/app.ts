import { fromEvent, map, startWith, distinctUntilChanged, debounceTime } from "rxjs";
import graphData from "../../data/ontology.graph.json";
import type {
  OntologyGraph,
  OperatorCandidate,
  OperatorCategory,
  RankedOperator,
  Advice,
} from "../types.js";
import { buildCandidates, flatteningOptions } from "../graph.js";
import { adviseOperators } from "../advisor.js";
import { h, clear, copyText } from "./render.ts";
import { getDemo } from "./marbles.ts";
import { renderMarbleDemo, renderFlatteningComparison } from "./marble-view.ts";

const graph = graphData as unknown as OntologyGraph;

/** Display order + labels for the task categories (rxjs.dev + a flattening group). */
const CATEGORY_ORDER: OperatorCategory[] = [
  "flattening",
  "transformation",
  "filtering",
  "join",
  "join-creation",
  "creation",
  "multicasting",
  "error-handling",
  "utility",
  "conditional-boolean",
  "mathematical-aggregate",
];

const CATEGORY_LABEL: Record<OperatorCategory, string> = {
  flattening: "Flattening (higher-order)",
  transformation: "Transformation",
  filtering: "Filtering",
  join: "Join",
  "join-creation": "Join creation",
  creation: "Creation",
  multicasting: "Multicasting",
  "error-handling": "Error handling",
  utility: "Utility",
  "conditional-boolean": "Conditional & boolean",
  "mathematical-aggregate": "Mathematical & aggregate",
};

const EXAMPLES = [
  "cancel the previous request on each keystroke",
  "run every request in parallel",
  "wait until the user stops typing",
  "retry the request on failure",
  "combine the latest value of each stream",
  "queue tasks and run one at a time",
];

function importStatement(candidate: OperatorCandidate): string {
  const site = candidate.exportSites[0] ?? "rxjs";
  return `import { ${candidate.operator} } from '${site}';`;
}

/** A code line with a copy-to-clipboard button. */
function codeLine(candidate: OperatorCandidate): HTMLElement {
  const text = importStatement(candidate);
  const button = h("button", { class: "copy", type: "button", "aria-label": `Copy ${text}` }, "Copy");
  button.addEventListener("click", async () => {
    const ok = await copyText(text);
    const original = button.textContent;
    button.textContent = ok ? "Copied!" : "Press Ctrl+C";
    button.classList.add("copy--done");
    window.setTimeout(() => {
      button.textContent = original;
      button.classList.remove("copy--done");
    }, 1200);
  });
  return h("div", { class: "code" }, [h("code", null, text), button]);
}

interface CardOptions {
  matched?: string[];
  badge?: string;
  top?: boolean;
}

function operatorCard(candidate: OperatorCandidate, opts: CardOptions = {}): HTMLElement {
  const head = h("div", { class: "card__head" }, [
    h("span", { class: "op" }, candidate.operator),
    h("span", { class: "chip" }, CATEGORY_LABEL[candidate.category]),
    opts.badge ? h("span", { class: "badge" }, opts.badge) : null,
  ]);

  const facts: HTMLElement[] = [];
  if (candidate.policy) {
    const variant = candidate.bareVariant ? ` · bare form: ${candidate.bareVariant}` : "";
    facts.push(h("p", { class: "facts" }, `policy: ${candidate.policy}${variant}`));
  }

  const matchedTags =
    opts.matched && opts.matched.length > 0
      ? h(
          "div",
          { class: "matched" },
          [
            h("span", { class: "matched__label" }, "matched:"),
            ...opts.matched.map((m) => h("span", { class: "tag" }, m)),
          ],
        )
      : null;

  return h("article", { class: opts.top ? "card card--top" : "card" }, [
    head,
    h("p", { class: "desc" }, candidate.operatorDescription),
    ...facts,
    codeLine(candidate),
    matchedTags,
  ]);
}

function rankedCard(ranked: RankedOperator, index: number, confident: boolean): HTMLElement {
  const top = index === 0;
  const badge = top ? (confident ? "Recommended" : "Best guess") : undefined;
  return operatorCard(ranked.candidate, { matched: ranked.matched, badge, top });
}

/** Render the recommendation results for the current query. */
function renderResults(container: HTMLElement, query: string, advice: Advice): void {
  clear(container);
  if (query === "") {
    container.append(
      h("p", { class: "hint" }, "Describe what you want your stream to do, and the matching operators appear here. Try an example above."),
    );
    return;
  }
  if (advice.results.length === 0) {
    container.append(
      h("p", { class: "hint" }, `No operator matched “${query}”. Try describing the behavior differently — e.g. “retry on failure” or “wait until the user stops typing”.`),
    );
    return;
  }
  container.append(
    h("p", { class: "results__count" }, `${advice.results.length} match${advice.results.length === 1 ? "" : "es"} for “${query}”`),
  );
  advice.results.forEach((ranked, i) => {
    container.append(rankedCard(ranked, i, advice.confident));
    if (i === 0) {
      const demo = getDemo(ranked.candidate.operator);
      container.append(
        demo
          ? renderMarbleDemo(ranked.candidate.operator, demo)
          : h("p", { class: "marble-note" }, `No marble demo for ${ranked.candidate.operator} yet.`),
      );
    }
  });
}

/** The 4-operator flattening decision guide (the project's teaching artifact). */
function renderGuide(): HTMLElement {
  const rows = flatteningOptions(graph).map((o) =>
    h("tr", null, [
      h("td", null, [h("span", { class: "op" }, o.operator)]),
      h("td", null, o.policy),
      h("td", null, o.bareVariant ?? "—"),
      h("td", { class: "guide__desc" }, o.policyDescription),
    ]),
  );
  return h("section", { class: "panel", id: "guide" }, [
    h("h2", null, "Flattening operator decision guide"),
    h("p", { class: "panel__lead" }, "Mapping one source value to an inner Observable? Pick by how overlapping inner Observables should behave."),
    h("div", { class: "table-wrap" }, [
      h("table", { class: "guide" }, [
        h("thead", null, [
          h("tr", null, [
            h("th", null, "Operator"),
            h("th", null, "Policy"),
            h("th", null, "Bare form"),
            h("th", null, "Behavior"),
          ]),
        ]),
        h("tbody", null, rows),
      ]),
    ]),
    renderFlatteningComparison(),
  ]);
}

/** Browse-by-category reference over every operator, with a name filter. */
function renderBrowse(candidates: OperatorCandidate[]): HTMLElement {
  const sections: HTMLElement[] = [];
  for (const category of CATEGORY_ORDER) {
    const inCategory = candidates
      .filter((c) => c.category === category)
      .sort((a, b) => a.operator.localeCompare(b.operator));
    if (inCategory.length === 0) continue;
    sections.push(
      h("section", { class: "cat", "data-cat": category }, [
        h("h3", { class: "cat__title" }, `${CATEGORY_LABEL[category]} (${inCategory.length})`),
        h("div", { class: "grid" }, inCategory.map((c) => operatorCard(c))),
      ]),
    );
  }

  const filter = h("input", {
    class: "filter",
    type: "search",
    placeholder: "Filter operators by name…",
    "aria-label": "Filter operators by name",
  });
  filter.addEventListener("input", () => {
    const term = filter.value.trim().toLowerCase();
    for (const section of sections) {
      const cards = section.querySelectorAll<HTMLElement>(".card");
      let visible = 0;
      cards.forEach((card) => {
        const name = card.querySelector(".op")?.textContent?.toLowerCase() ?? "";
        const show = term === "" || name.includes(term);
        card.style.display = show ? "" : "none";
        if (show) visible += 1;
      });
      section.style.display = visible === 0 ? "none" : "";
    }
  });

  return h("section", { class: "panel", id: "browse" }, [
    h("h2", null, "Browse operators by task"),
    h("p", { class: "panel__lead" }, `All ${candidates.length} operators, grouped by their rxjs.dev category (plus a dedicated flattening group). Filter by name, or describe a behaviour above.`),
    filter,
    ...sections,
  ]);
}

/** Build the full page and wire up the debounced live search. */
export function mount(root: HTMLElement): void {
  const candidates = buildCandidates(graph);

  const input = h("textarea", {
    class: "search",
    id: "behavior",
    rows: 2,
    placeholder: "e.g. cancel the previous request on each keystroke",
    "aria-label": "Describe the behavior you want",
  });

  const exampleChips = h(
    "div",
    { class: "examples" },
    EXAMPLES.map((text) => {
      const chip = h("button", { class: "chip chip--btn", type: "button" }, text);
      chip.addEventListener("click", () => {
        input.value = text;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.focus();
      });
      return chip;
    }),
  );

  const results = h("div", { class: "results", "aria-live": "polite" });

  root.append(
    h("header", { class: "site-head" }, [
      h("h1", null, "RxJS Operator Advisor"),
      h("p", { class: "tagline" }, "Describe what you want your stream to do — get the operator."),
      h("p", { class: "sub" }, "Deterministic keyword matching · no API keys · reuses the RxJS ontology."),
    ]),
    h("section", { class: "panel panel--search" }, [
      h("label", { class: "search__label", for: "behavior" }, "What should your stream do?"),
      input,
      exampleChips,
      results,
    ]),
    renderGuide(),
    renderBrowse(candidates),
    h("footer", { class: "site-foot" }, [
      h("span", null, "Knowledge source: the RxJS ontology property graph. "),
      h("a", { href: "https://rxjs.dev/guide/operators", target: "_blank", rel: "noopener" }, "RxJS operator docs ↗"),
    ]),
  );

  fromEvent(input, "input")
    .pipe(
      map(() => input.value.trim()),
      debounceTime(200),
      distinctUntilChanged(),
      startWith(""),
    )
    .subscribe((query) => {
      renderResults(results, query, adviseOperators(graph, query));
    });
}
