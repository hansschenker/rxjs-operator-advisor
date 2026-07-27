// One-off, idempotent maintenance script: tag every operator / creation-function
// node in data/ontology.graph.json with its rxjs.dev functional category, and add
// the matching Category nodes + hasCategory edges for graph consistency.
//
// Category source: the RxJS docs guide "Categories of operators"
// (apps/rxjs.dev/content/guide/operators.md). Operators the guide does not list
// explicitly (the *With join family, share/publish* multicasting, deprecated
// aliases, etc.) are assigned to the category they belong to conceptually.
//
// Re-run safely after re-vendoring the ontology: `node scripts/categorize-ontology.mjs`.
//
// Note: the four flattening operators (mergeMap/switchMap/concatMap/exhaustMap)
// are Transformation on rxjs.dev and tagged as such here. The app derives their
// dedicated "flattening" grouping from the flatteningPolicy edges, not this tag.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const FILE = fileURLToPath(new URL("../data/ontology.graph.json", import.meta.url));

/** rxjs.dev functional category -> operator/creation names. */
const CATEGORIES = {
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

const CATEGORY_DESCRIPTIONS = {
  "creation-operator": "Creation operators create a new Observable from a source such as an event, promise, value, or timer.",
  "join-creation-operator": "Join creation operators are creation operators that combine multiple source Observables into one.",
  "transformation-operator": "Transformation operators transform the values emitted by an Observable.",
  "filtering-operator": "Filtering operators select which emitted values pass through, based on value, index, or time.",
  "join-operator": "Join operators combine an Observable with other Observables it receives as input.",
  "multicasting-operator": "Multicasting operators share a single subscription to the source among multiple subscribers.",
  "error-handling-operator": "Error handling operators recover from or react to errors in the source Observable.",
  "utility-operator": "Utility operators support debugging, scheduling, materialization, and other stream utilities.",
  "conditional-boolean-operator": "Conditional and boolean operators evaluate a condition across the emitted values.",
  "mathematical-aggregate-operator": "Mathematical and aggregate operators reduce all emitted values to a single aggregate value.",
};

// name -> tag (fail loudly on duplicates in the source lists).
const tagByName = new Map();
for (const [tag, names] of Object.entries(CATEGORIES)) {
  for (const name of names) {
    if (tagByName.has(name)) throw new Error(`"${name}" listed twice (${tagByName.get(name)} & ${tag})`);
    tagByName.set(name, tag);
  }
}

const graph = JSON.parse(readFileSync(FILE, "utf8"));
const nodeIds = new Set(graph.nodes.map((n) => n.id));

// 1) add the functional category to each operator / creation-function node.
const unassigned = [];
const perCategory = {};
for (const node of graph.nodes) {
  if (node.type !== "Operator" && node.type !== "CreationFunction") continue;
  const tag = tagByName.get(node.name);
  if (!tag) { unassigned.push(node.name); continue; }
  if (!node.categories.includes(tag)) node.categories.push(tag);
  perCategory[tag] = (perCategory[tag] ?? 0) + 1;
}

// unknown names in the lists that don't match any node.
const nodeNames = new Set(graph.nodes.map((n) => n.name));
const unknown = [...tagByName.keys()].filter((n) => !nodeNames.has(n));

// 2) add Category nodes + hasCategory edges for the new functional categories.
for (const [tag, description] of Object.entries(CATEGORY_DESCRIPTIONS)) {
  const catId = `cat:${tag}`;
  if (!nodeIds.has(catId)) {
    graph.nodes.push({
      id: catId, name: tag, type: "Category", categories: [], exportSites: [],
      roles: [], description, aliases: [],
      sourceRef: { section: "rxjs.dev operator categories", line: 0 },
      properties: { iri: `https://rxjs-ontology/cat/${tag}` },
    });
    nodeIds.add(catId);
  }
}
const existingEdgeIds = new Set(graph.edges.map((e) => e.id));
for (const node of graph.nodes) {
  if (node.type !== "Operator" && node.type !== "CreationFunction") continue;
  const tag = tagByName.get(node.name);
  if (!tag) continue;
  const edgeId = `edge:${node.name}--hasCategory--${tag}`;
  if (existingEdgeIds.has(edgeId)) continue;
  graph.edges.push({
    id: edgeId, type: "hasCategory", source: node.id, target: `cat:${tag}`,
    weight: 1, provenance: "rxjs.dev-categories",
    description: `${node.name} belongs to the ${tag} category.`,
  });
  existingEdgeIds.add(edgeId);
}

// 3) resync meta counts.
graph.meta.nodeCount = graph.nodes.length;
graph.meta.edgeCount = graph.edges.length;

writeFileSync(FILE, JSON.stringify(graph, null, 2) + "\n");

console.log("per-category operator counts:");
for (const [tag, count] of Object.entries(perCategory).sort()) console.log("  " + tag.padEnd(32), count);
console.log("total categorised:", Object.values(perCategory).reduce((a, b) => a + b, 0));
console.log("nodes:", graph.nodes.length, "edges:", graph.edges.length);
if (unassigned.length) console.log("!! UNASSIGNED nodes:", unassigned.join(", "));
if (unknown.length) console.log("!! UNKNOWN names in lists (no matching node):", unknown.join(", "));
if (!unassigned.length && !unknown.length) console.log("OK — every operator/creation node categorised, no unknown names.");
