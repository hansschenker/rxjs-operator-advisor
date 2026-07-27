/**
 * rxjs.dev "Categories of operators" — one functional category per operator /
 * creation-function name, added to each node's `categories` alongside the
 * structural `pipeable-operator` / `observable-creation` slugs so downstream
 * consumers can group operators the way the RxJS docs do.
 *
 * Category source: the RxJS docs guide "Categories of operators"
 * (apps/rxjs.dev/content/guide/operators.md). Operators the guide does not list
 * explicitly — the `*With` join family, `share`/`publish*` multicasting, and the
 * deprecated aliases — are placed in the category they belong to conceptually.
 *
 * Note: the four flattening operators (mergeMap/switchMap/concatMap/exhaustMap)
 * are Transformation on rxjs.dev and tagged as such here; a "flattening" grouping
 * is left to consumers to derive from the `flatteningPolicy` edges.
 */

export interface FunctionalCategoryDef {
  slug: string;
  heading: string;
  description: string;
}

export const FUNCTIONAL_CATEGORIES: FunctionalCategoryDef[] = [
  {
    slug: "creation-operator",
    heading: "Creation Operators",
    description: "Creation operators create a new Observable from a source such as an event, promise, value, or timer.",
  },
  {
    slug: "join-creation-operator",
    heading: "Join Creation Operators",
    description: "Join creation operators are creation operators that combine multiple source Observables into one.",
  },
  {
    slug: "transformation-operator",
    heading: "Transformation Operators",
    description: "Transformation operators transform the values emitted by an Observable.",
  },
  {
    slug: "filtering-operator",
    heading: "Filtering Operators",
    description: "Filtering operators select which emitted values pass through, based on value, index, or time.",
  },
  {
    slug: "join-operator",
    heading: "Join Operators",
    description: "Join operators combine an Observable with other Observables it receives as input.",
  },
  {
    slug: "multicasting-operator",
    heading: "Multicasting Operators",
    description: "Multicasting operators share a single subscription to the source among multiple subscribers.",
  },
  {
    slug: "error-handling-operator",
    heading: "Error Handling Operators",
    description: "Error handling operators recover from or react to errors in the source Observable.",
  },
  {
    slug: "utility-operator",
    heading: "Utility Operators",
    description: "Utility operators support debugging, scheduling, materialization, and other stream utilities.",
  },
  {
    slug: "conditional-boolean-operator",
    heading: "Conditional and Boolean Operators",
    description: "Conditional and boolean operators evaluate a condition across the emitted values.",
  },
  {
    slug: "mathematical-aggregate-operator",
    heading: "Mathematical and Aggregate Operators",
    description: "Mathematical and aggregate operators reduce all emitted values to a single aggregate value.",
  },
];

/** Functional category slug -> the operator / creation-function names in it. */
const MEMBERS: Record<string, readonly string[]> = {
  "creation-operator": [
    "ajax", "bindCallback", "bindNodeCallback", "defer", "empty", "EMPTY", "from",
    "fromEvent", "fromEventPattern", "generate", "interval", "of", "range",
    "throwError", "timer", "iif", "never", "NEVER", "animationFrames", "fromFetch",
    "pairs", "scheduled", "using", "webSocket",
  ],
  "join-creation-operator": ["combineLatest", "concat", "forkJoin", "merge", "partition", "race", "zip"],
  "transformation-operator": [
    "buffer", "bufferCount", "bufferTime", "bufferToggle", "bufferWhen", "concatMap",
    "concatMapTo", "exhaustMap", "expand", "groupBy", "map", "mapTo", "mergeMap",
    "mergeMapTo", "mergeScan", "pairwise", "scan", "switchScan", "switchMap",
    "switchMapTo", "window", "windowCount", "windowTime", "windowToggle", "windowWhen",
    "flatMap", "pluck",
  ],
  "filtering-operator": [
    "audit", "auditTime", "debounce", "debounceTime", "distinct", "distinctUntilChanged",
    "distinctUntilKeyChanged", "elementAt", "filter", "first", "ignoreElements", "last",
    "sample", "sampleTime", "single", "skip", "skipLast", "skipUntil", "skipWhile",
    "take", "takeLast", "takeUntil", "takeWhile", "throttle", "throttleTime",
  ],
  "join-operator": [
    "combineLatestAll", "concatAll", "exhaustAll", "mergeAll", "switchAll", "startWith",
    "withLatestFrom", "combineAll", "combineLatestWith", "concatWith", "mergeWith",
    "raceWith", "zipWith", "zipAll", "endWith", "exhaust",
  ],
  "multicasting-operator": [
    "share", "shareReplay", "publish", "publishBehavior", "publishLast", "publishReplay",
    "multicast", "connect", "connectable", "refCount",
  ],
  "error-handling-operator": ["catchError", "retry", "retryWhen", "onErrorResumeNextWith", "onErrorResumeNext"],
  "utility-operator": [
    "tap", "delay", "delayWhen", "dematerialize", "materialize", "observeOn", "subscribeOn",
    "timeInterval", "timestamp", "timeout", "timeoutWith", "toArray", "finalize", "repeat",
    "repeatWhen",
  ],
  "conditional-boolean-operator": ["defaultIfEmpty", "every", "find", "findIndex", "isEmpty", "sequenceEqual", "throwIfEmpty"],
  "mathematical-aggregate-operator": ["count", "max", "min", "reduce"],
};

export const FUNCTIONAL_SLUGS: ReadonlySet<string> = new Set(FUNCTIONAL_CATEGORIES.map((c) => c.slug));

/** operator / creation-function name -> its single functional category slug. */
export const FUNCTIONAL_CATEGORY_OF: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [slug, names] of Object.entries(MEMBERS)) {
    for (const name of names) {
      if (map[name]) throw new Error(`"${name}" is in two functional categories (${map[name]} & ${slug})`);
      map[name] = slug;
    }
  }
  return map;
})();
