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
function deriveCategory(node: OntologyNode): OperatorCategory {
  if (node.type === "CreationFunction") return "creation";
  if (node.categories.includes("higher-order-operator")) return "flattening";
  return "utility";
}

/**
 * Build the full candidate set the general advisor ranks over: every operator and
 * creation-function node in the ontology, enriched with the advisor's curated
 * category + signal phrases (from `OPERATOR_INTENTS`) where available, plus policy
 * and bare-variant facts from the graph. Curated operators come first (stable,
 * meaningful order); the un-curated long tail follows with empty `signals`, so it
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
      category: intent ? intent.category : deriveCategory(node),
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
