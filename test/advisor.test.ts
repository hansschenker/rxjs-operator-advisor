import { describe, it, expect } from "vitest";
import { loadOntology, flatteningOptions } from "../src/ontology.js";
import { advise } from "../src/advisor.js";

const graph = loadOntology();

describe("ontology extraction (reuse)", () => {
  const options = flatteningOptions(graph);

  it("derives exactly the four flattening options from the ontology", () => {
    expect(options).toHaveLength(4);
    const byPolicy = new Map(options.map((o) => [o.policy, o.operator]));
    expect(byPolicy.get("allowConcurrent")).toBe("mergeMap");
    expect(byPolicy.get("keepLatest")).toBe("switchMap");
    expect(byPolicy.get("queueWhileBusy")).toBe("concatMap");
    expect(byPolicy.get("ignoreWhileBusy")).toBe("exhaustMap");
  });

  it("pulls operator facts (description, bare variant, exports) from the graph", () => {
    const sw = options.find((o) => o.operator === "switchMap")!;
    expect(sw.bareVariant).toBe("switchAll"); // higherOrderVariantOf edge
    expect(sw.operatorDescription.toLowerCase()).toContain("latest");
    expect(sw.exportSites).toContain("rxjs");
  });
});

describe("advise()", () => {
  const cases: Array<[string, string]> = [
    ["keep only the latest search result and cancel the previous request", "switchMap"],
    ["queue the requests and run them one at a time in order", "concatMap"],
    ["ignore repeated clicks while a request is still in flight", "exhaustMap"],
    ["run all the requests in parallel and let them overlap", "mergeMap"],
    ["cancel-and-replace on every keystroke for a type-ahead search", "switchMap"],
    ["prevent double submit while the save is still running", "exhaustMap"],
  ];

  for (const [behavior, expected] of cases) {
    it(`recommends ${expected} for "${behavior}"`, () => {
      const rec = advise(graph, behavior);
      expect(rec.best?.option.operator).toBe(expected);
      expect(rec.confident).toBe(true);
    });
  }

  it("is not confident when the behavior gives no concurrency signal", () => {
    const rec = advise(graph, "which operator should I use for my app");
    expect(rec.best).toBeNull();
    expect(rec.confident).toBe(false);
  });
});
