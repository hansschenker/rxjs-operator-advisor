import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type {
  OntologyGraph,
  OntologyNode,
  FlatteningOption,
} from "./types.js";

const ONTOLOGY_URL = new URL("../data/ontology.graph.json", import.meta.url);

/** Load the vendored RxJS ontology graph (sourced from the rxjs-ontology project). */
export function loadOntology(path: string = fileURLToPath(ONTOLOGY_URL)): OntologyGraph {
  const raw = JSON.parse(readFileSync(path, "utf8")) as OntologyGraph;
  return raw;
}

/**
 * Derive the higher-order flattening options purely from the ontology:
 * every `flatteningPolicy` edge (operator → policy) becomes one option, enriched
 * with the operator's and policy's curated descriptions and the operator's bare
 * variant (`higherOrderVariantOf`). No operator knowledge is hardcoded here.
 */
export function flatteningOptions(graph: OntologyGraph): FlatteningOption[] {
  const byId = new Map<string, OntologyNode>(graph.nodes.map((n) => [n.id, n]));

  const variantByOperatorId = new Map<string, string>();
  for (const e of graph.edges) {
    if (e.type === "higherOrderVariantOf") {
      const target = byId.get(e.target);
      // Keep the first variant seen for each operator (e.g. switchMap → switchAll).
      if (target && !variantByOperatorId.has(e.source)) {
        variantByOperatorId.set(e.source, target.name);
      }
    }
  }

  const options: FlatteningOption[] = [];
  for (const e of graph.edges) {
    if (e.type !== "flatteningPolicy") continue;
    const operator = byId.get(e.source);
    const policy = byId.get(e.target);
    if (!operator || !policy) continue;
    options.push({
      operator: operator.name,
      operatorDescription: operator.description,
      policy: policy.name,
      policyDescription: policy.description,
      bareVariant: variantByOperatorId.get(operator.id),
      exportSites: operator.exportSites,
    });
  }

  // Stable, sensible ordering for guides: parallel → latest → queue → ignore.
  const order = ["allowConcurrent", "keepLatest", "queueWhileBusy", "ignoreWhileBusy"];
  options.sort((a, b) => order.indexOf(a.policy) - order.indexOf(b.policy));
  return options;
}
