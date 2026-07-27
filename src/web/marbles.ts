import { of, forkJoin, type Observable, type SchedulerLike } from "rxjs";
import {
  map,
  filter,
  scan,
  reduce,
  take,
  takeWhile,
  takeUntil,
  skip,
  first,
  last,
  elementAt,
  ignoreElements,
  distinctUntilChanged,
  distinct,
  pairwise,
  startWith,
  tap,
  finalize,
  toArray,
  bufferCount,
  bufferTime,
  debounceTime,
  throttleTime,
  delay,
  auditTime,
  sampleTime,
  timeout,
  throwIfEmpty,
  mergeMap,
  switchMap,
  concatMap,
  exhaustMap,
  combineLatestWith,
  withLatestFrom,
  zipWith,
  mergeWith,
  concatWith,
  raceWith,
  catchError,
  retry,
} from "rxjs";
import { TestScheduler } from "rxjs/testing";

/**
 * Marble demos are computed, not hand-drawn: each demo names a real operator and
 * a synthetic input stream, then RUNS the operator in rxjs virtual time
 * (TestScheduler) to capture the true output emissions. So the diagram can never
 * drift from what the operator actually does. Pure module (no DOM) — unit-testable.
 */

export type MarbleKind = "next" | "complete" | "error";

export interface Marble {
  frame: number;
  text: string;
  kind: MarbleKind;
}

export interface MarbleStream {
  label: string;
  marbles: Marble[];
  /** The marble-diagram string that produced this stream (inputs only). */
  marbleText?: string;
}

export interface MarbleDemo {
  operator: string;
  code: string;
  caption: string;
  inputs: MarbleStream[];
  output: MarbleStream;
  maxFrame: number;
}

type ColdFn = (marbles: string, values?: Record<string, unknown>) => Observable<unknown>;
type InputSpec = { marbles: string; label?: string };

interface DemoSpec {
  code: string;
  caption: string;
  inputs: InputSpec[];
  build: (sources: Observable<unknown>[], cold: ColdFn, scheduler: SchedulerLike) => Observable<unknown>;
}

