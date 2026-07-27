import type { OperatorCategory } from "./types.js";

/**
 * Behavior signals per flattening policy. Keys are the ontology's policy names
 * (allowConcurrent / keepLatest / queueWhileBusy / ignoreWhileBusy), so this map
 * stays aligned with the graph. These phrases are what the advisor matches a
 * user's behavior description against — the one piece of knowledge that is the
 * advisor's own, layered on top of the ontology's facts.
 */
export const POLICY_SIGNALS: Record<string, string[]> = {
  allowConcurrent: [
    "parallel",
    "in parallel",
    "concurrent",
    "concurrently",
    "all at once",
    "at the same time",
    "simultaneously",
    "overlap",
    "overlapping",
    "fan out",
    "fan-out",
    "as many as possible",
    "unbounded",
    "every request runs",
    "flatten all",
    "independent requests",
  ],
  keepLatest: [
    "latest",
    "newest",
    "most recent",
    "only the last",
    "cancel",
    "cancels",
    "cancelling",
    "canceling",
    "abort",
    "replace",
    "supersede",
    "discard previous",
    "previous",
    "stale",
    "type-ahead",
    "typeahead",
    "autocomplete",
    "search-as-you-type",
    "live search",
    "cancel-and-replace",
  ],
  queueWhileBusy: [
    "queue",
    "queued",
    "in order",
    "preserve order",
    "keep order",
    "ordered",
    "sequential",
    "sequentially",
    "one at a time",
    "one after another",
    "back to back",
    "serialize",
    "serialise",
    "wait for each",
    "finish before",
    "no overlap",
    "strictly ordered",
  ],
  ignoreWhileBusy: [
    "ignore",
    "ignores",
    "drop",
    "drops",
    "skip",
    "skips",
    "while busy",
    "in flight",
    "in-flight",
    "still running",
    "already running",
    "until done",
    "prevent double",
    "double submit",
    "double-submit",
    "double click",
    "double-click",
    "dedupe",
    "deduplicate",
    "first wins",
    "rapid taps",
    "rapid clicks",
  ],
};

/**
 * A curated behavior→operator mapping: the advisor's own knowledge, layered on
 * top of the ontology's facts. Each entry names a real operator/creation-function
 * node in the graph, assigns it a task `category`, and lists the plain-English
 * `signals` a user might use to describe that behavior. The 4 flattening operators
 * reuse `POLICY_SIGNALS` so the two advisors stay in lock-step; the rest are
 * hand-authored. Operators absent from this list still appear as candidates (from
 * the graph) and stay reachable via description-keyword matching.
 */
export interface OperatorIntent {
  /** must match an ontology node `name` */
  operator: string;
  category: OperatorCategory;
  signals: string[];
}

