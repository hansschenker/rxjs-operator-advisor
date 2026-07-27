import type {
  OntologyGraph,
  FlatteningOption,
  RankedOption,
  Recommendation,
  OperatorCandidate,
  RankedOperator,
  Advice,
} from "./types.js";
import { flatteningOptions, buildCandidates } from "./graph.js";
import { POLICY_SIGNALS } from "./intents.js";

/** Score one flattening option against the behavior text; multi-word phrases weigh more. */
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
 * a strict single winner. (Kept as the focused flattening advisor; the general
 * advisor below subsumes it.)
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

/** Max number of ranked operators the general advisor returns. */
const MAX_RESULTS = 6;

/**
 * Words that carry no intent, so they're ignored when falling back to matching a
 * query against an operator's ontology description. Short words (< 4 chars) are
 * dropped separately. BOILERPLATE covers terms that appear in nearly every node
 * description ("... is a pipeable operator in RxJS, exported from rxjs ...").
 */
const STOPWORDS = new Set([
  "want", "need", "does", "done", "have", "will", "would", "should", "could",
  "each", "every", "this", "that", "these", "those", "your", "they", "them",
  "when", "while", "then", "than", "into", "onto", "over", "about", "after",
  "before", "again", "still", "also", "which", "what", "whats", "such", "most",
  "more", "very", "like", "just", "only", "make", "made", "some", "from", "with",
  "some", "them", "here", "there", "where", "were", "been", "being", "much",
  "many", "using", "used", "give", "gets", "goes", "keep", "kept", "call",
]);

const BOILERPLATE = new Set([
  "operator", "operators", "rxjs", "pipeable", "observable", "observables",
  "vocabulary", "exported", "value", "values", "source", "emit", "emits",
  "emitted", "part", "function", "creation", "higher",
]);

/** Distinctive, intent-bearing tokens of a query (for the description fallback). */
function queryTokens(behavior: string): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const t of behavior.toLowerCase().split(/[^a-z0-9]+/)) {
    if (t.length < 4 || STOPWORDS.has(t) || BOILERPLATE.has(t) || seen.has(t)) continue;
    seen.add(t);
    tokens.push(t);
  }
  return tokens;
}

/**
 * Score a candidate: primary signal is the curated intent phrases (weighted like
 * the flattening advisor). When nothing curated matches, fall back to matching
 * distinctive query tokens against the operator's ontology description — capped
 * below 1 so an un-curated description hit can surface an operator but never
 * outrank a genuine curated match.
 */
function scoreCandidate(
  candidate: OperatorCandidate,
  paddedText: string,
  tokens: string[],
): RankedOperator {
  const matched: string[] = [];
  let score = 0;
  for (const signal of candidate.signals) {
    if (paddedText.includes(signal)) {
      matched.push(signal);
      score += signal.includes(" ") || signal.includes("-") ? 2 : 1;
    }
  }

  if (score === 0 && tokens.length > 0) {
    const desc = candidate.operatorDescription.toLowerCase();
    let hits = 0;
    for (const tok of tokens) {
      if (new RegExp(`\\b${tok}\\b`).test(desc)) {
        matched.push(tok);
        hits += 1;
      }
    }
    score = Math.min(0.9, hits * 0.3);
  }

  return { candidate, score, matched };
}

/**
 * Recommend RxJS operators (across all categories) for a described behavior.
 * Ranks every operator/creation-function candidate from the ontology by curated
 * intent phrases, with a low-weight description fallback for the un-curated tail.
 * Returns the top matches; `confident` is true only for a strict single winner.
 */
export function adviseOperators(graph: OntologyGraph, behavior: string): Advice {
  const paddedText = ` ${behavior.toLowerCase().trim()} `;
  const tokens = queryTokens(behavior);

  const ranked = buildCandidates(graph)
    .map((c) => scoreCandidate(c, paddedText, tokens))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const results = ranked.slice(0, MAX_RESULTS);
  const best = results[0] ?? null;
  const runnerUp = results[1];
  const confident =
    best !== null && (runnerUp === undefined || best.score > runnerUp.score);

  return { behavior, best, results, confident };
}
