import type {
  OntologyGraph,
  OntologyNode,
  FlatteningOption,
  OperatorCandidate,
  OperatorCategory,
} from "./types.js";
import { OPERATOR_INTENTS } from "./intents.js";

/**
 * Pure, browser-safe queries over the RxJS ontology graph. Nothing here touches
 * Node APIs, so this module is shared by the CLI, the tests, and the web bundle.
 * (The Node-only `loadOntology()` lives in ontology.ts.)
 */

/** operator node id → its bare higher-order variant name (e.g. switchMap → switchAll). */
function variantByOperatorId(
  graph: OntologyGraph,
  byId: Map<string, OntologyNode>,
): Map<string, string> {
  const variants = new Map<string, string>();
  for (const e of graph.edges) {
    if (e.type !== "higherOrderVariantOf") continue;
    const target = byId.get(e.target);
    // Keep the first variant seen for each operator (e.g. switchMap → switchAll).
    if (target && !variants.has(e.source)) variants.set(e.source, target.name);
  }
  return variants;
}

/** operator node id → flattening policy node name (from `flatteningPolicy` edges). */
function policyByOperatorId(
  graph: OntologyGraph,
  byId: Map<string, OntologyNode>,
): Map<string, string> {
  const policies = new Map<string, string>();
  for (const e of graph.edges) {
    if (e.type !== "flatteningPolicy") continue;
    const policy = byId.get(e.target);
    if (policy) policies.set(e.source, policy.name);
  }
  return policies;
}

/**
 * Derive the higher-order flattening options purely from the ontology:
 * every `flatteningPolicy` edge (operator → policy) becomes one option, enriched
 * with the operator's and policy's curated descriptions and the operator's bare
 * variant (`higherOrderVariantOf`). No operator knowledge is hardcoded here.
 */
export function flatteningOptions(graph: OntologyGraph): FlatteningOption[] {
  const byId = new Map<string, OntologyNode>(graph.nodes.map((n) => [n.id, n]));
  const variants = variantByOperatorId(graph, byId);

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
      bareVariant: variants.get(operator.id),
      exportSites: operator.exportSites,
    });
  }

  // Stable, sensible ordering for guides: parallel → latest → queue → ignore.
  const order = ["allowConcurrent", "keepLatest", "queueWhileBusy", "ignoreWhileBusy"];
  options.sort((a, b) => order.indexOf(a.policy) - order.indexOf(b.policy));
  return options;
}

/** Best-effort category for an operator the advisor hasn't curated an intent for. */
/** rxjs.dev category tag (on a node's `categories`) → advisor `OperatorCategory`. */
const CATEGORY_BY_TAG: Record<string, OperatorCategory> = {
  "creation-operator": "creation",
  "join-creation-operator": "join-creation",
  "transformation-operator": "transformation",
  "filtering-operator": "filtering",
  "join-operator": "join",
  "multicasting-operator": "multicasting",
  "error-handling-operator": "error-handling",
  "utility-operator": "utility",
  "conditional-boolean-operator": "conditional-boolean",
  "mathematical-aggregate-operator": "mathematical-aggregate",
};

/** Read an operator's rxjs.dev category from its ontology tags (defaults to utility). */
function categoryOf(node: OntologyNode): OperatorCategory {
  for (const tag of node.categories) {
    const category = CATEGORY_BY_TAG[tag];
    if (category) return category;
  }
  return "utility";
}

/**
 * Build the full candidate set the general advisor ranks over: every operator and
 * creation-function node in the ontology. Category comes from the ontology's
 * rxjs.dev tags, except the four flattening operators (identified by their
 * `flatteningPolicy` edge) which get the advisor's dedicated `flattening` group.
 * Signal phrases come from `OPERATOR_INTENTS` where available; curated operators
 * come first (stable order), the un-curated tail follows with empty `signals` and
 * stays reachable through description-keyword matching.
 */
export function buildCandidates(graph: OntologyGraph): OperatorCandidate[] {
  const byId = new Map<string, OntologyNode>(graph.nodes.map((n) => [n.id, n]));
  const byName = new Map<string, OntologyNode>(graph.nodes.map((n) => [n.name, n]));
  const variants = variantByOperatorId(graph, byId);
  const policies = policyByOperatorId(graph, byId);
  const intentByName = new Map(OPERATOR_INTENTS.map((i) => [i.operator, i]));

  const toCandidate = (node: OntologyNode): OperatorCandidate => {
    const intent = intentByName.get(node.name);
    return {
      operator: node.name,
      operatorDescription: node.description,
      category: policies.has(node.id) ? "flattening" : categoryOf(node),
      exportSites: node.exportSites,
      policy: policies.get(node.id),
      bareVariant: variants.get(node.id),
      isCreation: node.type === "CreationFunction" || undefined,
      signals: intent ? intent.signals : [],
    };
  };

  const candidates: OperatorCandidate[] = [];
  const seen = new Set<string>();

  for (const intent of OPERATOR_INTENTS) {
    const node = byName.get(intent.operator);
    if (node && !seen.has(node.name)) {
      candidates.push(toCandidate(node));
      seen.add(node.name);
    }
  }
  for (const node of graph.nodes) {
    if (node.type !== "Operator" && node.type !== "CreationFunction") continue;
    if (seen.has(node.name)) continue;
    candidates.push(toCandidate(node));
    seen.add(node.name);
  }
  return candidates;
}
