import { of, type Observable, type SchedulerLike } from "rxjs";
import {
  map,
  filter,
  scan,
  take,
  skip,
  first,
  distinctUntilChanged,
  distinct,
  pairwise,
  startWith,
  tap,
  debounceTime,
  throttleTime,
  delay,
  auditTime,
  sampleTime,
  mergeMap,
  switchMap,
  concatMap,
  exhaustMap,
  combineLatestWith,
  withLatestFrom,
  zipWith,
  mergeWith,
  concatWith,
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
type InputSpec = { marbles: string; values?: Record<string, unknown>; label?: string };

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

/** A small inner Observable factory for higher-order operator demos. */
function inner(cold: ColdFn, v: unknown): Observable<unknown> {
  return cold("a-b|", { a: `${v}1`, b: `${v}2` });
}

const num = { a: 1, b: 2, c: 3, d: 4, e: 5 } as const;

const DEMOS: Record<string, DemoSpec> = {
  map: {
    code: "source.pipe(map(x => x * 10))",
    caption: "Transforms each value.",
    inputs: [{ marbles: "-a-b-c-|", values: num }],
    build: (s) => s[0]!.pipe(map((x) => (x as number) * 10)),
  },
  filter: {
    code: "source.pipe(filter(x => x % 2 === 0))",
    caption: "Keeps only values that pass the predicate.",
    inputs: [{ marbles: "-a-b-c-d-|", values: num }],
    build: (s) => s[0]!.pipe(filter((x) => (x as number) % 2 === 0)),
  },
  scan: {
    code: "source.pipe(scan((acc, x) => acc + x, 0))",
    caption: "Emits the running accumulation on every value.",
    inputs: [{ marbles: "-a-b-c-|", values: num }],
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
};

/** Alias operators that share a demo with a canonical operator. */
const ALIASES: Record<string, string> = {
  flatMap: "mergeMap",
  mapTo: "map",
};

/** Run a demo spec in virtual time and capture input + output marbles. */
function runDemo(operator: string, spec: DemoSpec): MarbleDemo {
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
      const src = coldFn(inp.marbles, inp.values);
      const stream: MarbleStream = {
        label: inp.label ?? (spec.inputs.length > 1 ? `input ${i + 1}` : "source"),
        marbles: [],
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
  return runDemo(operator, spec);
}
