import type {
  OntologyGraph,
  FlatteningOption,
  RankedOption,
  Recommendation,
} from "./types.js";
import { flatteningOptions } from "./ontology.js";
import { POLICY_SIGNALS } from "./intents.js";

/** Score one option against the behavior text; multi-word phrase hits weigh more. */
function scoreOption(option: FlatteningOption, text: string): RankedOption {
  const signals = POLICY_SIGNALS[option.policy] ?? [];
  const matched: string[] = [];
  let score = 0;
  for (const signal of signals) {
    if (text.includes(signal)) {
      matched.push(signal);
      score += signal.includes(" ") || signal.includes("-") ? 2 : 1;
    }
  }
  return { option, score, matched };
}

/**
 * Recommend a higher-order RxJS operator for a described behavior. Options come
 * from the ontology; ranking comes from matching the behavior text against the
 * per-policy signal phrases. A recommendation is "confident" only when there is
 * a strict single winner.
 */
export function advise(graph: OntologyGraph, behavior: string): Recommendation {
  const text = ` ${behavior.toLowerCase().trim()} `;
  const ranked = flatteningOptions(graph)
    .map((o) => scoreOption(o, text))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  const runnerUp = ranked[1];
  const best = top && top.score > 0 ? top : null;
  const confident =
    best !== null && (runnerUp === undefined || top!.score > runnerUp.score);

  return {
    behavior,
    best,
    alternatives: ranked.filter((r) => r !== best),
    confident,
  };
}
