import { describe, it, expect } from "vitest";
import { loadOntology } from "../src/ontology.js";
import { buildCandidates } from "../src/graph.js";
import { adviseOperators } from "../src/advisor.js";

const graph = loadOntology();

describe("buildCandidates (reuse of the ontology)", () => {
  const candidates = buildCandidates(graph);
  const byName = new Map(candidates.map((c) => [c.operator, c]));

  it("includes every operator and creation-function node in the graph", () => {
    const nodeOps = graph.nodes.filter(
      (n) => n.type === "Operator" || n.type === "CreationFunction",
    ).length;
    expect(candidates).toHaveLength(nodeOps);
  });

  it("enriches curated operators with category, signals, and ontology facts", () => {
    const sw = byName.get("switchMap")!;
    expect(sw.category).toBe("flattening");
    expect(sw.policy).toBe("keepLatest"); // flatteningPolicy edge
    expect(sw.bareVariant).toBe("switchAll"); // higherOrderVariantOf edge
    expect(sw.signals.length).toBeGreaterThan(0);
    expect(sw.exportSites).toContain("rxjs");
  });

  it("still lists un-curated operators (empty signals) so they stay reachable", () => {
    const mapTo = byName.get("mapTo");
    expect(mapTo).toBeDefined();
    expect(mapTo!.signals).toHaveLength(0);
  });

  it("reads the rxjs.dev category from the ontology, keeping flattening separate", () => {
    const cat = (name: string) => byName.get(name)!.category;
    expect(cat("switchMap")).toBe("flattening"); // via flatteningPolicy edge, not the tag
    expect(cat("map")).toBe("transformation");
    expect(cat("filter")).toBe("filtering");
    expect(cat("reduce")).toBe("mathematical-aggregate");
    expect(cat("every")).toBe("conditional-boolean");
    expect(cat("of")).toBe("creation");
    expect(cat("forkJoin")).toBe("join-creation");
    expect(cat("withLatestFrom")).toBe("join");
    expect(cat("share")).toBe("multicasting");
    expect(cat("catchError")).toBe("error-handling");
    expect(cat("tap")).toBe("utility");
  });
});

describe("adviseOperators() across categories", () => {
  const cases: Array<[string, string]> = [
    ["wait until the user stops typing before searching", "debounceTime"],
    ["rate limit the scroll events to at most once every 200ms", "throttleTime"],
    ["retry the request on failure", "retry"],
    ["combine the latest value of each stream", "combineLatestWith"],
    ["transform each value into something else", "map"],
    ["keep a running total as values arrive", "scan"],
    ["remove duplicate values", "distinct"],
    ["only when the value changes", "distinctUntilChanged"],
    ["share the subscription so the request only fires once", "share"],
    ["cancel the previous request on each keystroke", "switchMap"],
    ["queue the tasks and run them one at a time in order", "concatMap"],
    ["wait for all requests to complete then combine", "forkJoin"],
    // reachability: natural phrasings that previously missed their operator
    ["only keep even numbers", "filter"],
    ["only emit when the value changes", "distinctUntilChanged"],
    ["sample the latest value every second", "sampleTime"],
    ["group values into arrays of three", "bufferCount"],
    ["batch values over time", "bufferTime"],
    ["collect all values into an array", "toArray"],
    ["reduce everything to a single total", "reduce"],
    ["append one stream after another completes", "concatWith"],
    ["merge two streams into one", "mergeWith"],
    ["whichever stream emits first wins", "raceWith"],
    ["recover from an error with a fallback", "catchError"],
    ["error if the stream is empty", "throwIfEmpty"],
    ["cache the last value for late subscribers", "shareReplay"],
  ];

  for (const [behavior, expected] of cases) {
    it(`recommends ${expected} for "${behavior}"`, () => {
      const advice = adviseOperators(graph, behavior);
      expect(advice.best?.candidate.operator).toBe(expected);
    });
  }

  it("returns at most six ranked results, best first", () => {
    const advice = adviseOperators(graph, "wait until the user stops typing");
    expect(advice.results.length).toBeGreaterThan(0);
    expect(advice.results.length).toBeLessThanOrEqual(6);
    expect(advice.results[0]).toBe(advice.best);
    const scores = advice.results.map((r) => r.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it("finds nothing for a query with no intent", () => {
    const advice = adviseOperators(graph, "xyzzy foobar quux");
    expect(advice.best).toBeNull();
    expect(advice.confident).toBe(false);
    expect(advice.results).toHaveLength(0);
  });
});