export const OPERATOR_INTENTS: OperatorIntent[] = [
  // ── flattening (higher-order) — signals shared with the flattening guide ──
  { operator: "mergeMap", category: "flattening", signals: POLICY_SIGNALS.allowConcurrent! },
  { operator: "switchMap", category: "flattening", signals: POLICY_SIGNALS.keepLatest! },
  { operator: "concatMap", category: "flattening", signals: POLICY_SIGNALS.queueWhileBusy! },
  { operator: "exhaustMap", category: "flattening", signals: POLICY_SIGNALS.ignoreWhileBusy! },

  // ── rate-limiting / timing ──
  {
    operator: "debounceTime",
    category: "rate-limiting",
    signals: [
      "wait until",
      "stops typing",
      "stopped typing",
      "stop typing",
      "quiet period",
      "after the user stops",
      "once they stop",
      "pause in",
      "wait for a pause",
      "settle",
      "debounce",
      "only after they stop",
      "when the user is idle",
    ],
  },
  {
    operator: "throttleTime",
    category: "rate-limiting",
    signals: [
      "rate limit",
      "rate-limit",
      "throttle",
      "at most once",
      "no more than once",
      "cap the frequency",
      "limit how often",
      "leading edge",
      "not too often",
      "every so often",
    ],
  },
  {
    operator: "auditTime",
    category: "rate-limiting",
    signals: [
      "emit the latest every",
      "last value in each window",
      "trailing edge",
      "latest value periodically",
      "audit",
    ],
  },
  {
    operator: "sampleTime",
    category: "rate-limiting",
    signals: [
      "sample",
      "poll the latest",
      "read the latest value every",
      "snapshot every",
      "periodically emit the latest",
      "on a timer",
    ],
  },
  {
    operator: "delay",
    category: "utility",
    signals: ["delay", "wait before", "postpone", "hold for", "shift in time", "after a delay"],
  },

  // ── filtering ──
  {
    operator: "filter",
    category: "filtering",
    signals: [
      "only values that",
      "only emit when",
      "keep values where",
      "keep only",
      "drop values that",
      "matching a condition",
      "predicate",
      "exclude values",
      "where the value",
      "pass through only",
    ],
  },
  {
    operator: "distinctUntilChanged",
    category: "filtering",
    signals: [
      "only when it changes",
      "only when the value changes",
      "skip consecutive duplicates",
      "ignore repeats",
      "consecutive duplicates",
      "same as the last",
      "don't emit if unchanged",
      "changed since last",
    ],
  },
  {
    operator: "distinct",
    category: "filtering",
    signals: [
      "remove duplicate",
      "remove duplicates",
      "duplicate values",
      "duplicates",
      "duplicate",
      "unique values",
      "seen before",
      "never emitted before",
      "distinct values",
      "first occurrence only",
    ],
  },
  {
    operator: "take",
    category: "filtering",
    signals: ["first n", "only the first", "take the first", "then complete", "limit to", "first few"],
  },
  {
    operator: "takeUntil",
    category: "filtering",
    signals: [
      "until another",
      "until a notifier",
      "stop when",
      "until this stops",
      "unsubscribe when",
      "take until",
    ],
  },
  {
    operator: "takeWhile",
    category: "filtering",
    signals: ["while a condition", "as long as", "until it becomes false", "keep taking while", "take while"],
  },
  {
    operator: "first",
    category: "filtering",
    signals: ["the first value", "first that matches", "first emission", "just the first"],
  },
  {
    operator: "last",
    category: "filtering",
    signals: ["the last value", "final value", "last emission", "last that matches"],
  },
  {
    operator: "skip",
    category: "filtering",
    signals: ["skip the first", "ignore the first", "drop the first", "skip n"],
  },
  {
    operator: "ignoreElements",
    category: "filtering",
    signals: [
      "ignore all values",
      "only care about completion",
      "discard values",
      "only the complete",
      "drop every value",
    ],
  },
  {
    operator: "elementAt",
    category: "filtering",
    signals: ["value at index", "nth value", "the n-th", "specific index"],
  },

  // ── transformation ──
  {
    operator: "map",
    category: "transformation",
    signals: [
      "transform each",
      "map each",
      "convert each value",
      "project each value",
      "change each value",
      "turn each",
      "reshape each",
    ],
  },
  {
    operator: "scan",
    category: "transformation",
    signals: [
      "accumulate",
      "running total",
      "running sum",
      "reduce over time",
      "state over time",
      "fold over",
      "carry state",
      "accumulate as values arrive",
    ],
  },
  {
    operator: "reduce",
    category: "transformation",
    signals: [
      "final total",
      "aggregate at the end",
      "reduce to a single",
      "single result when complete",
      "combine all into one when done",
    ],
  },
  {
    operator: "pairwise",
    category: "transformation",
    signals: ["previous and current", "consecutive pairs", "compare with the previous", "current and last", "in pairs"],
  },
  {
    operator: "bufferTime",
    category: "transformation",
    signals: ["batch over time", "collect for a period", "buffer for", "group values every", "batch every"],
  },
  {
    operator: "bufferCount",
    category: "transformation",
    signals: ["batch of", "group into arrays of", "collect n values", "chunks of", "every n values as an array"],
  },
  {
    operator: "toArray",
    category: "transformation",
    signals: ["collect all into an array", "all values as an array", "gather into a list", "array when complete"],
  },
  {
    operator: "groupBy",
    category: "transformation",
    signals: ["group by", "partition by key", "split by key", "group values by"],
  },

  // ── combination ──
  {
    operator: "combineLatestWith",
    category: "combination",
    signals: [
      "latest of each",
      "whenever any changes",
      "combine the latest",
      "combine latest",
      "latest values from multiple",
      "recompute when any changes",
    ],
  },
  {
    operator: "withLatestFrom",
    category: "combination",
    signals: [
      "latest value of another",
      "sample another stream",
      "pair with the latest from",
      "with the latest from",
      "use the latest of that",
    ],
  },
  {
    operator: "zipWith",
    category: "combination",
    signals: ["pair up in lockstep", "one from each", "zip together", "in lockstep", "zip"],
  },
  {
    operator: "concatWith",
    category: "combination",
    signals: ["one after another", "append another stream", "then the next stream", "after the first completes"],
  },
  {
    operator: "mergeWith",
    category: "combination",
    signals: ["merge streams", "interleave streams", "combine emissions from", "merge into one"],
  },
  {
    operator: "raceWith",
    category: "combination",
    signals: ["first to emit wins", "whichever emits first", "race", "fastest source"],
  },
  {
    operator: "startWith",
    category: "combination",
    signals: ["initial value", "seed value", "emit first before", "start with", "begin with", "prepend"],
  },
  {
    operator: "forkJoin",
    category: "combination",
    signals: [
      "wait for all",
      "wait for all to complete",
      "wait until all",
      "when all complete",
      "when all are done",
      "when all have completed",
      "once all complete",
      "when they all finish",
      "when all finish",
      "last value of each",
      "run in parallel and wait",
      "in parallel and wait",
      "all requests then combine",
      "parallel and collect results",
      "collect all results",
      "combine when all",
      "join the results",
    ],
  },

  // ── error handling ──
  {
    operator: "catchError",
    category: "error-handling",
    signals: [
      "handle the error",
      "on error",
      "fallback value",
      "recover from error",
      "catch the error",
      "if it fails return",
      "gracefully handle failure",
    ],
  },
  {
    operator: "retry",
    category: "error-handling",
    signals: [
      "retry",
      "try again",
      "retry on failure",
      "attempt again",
      "retry the request",
      "re-subscribe on error",
      "retry n times",
    ],
  },
  {
    operator: "timeout",
    category: "error-handling",
    signals: ["timeout", "give up after", "too slow", "if it takes too long", "error if no value within", "time limit"],
  },
  {
    operator: "throwIfEmpty",
    category: "error-handling",
    signals: ["error if empty", "fail if nothing", "throw when no values", "require at least one"],
  },

  // ── multicasting ──
  {
    operator: "share",
    category: "multicasting",
    signals: [
      "share the subscription",
      "multicast",
      "avoid duplicate requests",
      "single shared subscription",
      "share among subscribers",
      "one subscription for all",
    ],
  },
  {
    operator: "shareReplay",
    category: "multicasting",
    signals: [
      "cache the last",
      "replay to late subscribers",
      "share and cache",
      "cache the result",
      "remember the last value",
      "replay the latest",
    ],
  },

  // ── utility ──
  {
    operator: "tap",
    category: "utility",
    signals: ["side effect", "for debugging", "log each value", "without changing", "peek at values", "tap into"],
  },
  {
    operator: "finalize",
    category: "utility",
    signals: ["cleanup", "on complete or error", "teardown", "run when it finishes", "always run at the end"],
  },
];
