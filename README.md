# RxJS Operator Advisor

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Describe the behavior you want, get the right RxJS **higher-order (flattening)
operator** — `mergeMap`, `switchMap`, `concatMap`, or `exhaustMap` — with the
rationale, the bare form, and the import path.

```bash
npm run advise -- "keep only the latest search result, cancel the previous request"
```
```
Recommended operator: switchMap  [policy: keepLatest]

switchMap ... keeps only the latest, unsubscribing from the previous inner
Observable on each new source value (the keepLatest flattening policy). Use it
for cancel-and-replace scenarios such as type-ahead search.
Bare (non-mapping) form: switchAll.
Import from: rxjs, rxjs/operators.
Matched on: latest, cancel, previous.
```

## Reuses the RxJS ontology — nothing is hardcoded

This tool is a **standalone use case built on the
[rxjs-ontology](https://github.com/hansschenker/rxjs-ontology-claude) project**.
Every operator fact — which operator maps to which concurrency policy, the
curated descriptions, the bare `*All` variant, the export sites — is read from
the ontology's property graph (`data/ontology.graph.json`, vendored from the
`v0.1.0` release). The advisor derives its choices from the graph's
`flatteningPolicy` and `higherOrderVariantOf` edges at runtime.

The **only** knowledge the advisor adds on top of the ontology is a set of
behavior **signal phrases** per policy (`src/intents.ts`) — the words that map a
plain-English description to a concurrency policy. Facts live in the ontology;
matching lives here.

## Usage

```bash
npm run advise -- "<describe the behavior>"   # recommend an operator
npm run advise                                # print the decision guide
npm run advise -- guide                       # same guide
```

Examples of behaviors it understands: "run all requests in parallel", "queue
them one at a time in order", "ignore rapid clicks while busy", "cancel the
previous request on every keystroke". When a description carries no clear
concurrency signal it says so and prints the guide instead of guessing.

## How it works

1. `loadOntology()` reads the vendored graph.
2. `flatteningOptions()` turns every `flatteningPolicy` edge into an option
   (operator + policy + descriptions + bare variant) — pure graph derivation.
3. `advise()` scores each option by matching the behavior text against that
   policy's signal phrases (multi-word phrases weigh more) and returns the best,
   flagged `confident` only when there is a strict single winner.

## Development

```bash
npm install
npm run build    # tsc --noEmit (strict)
npm test         # vitest
```

## Keeping the ontology fresh

`data/ontology.graph.json` is a vendored snapshot. To update it, re-download
`graph.json` from a newer rxjs-ontology release (or copy it from that project's
`dist/`) and drop it in `data/`. New flattening operators added to the ontology
appear automatically; only their signal phrases need adding to `src/intents.ts`.

## Credits

Built by **Claude Opus 4.8** (Anthropic) with
[@hansschenker](https://github.com/hansschenker), as a reuse showcase for the
RxJS ontology.
