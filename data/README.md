# `ontology.graph.json` — the RxJS ontology

This directory holds the **RxJS ontology property graph** the advisor uses as its
knowledge source. It is a **vendored, generated artifact** — the source of truth is
the companion `rxjs-ontology` project (`"generator": "rxjs-ontology buildGraph"`),
and this copy was taken from a release. Treat it as **read-only facts**: names,
descriptions, export sites, and structural relationships between RxJS symbols.

> **Where does my change belong?** Behavioral/intent knowledge is deliberately
> *not* stored here — see [Where augmentations belong](#where-augmentations-belong).
> Direct edits to this file also get **overwritten the next time it is re-vendored**,
> so prefer fixing facts upstream in `rxjs-ontology` when you can.

## Top-level shape

```jsonc
{
  "meta":  { "name", "source", "nodeCount", "edgeCount", "generator" },
  "nodes": [ /* 277 nodes  */ ],
  "edges": [ /* 770 edges  */ ]
}
```

`meta` is informational only — the app never reads it. Keeping `nodeCount` /
`edgeCount` accurate after an edit is good hygiene but not required.

## Nodes

Every node has these fields:

| field | type | notes |
|---|---|---|
| `id` | string | unique, `<prefix>:<name>` (see [id conventions](#id-conventions)) |
| `name` | string | the RxJS symbol name, e.g. `switchMap` |
| `type` | string | one of the node types below |
| `categories` | string[] | e.g. `["pipeable-operator", "higher-order-operator"]` |
| `exportSites` | string[] | import paths, e.g. `["rxjs", "rxjs/operators"]` |
| `roles` | string[] | currently unused (empty) |
| `description` | string | prose; the richer ones include a "Use it when…" hint |
| `aliases` | string[] | currently unused (empty) |
| `sourceRef` | `{ section, line }` | provenance in the source doc |
| `properties` | `{ iri }` | stable IRI |

Example (an operator node):

```json
{
  "id": "op:switchMap",
  "name": "switchMap",
  "type": "Operator",
  "categories": ["pipeable-operator", "higher-order-operator"],
  "exportSites": ["rxjs", "rxjs/operators"],
  "roles": [],
  "description": "switchMap is a higher-order RxJS pipeable operator that projects each source value to an inner Observable and keeps only the latest, unsubscribing from the previous inner Observable on each new source value (the keepLatest flattening policy). Use it for cancel-and-replace scenarios such as type-ahead search.",
  "aliases": [],
  "sourceRef": { "section": "Pipeable operator names", "line": 194 },
  "properties": { "iri": "https://rxjs-ontology/op/switchMap" }
}
```

### Node types (277 total)

| type | count | id prefix |
|---|---:|---|
| `Operator` | 107 | `op:` |
| `CreationFunction` | 33 | `create:` |
| `TypeAlias` | 32 | `type:` |
| `Category` | 15 | `cat:` |
| `ConfigType` | 14 | `cfg:` |
| `SchedulerType` | 14 | `sched:` |
| `ProtocolTerm` | 10 | `proto:` |
| `ErrorType` | 9 | `err:` |
| `UtilityFunction` | 7 | `util:` |
| `NotificationType` | 6 | `notif:` |
| `Observable` | 6 | `obs:` |
| `ExportSite` | 6 | `site:` |
| `Observer` | 5 | `observer:` |
| `Subject` | 5 | `subj:` |
| `FlatteningPolicy` | 4 | `policy:` |
| `TeachingAlias` | 2 | `alias:` |
| `TestingTool` | 2 | `test:` |

## Edges

Directed relationships between nodes. Every edge has:

| field | type | notes |
|---|---|---|
| `id` | string | unique, e.g. `edge:switchMap--flatteningPolicy--keepLatest` |
| `type` | string | one of the edge types below |
| `source` | string | a node `id` |
| `target` | string | a node `id` |
| `weight` | number | currently always `1` |
| `provenance` | string | e.g. `"parsed"` |
| `description` | string | human-readable prose |

```json
{
  "id": "edge:switchMap--flatteningPolicy--keepLatest",
  "type": "flatteningPolicy",
  "source": "op:switchMap",
  "target": "policy:keepLatest",
  "weight": 1,
  "provenance": "parsed",
  "description": "switchMap applies the keepLatest flattening policy."
}
```

### Edge types (770 total)

| type | count | meaning |
|---|---:|---|
| `exportedFrom` | 364 | symbol → export site |
| `hasCategory` | 309 | node → category |
| `usesProtocolTerm` | 18 | uses an Observable-protocol term (next/error/complete…) |
| `subClassOf` | 16 | type hierarchy |
| `throwsError` | 14 | operator/type → error it can throw |
| `configType` | 14 | operator → its options/config type |
| `higherOrderVariantOf` | 12 | operator → its bare/related variant (e.g. `switchMap` → `switchAll`) |
| `returnsType` | 8 | function → return type |
| `wraps` | 6 | teaching alias/policy → the operator it wraps |
| `flatteningPolicy` | 4 | flattening operator → its concurrency policy |
| `convertsToPromise` | 3 | utility → Observable |
| `producesNotification` | 2 | operator → notification type |

## id conventions

`<prefix>:<name>`. Prefixes by node type:
`op:` `create:` `type:` `cat:` `cfg:` `sched:` `proto:` `err:` `util:` `notif:`
`obs:` `site:` `observer:` `subj:` `policy:` `alias:` `test:`

Edge ids follow `edge:<source-name>--<type>--<target-name>`.

## What the advisor actually reads

The app consumes only a **subset** of the fields, so only these have any effect on
behaviour (see `src/graph.ts`, `src/advisor.ts`):

| field | consumed by | effect |
|---|---|---|
| `node.type` = `Operator` \| `CreationFunction` | `buildCandidates` | whether the symbol is recommendable at all |
| `node.name` | UI + CLI | operator name and the `import { … }` line |
| `node.description` | cards **and** `adviseOperators` fallback | shown text + low-weight keyword matching for un-curated operators |
| `node.exportSites` | UI + CLI | the import path |
| `node.categories` (`higher-order-operator`) | `buildCandidates` → `deriveCategory` | browse-by-task grouping |
| edges `flatteningPolicy`, `higherOrderVariantOf` | `flatteningOptions` | policy + bare form in the guide and side-by-side comparison |

Everything else (`roles`, `aliases`, `sourceRef`, `properties`, `weight`,
`provenance`, `edge.description`, `meta`) is currently **ignored** by the advisor.

## Where augmentations belong

| You want to… | Edit | Not the ontology because… |
|---|---|---|
| get an operator recommended for a plain-English phrase | `src/intents.ts` (`OPERATOR_INTENTS`) | intent phrasing is the advisor's own knowledge, kept out of the fact graph |
| add a marble diagram for an operator | `src/web/marbles.ts` | demos are computed in the app, not data |
| fix/enrich a **fact** (description, export site, missing symbol, relationship) | this file (ideally upstream in `rxjs-ontology`, then re-vendor) | that's exactly what the ontology is for |

## Recipes (direct edits)

**A. Enrich a description** — richest bang for the buck. A good "Use it when…"
sentence improves both the card text and the fallback matcher:

```json
"description": "toArray buffers every value and, on complete, emits them all as a single array. Use it when you need the whole stream collected before continuing."
```

**B. Add a missing operator** — append a node (copy an existing same-`type` node as
a template). Minimum the advisor needs: `id`, `name`, `type`, `categories`,
`exportSites`, `description`.

```json
{
  "id": "op:audit", "name": "audit", "type": "Operator",
  "categories": ["pipeable-operator"], "exportSites": ["rxjs", "rxjs/operators"],
  "roles": [], "aliases": [],
  "description": "audit ignores values for a duration decided by another Observable, then emits the most recent one.",
  "sourceRef": { "section": "manual", "line": 0 },
  "properties": { "iri": "https://rxjs-ontology/op/audit" }
}
```

**C. Add a relationship** — both endpoints must be existing node ids:

```json
{ "id": "edge:audit--higherOrderVariantOf--auditTime", "type": "higherOrderVariantOf",
  "source": "op:audit", "target": "op:auditTime", "weight": 1, "provenance": "manual",
  "description": "audit is the notifier-driven variant of auditTime." }
```

## Validate after editing

1. **Valid JSON** — no trailing commas; every edge `source`/`target` is a real node `id`.
2. `npm test` — the suite loads this file and asserts its shape (e.g. `buildCandidates`
   returns one candidate per `Operator`+`CreationFunction` node), so structural
   breakage is caught.
3. `npm run advise -- "your phrase"` and `npm run dev` to see it live.
4. Optional hygiene — resync the `meta` counts:
   ```bash
   node -e 'const g=require("./data/ontology.graph.json");console.log(g.nodes.length,g.edges.length)'
   ```
