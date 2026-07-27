import { describe, it, expect } from "vitest";
import { getDemo, hasDemo, flatteningComparison } from "../src/web/marbles.ts";

/** Compact "frame:value" view of a stream for assertions. */
function shape(marbles: { frame: number; text: string; kind: string }[]): string[] {
  return marbles.map((m) =>
    `${m.frame}:${m.kind === "complete" ? "|" : m.kind === "error" ? "#" : m.text}`,
  );
}

describe("marble demos (computed via TestScheduler)", () => {
  it("computes map as a value transform on the same frames", () => {
    const demo = getDemo("map")!;
    expect(demo).not.toBeNull();
    expect(shape(demo.inputs[0]!.marbles)).toEqual(["1:1", "3:2", "5:3", "7:|"]);
    expect(shape(demo.output.marbles)).toEqual(["1:10", "3:20", "5:30", "7:|"]);
  });

  it("computes filter to drop odd values", () => {
    const demo = getDemo("filter")!;
    expect(shape(demo.output.marbles)).toEqual(["3:2", "7:4", "9:|"]);
  });

  it("distinguishes the four flattening operators on the same input", () => {
    const merge = shape(getDemo("mergeMap")!.output.marbles);
    const switchM = shape(getDemo("switchMap")!.output.marbles);
    const concat = shape(getDemo("concatMap")!.output.marbles);
    const exhaust = shape(getDemo("exhaustMap")!.output.marbles);
    // mergeMap overlaps both inners; switchMap cancels the first; exhaustMap
    // ignores the second entirely; all four differ.
    expect(new Set([merge.join(), switchM.join(), concat.join(), exhaust.join()]).size).toBe(4);
    expect(merge).toContain("2:x2"); // first inner's 2nd value survives (overlap)
    expect(switchM).not.toContain("2:x2"); // cancelled before it emits
    expect(exhaust).not.toContain("2:y1"); // second source ignored while busy
  });

  it("keeps timer-driven emissions for time operators (debounceTime)", () => {
    // Regression: the intermediate value emitted by the virtual timer (not on
    // complete) must survive — it is dropped if the operator's scheduler is not
    // the TestScheduler.
    const demo = getDemo("debounceTime")!;
    expect(shape(demo.output.marbles)).toEqual(["8:c", "14:d", "14:|"]);
  });

  it("recovers from an error via catchError", () => {
    const demo = getDemo("catchError")!;
    const out = shape(demo.output.marbles);
    expect(out).toContain("5:fallback");
    expect(out[out.length - 1]).toBe("5:|"); // completes, does not error
  });

  it("compares the four flattening operators on one shared source", () => {
    const { comparison, error } = flatteningComparison();
    expect(error).toBeNull();
    expect(comparison!.rows.map((r) => r.operator)).toEqual([
      "mergeMap",
      "switchMap",
      "concatMap",
      "exhaustMap",
    ]);
    // Same source + inner, four distinct outputs (policy is the only difference).
    const outputs = comparison!.rows.map((r) => shape(r.output.marbles).join());
    expect(new Set(outputs).size).toBe(4);
    // All rows share one time axis.
    for (const r of comparison!.rows) {
      for (const m of r.output.marbles) expect(m.frame).toBeLessThanOrEqual(comparison!.maxFrame);
    }
  });

  it("recomputes the comparison for an edited source and rejects bad input", () => {
    const edited = flatteningComparison("x--y|");
    expect(edited.comparison).not.toBeNull();
    expect(edited.comparison!.source.marbleText).toBe("x--y|");
    expect(flatteningComparison("x*y").error).toMatch(/Use only/);
  });

  it("resolves aliases and reports availability", () => {
    expect(hasDemo("switchMap")).toBe(true);
    expect(hasDemo("flatMap")).toBe(true); // alias → mergeMap
    expect(getDemo("flatMap")!.output.marbles.length).toBeGreaterThan(0);
    expect(hasDemo("windowToggle")).toBe(false);
    expect(getDemo("windowToggle")).toBeNull();
  });
});
