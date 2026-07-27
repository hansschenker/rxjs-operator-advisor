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