function formatValue(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(formatValue).join(",")}]`;
  return String(v);
}

/**
 * Derive a values map from a marble string so it is self-describing: a digit
 * marble becomes its number (so `map(x => x * 10)` works when a learner types
 * "1-2-3"), any other character stays a string. Keeps editing intuitive with no
 * hidden values map to fall out of sync.
 */
function deriveValues(marbles: string): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const ch of marbles) {
    if (/[a-z0-9]/i.test(ch) && !(ch in values)) {
      values[ch] = /[0-9]/.test(ch) ? Number(ch) : ch;
    }
  }
  return values;
}

/** A small inner Observable factory for higher-order operator demos. */
function inner(cold: ColdFn, v: unknown): Observable<unknown> {
  return cold("a-b|", { a: `${v}1`, b: `${v}2` });
}

const DEMOS: Record<string, DemoSpec> = {
  map: {
    code: "source.pipe(map(x => x * 10))",
    caption: "Transforms each value.",
    inputs: [{ marbles: "-1-2-3-|" }],
    build: (s) => s[0]!.pipe(map((x) => (x as number) * 10)),
  },
  filter: {
    code: "source.pipe(filter(x => x % 2 === 0))",
    caption: "Keeps only values that pass the predicate.",
    inputs: [{ marbles: "-1-2-3-4-|" }],
    build: (s) => s[0]!.pipe(filter((x) => (x as number) % 2 === 0)),
  },
  scan: {
    code: "source.pipe(scan((acc, x) => acc + x, 0))",
    caption: "Emits the running accumulation on every value.",
    inputs: [{ marbles: "-1-2-3-|" }],
    build: (s) => s[0]!.pipe(scan((acc: number, x) => acc + (x as number), 0)),
  },
  take: {
    code: "source.pipe(take(2))",
    caption: "Emits the first N values, then completes.",
    inputs: [{ marbles: "-a-b-c-d-|" }],
    build: (s) => s[0]!.pipe(take(2)),
  },
  skip: {
    code: "source.pipe(skip(2))",
    caption: "Ignores the first N values.",
    inputs: [{ marbles: "-a-b-c-d-|" }],
    build: (s) => s[0]!.pipe(skip(2)),
  },
  first: {
    code: "source.pipe(first())",
    caption: "Emits only the first value, then completes.",
    inputs: [{ marbles: "-a-b-c-|" }],
    build: (s) => s[0]!.pipe(first()),
  },
  distinctUntilChanged: {
    code: "source.pipe(distinctUntilChanged())",
    caption: "Drops a value when it equals the one before it.",
    inputs: [{ marbles: "-a-a-b-b-c-|" }],
    build: (s) => s[0]!.pipe(distinctUntilChanged()),
  },
  distinct: {
    code: "source.pipe(distinct())",
    caption: "Emits a value only the first time it is seen.",
    inputs: [{ marbles: "-a-b-a-c-b-|" }],
    build: (s) => s[0]!.pipe(distinct()),
  },
  pairwise: {
    code: "source.pipe(pairwise())",
    caption: "Emits the previous and current value as a pair.",
    inputs: [{ marbles: "-a-b-c-d-|" }],
    build: (s) => s[0]!.pipe(pairwise()),
  },
  startWith: {
    code: "source.pipe(startWith('S'))",
    caption: "Emits a seed value before the source.",
    inputs: [{ marbles: "---a-b-c-|" }],
    build: (s) => s[0]!.pipe(startWith("S")),
  },
  tap: {
    code: "source.pipe(tap(x => console.log(x)))",
    caption: "Runs a side effect; values pass through unchanged.",
    inputs: [{ marbles: "-a-b-c-|" }],
    build: (s) => s[0]!.pipe(tap(() => {})),
  },
  debounceTime: {
    code: "source.pipe(debounceTime(3))",
    caption: "Emits a value only after a quiet gap.",
    inputs: [{ marbles: "-a-b-c------d-|" }],
    build: (s, _cold, sch) => s[0]!.pipe(debounceTime(3, sch)),
  },
  throttleTime: {
    code: "source.pipe(throttleTime(3))",
    caption: "Emits, then ignores values for a window.",
    inputs: [{ marbles: "a-b-c-d-e-f|" }],
    build: (s, _cold, sch) => s[0]!.pipe(throttleTime(3, sch)),
  },
  delay: {
    code: "source.pipe(delay(2))",
    caption: "Time-shifts every emission later.",
    inputs: [{ marbles: "-a-b-c-|" }],
    build: (s, _cold, sch) => s[0]!.pipe(delay(2, sch)),
  },
  auditTime: {
    code: "source.pipe(auditTime(3))",
    caption: "Emits the most recent value at the end of each window.",
    inputs: [{ marbles: "a-b-c----d-e-|" }],
    build: (s, _cold, sch) => s[0]!.pipe(auditTime(3, sch)),
  },
  sampleTime: {
    code: "source.pipe(sampleTime(3))",
    caption: "Samples the latest value on a fixed interval.",
    inputs: [{ marbles: "a-b-c-d-e-f|" }],
    build: (s, _cold, sch) => s[0]!.pipe(sampleTime(3, sch)),
  },
  mergeMap: {
    code: "source.pipe(mergeMap(x => inner(x)))",
    caption: "Runs inner Observables concurrently; emissions overlap.",
    inputs: [{ marbles: "x-y-----|" }],
    build: (s, cold) => s[0]!.pipe(mergeMap((v) => inner(cold, v))),
  },
  switchMap: {
    code: "source.pipe(switchMap(x => inner(x)))",
    caption: "Cancels the previous inner when a new value arrives.",
    inputs: [{ marbles: "x-y-----|" }],
    build: (s, cold) => s[0]!.pipe(switchMap((v) => inner(cold, v))),
  },
  concatMap: {
    code: "source.pipe(concatMap(x => inner(x)))",
    caption: "Queues inner Observables and runs them in order.",
    inputs: [{ marbles: "x-y-----|" }],
    build: (s, cold) => s[0]!.pipe(concatMap((v) => inner(cold, v))),
  },
  exhaustMap: {
    code: "source.pipe(exhaustMap(x => inner(x)))",
    caption: "Ignores new values while an inner is still active.",
    inputs: [{ marbles: "x-y-----|" }],
    build: (s, cold) => s[0]!.pipe(exhaustMap((v) => inner(cold, v))),
  },
  combineLatestWith: {
    code: "a$.pipe(combineLatestWith(b$))",
    caption: "Re-emits the latest of each source whenever either changes.",
    inputs: [
      { marbles: "a-----b----|", label: "a$" },
      { marbles: "--1-----2--|", label: "b$" },
    ],
    build: (s) => s[0]!.pipe(combineLatestWith(s[1]!)),
  },
  withLatestFrom: {
    code: "a$.pipe(withLatestFrom(b$))",
    caption: "On each a$ value, pairs it with the latest b$ value.",
    inputs: [
      { marbles: "--a--b--c|", label: "a$" },
      { marbles: "1---2----|", label: "b$" },
    ],
    build: (s) => s[0]!.pipe(withLatestFrom(s[1]!)),
  },
  zipWith: {
    code: "a$.pipe(zipWith(b$))",
    caption: "Pairs values from each source in lockstep.",
    inputs: [
      { marbles: "a-b-c|", label: "a$" },
      { marbles: "1--2--3|", label: "b$" },
    ],
    build: (s) => s[0]!.pipe(zipWith(s[1]!)),
  },
  mergeWith: {
    code: "a$.pipe(mergeWith(b$))",
    caption: "Interleaves emissions from all sources.",
    inputs: [
      { marbles: "a---b---|", label: "a$" },
      { marbles: "-1---2--|", label: "b$" },
    ],
    build: (s) => s[0]!.pipe(mergeWith(s[1]!)),
  },
  concatWith: {
    code: "a$.pipe(concatWith(b$))",
    caption: "Emits the next source only after the previous completes.",
    inputs: [
      { marbles: "a-b|", label: "a$" },
      { marbles: "1-2|", label: "b$" },
    ],
    build: (s) => s[0]!.pipe(concatWith(s[1]!)),
  },
  catchError: {
    code: "source.pipe(catchError(() => of('fallback')))",
    caption: "Replaces an error with a fallback Observable.",
    inputs: [{ marbles: "-a-b-#" }],
    build: (s) => s[0]!.pipe(catchError(() => of("fallback"))),
  },
  retry: {
    code: "source.pipe(retry(1))",
    caption: "Re-subscribes to the source on error.",
    inputs: [{ marbles: "-a-b-#" }],
    build: (s) => s[0]!.pipe(retry(1)),
  },

  // ── more filtering ──
  last: {
    code: "source.pipe(last())",
    caption: "Emits only the last value, on complete.",
    inputs: [{ marbles: "-a-b-c-|" }],
    build: (s) => s[0]!.pipe(last()),
  },
  takeWhile: {
    code: "source.pipe(takeWhile(x => x < 3))",
    caption: "Emits while the predicate holds, then completes.",
    inputs: [{ marbles: "-1-2-3-4-|" }],
    build: (s) => s[0]!.pipe(takeWhile((x) => (x as number) < 3)),
  },
  takeUntil: {
    code: "source.pipe(takeUntil(stop$))",
    caption: "Emits until a notifier fires, then completes.",
    inputs: [
      { marbles: "a-b-c-d-e|", label: "source" },
      { marbles: "-----x|", label: "stop$" },
    ],
    build: (s) => s[0]!.pipe(takeUntil(s[1]!)),
  },
  ignoreElements: {
    code: "source.pipe(ignoreElements())",
    caption: "Discards every value; passes only complete or error.",
    inputs: [{ marbles: "-a-b-c-|" }],
    build: (s) => s[0]!.pipe(ignoreElements()),
  },
  elementAt: {
    code: "source.pipe(elementAt(2))",
    caption: "Emits the value at the given index, then completes.",
    inputs: [{ marbles: "-a-b-c-d-|" }],
    build: (s) => s[0]!.pipe(elementAt(2)),
  },

  // ── more transformation ──
  reduce: {
    code: "source.pipe(reduce((acc, x) => acc + x, 0))",
    caption: "Emits a single accumulated value on complete.",
    inputs: [{ marbles: "-1-2-3-|" }],
    build: (s) => s[0]!.pipe(reduce((acc: number, x) => acc + (x as number), 0)),
  },
  toArray: {
    code: "source.pipe(toArray())",
    caption: "Collects all values into one array on complete.",
    inputs: [{ marbles: "-a-b-c-|" }],
    build: (s) => s[0]!.pipe(toArray()),
  },
  bufferCount: {
    code: "source.pipe(bufferCount(2))",
    caption: "Groups values into arrays of N.",
    inputs: [{ marbles: "-a-b-c-d-e|" }],
    build: (s) => s[0]!.pipe(bufferCount(2)),
  },
  bufferTime: {
    code: "source.pipe(bufferTime(4))",
    caption: "Batches values emitted within each time window.",
    inputs: [{ marbles: "a-b-c-d|" }],
    build: (s, _cold, sch) => s[0]!.pipe(bufferTime(4, sch)),
  },

  // ── more combination ──
  raceWith: {
    code: "a$.pipe(raceWith(b$))",
    caption: "Mirrors whichever source emits first; ignores the rest.",
    inputs: [
      { marbles: "---a-b-c|", label: "a$" },
      { marbles: "-1-2-3|", label: "b$" },
    ],
    build: (s) => s[0]!.pipe(raceWith(s[1]!)),
  },
  forkJoin: {
    code: "forkJoin([a$, b$])",
    caption: "Waits for all to complete, then emits their last values.",
    inputs: [
      { marbles: "a-b-c|", label: "a$" },
      { marbles: "1-2|", label: "b$" },
    ],
    build: (s) => forkJoin([s[0]!, s[1]!]),
  },

  // ── more error handling ──
  timeout: {
    code: "source.pipe(timeout(3))",
    caption: "Errors if no value arrives within the window.",
    inputs: [{ marbles: "a-b-----c|" }],
    build: (s, _cold, sch) => s[0]!.pipe(timeout({ each: 3, scheduler: sch })),
  },
  throwIfEmpty: {
    code: "source.pipe(throwIfEmpty())",
    caption: "Errors if the source completes without emitting.",
    inputs: [{ marbles: "----|" }],
    build: (s) => s[0]!.pipe(throwIfEmpty()),
  },

  // ── more utility ──
  finalize: {
    code: "source.pipe(finalize(() => cleanup()))",
    caption: "Runs teardown when the source completes or errors; values pass through.",
    inputs: [{ marbles: "-a-b-c-|" }],
    build: (s) => s[0]!.pipe(finalize(() => {})),
  },
};

/** Alias operators that share a demo with a canonical operator. */
const ALIASES: Record<string, string> = {
  flatMap: "mergeMap",
  mapTo: "map",
};

/**
 * Run a demo spec in virtual time and capture input + output marbles. When
 * `overrides` is given, each input's marble string is replaced (so learners can
 * tweak the source); missing entries fall back to the spec default.
 */
function runSpec(operator: string, spec: DemoSpec, overrides?: string[]): MarbleDemo {
  const scheduler = new TestScheduler(() => {});
  const inputs: MarbleStream[] = [];
  const output: MarbleStream = { label: "output", marbles: [] };

  const record = (stream: MarbleStream) => ({
    next: (v: unknown) => stream.marbles.push({ frame: scheduler.frame, text: formatValue(v), kind: "next" as const }),
    error: () => stream.marbles.push({ frame: scheduler.frame, text: "✕", kind: "error" as const }),
    complete: () => stream.marbles.push({ frame: scheduler.frame, text: "", kind: "complete" as const }),
  });

  scheduler.run(({ cold }) => {
    const coldFn = cold as unknown as ColdFn;
    const sources = spec.inputs.map((inp, i) => {
      const marbleText = overrides?.[i] ?? inp.marbles;
      const src = coldFn(marbleText, deriveValues(marbleText));
      const stream: MarbleStream = {
        label: inp.label ?? (spec.inputs.length > 1 ? `input ${i + 1}` : "source"),
        marbles: [],
        marbleText,
      };
      inputs.push(stream);
      src.subscribe(record(stream));
      return src;
    });
    spec.build(sources, coldFn, scheduler).subscribe(record(output));
  });

  const frames = [...inputs.flatMap((s) => s.marbles), ...output.marbles].map((m) => m.frame);
  const maxFrame = Math.max(1, ...frames);
  return { operator, code: spec.code, caption: spec.caption, inputs, output, maxFrame };
}

/** Whether a marble demo exists for an operator. */
export function hasDemo(operator: string): boolean {
  return operator in DEMOS || operator in ALIASES;
}

/** Compute the marble demo for an operator, or null if none is defined. */
export function getDemo(operator: string): MarbleDemo | null {
  const canonical = ALIASES[operator] ?? operator;
  const spec = DEMOS[canonical];
  if (!spec) return null;
  return runSpec(operator, spec);
}

/** Characters a marble string may contain. */
const MARBLE_RE = /^[a-z0-9()#|\- ]*$/i;
const MAX_MARBLE_LENGTH = 40;

export interface RecomputeResult {
  demo: MarbleDemo | null;
  error: string | null;
}

/**
 * Re-run an operator's demo with learner-edited input marble strings. Validates
 * the syntax and guards against runaway lengths; returns a friendly error
 * (leaving the previous diagram in place) instead of throwing.
 */
export function recompute(operator: string, marbleStrings: string[]): RecomputeResult {
  const canonical = ALIASES[operator] ?? operator;
  const spec = DEMOS[canonical];
  if (!spec) return { demo: null, error: "No demo for this operator." };

  for (const marbles of marbleStrings) {
    if (marbles.length > MAX_MARBLE_LENGTH) {
      return { demo: null, error: `Keep each marble diagram under ${MAX_MARBLE_LENGTH} characters.` };
    }
    if (!MARBLE_RE.test(marbles)) {
      return { demo: null, error: "Use only letters, digits, and - | # ( ) — e.g. -a-b-c|" };
    }
  }

  try {
    return { demo: runSpec(operator, spec, marbleStrings), error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid marble diagram.";
    return { demo: null, error: message };
  }
}

/** The four flattening operators, in the guide's teaching order. */
export const FLATTENING_OPERATORS = ["mergeMap", "switchMap", "concatMap", "exhaustMap"] as const;
// `y` arrives one frame after `x` — while x's inner (a-b|) is still active — so
// the four policies visibly diverge and no two marbles collide on the same frame.
export const DEFAULT_FLATTENING_SOURCE = "xy------|";

export interface ComparisonRow {
  operator: string;
  output: MarbleStream;
}
export interface Comparison {
  source: MarbleStream;
  rows: ComparisonRow[];
  maxFrame: number;
}
export interface ComparisonResult {
  comparison: Comparison | null;
  error: string | null;
}

/**
 * Run ONE shared source (and one shared inner Observable) through all four
 * flattening operators in a single virtual timeline, so their outputs line up
 * on the same axis. This is the clearest way to see how the concurrency policy —
 * not the mapping — is what differs between them.
 */
export function flatteningComparison(sourceMarbles: string = DEFAULT_FLATTENING_SOURCE): ComparisonResult {
  if (sourceMarbles.length > MAX_MARBLE_LENGTH) {
    return { comparison: null, error: `Keep the marble diagram under ${MAX_MARBLE_LENGTH} characters.` };
  }
  if (!MARBLE_RE.test(sourceMarbles)) {
    return { comparison: null, error: "Use only letters, digits, and - | # ( ) — e.g. x-y---|" };
  }

  try {
    const scheduler = new TestScheduler(() => {});
    const source: MarbleStream = { label: "source", marbles: [], marbleText: sourceMarbles };
    const rows: ComparisonRow[] = FLATTENING_OPERATORS.map((op) => ({
      operator: op,
      output: { label: op, marbles: [] },
    }));

    const record = (stream: MarbleStream) => ({
      next: (v: unknown) => stream.marbles.push({ frame: scheduler.frame, text: formatValue(v), kind: "next" as const }),
      error: () => stream.marbles.push({ frame: scheduler.frame, text: "✕", kind: "error" as const }),
      complete: () => stream.marbles.push({ frame: scheduler.frame, text: "", kind: "complete" as const }),
    });

    scheduler.run(({ cold }) => {
      const coldFn = cold as unknown as ColdFn;
      const src = coldFn(sourceMarbles, deriveValues(sourceMarbles));
      src.subscribe(record(source));
      const project = (v: unknown): Observable<unknown> => inner(coldFn, v);
      const builders: Record<(typeof FLATTENING_OPERATORS)[number], () => Observable<unknown>> = {
        mergeMap: () => src.pipe(mergeMap(project)),
        switchMap: () => src.pipe(switchMap(project)),
        concatMap: () => src.pipe(concatMap(project)),
        exhaustMap: () => src.pipe(exhaustMap(project)),
      };
      FLATTENING_OPERATORS.forEach((op, i) => builders[op]().subscribe(record(rows[i]!.output)));
    });

    const frames = [...source.marbles, ...rows.flatMap((r) => r.output.marbles)].map((m) => m.frame);
    const maxFrame = Math.max(1, ...frames);
    return { comparison: { source, rows, maxFrame }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid marble diagram.";
    return { comparison: null, error: message };
  }
}
