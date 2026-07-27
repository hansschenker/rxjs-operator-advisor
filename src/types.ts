/** Minimal view of the RxJS ontology property-graph we consume (subset of fields). */
export interface OntologyNode {
  id: string;
  name: string;
  type: string;
  categories: string[];
  exportSites: string[];
  description: string;
}

export interface OntologyEdge {
  id: string;
  type: string;
  source: string;
  target: string;
  description: string;
}

export interface OntologyGraph {
  nodes: OntologyNode[];
  edges: OntologyEdge[];
}

/**
 * One higher-order flattening choice, assembled entirely from the ontology:
 * the operator, its concurrency policy, the bare (non-mapping) variant, and the
 * curated descriptions. The advisor's job is to pick between these.
 */
export interface FlatteningOption {
  /** e.g. "switchMap" */
  operator: string;
  operatorDescription: string;
  /** teaching-vocabulary policy name, e.g. "keepLatest" */
  policy: string;
  policyDescription: string;
  /** bare higher-order form, e.g. "switchAll" (via higherOrderVariantOf) */
  bareVariant?: string;
  exportSites: string[];
}

export interface RankedOption {
  option: FlatteningOption;
  score: number;
  /** Signal phrases from the behavior text that matched this option. */
  matched: string[];
}

export interface Recommendation {
  behavior: string;
  /** Best match, or null when nothing scored. */
  best: RankedOption | null;
  /** The other options, ranked, for "consider also" context. */
  alternatives: RankedOption[];
  /** True when there is a clear single winner. */
  confident: boolean;
}

/**
 * Task taxonomy from rxjs.dev's "Categories of operators", read from each node's
 * `*-operator` category tag in the ontology. `flattening` is the one addition:
 * the four flattening operators are Transformation on rxjs.dev, but the advisor
 * derives a dedicated group from their `flatteningPolicy` edges (see graph.ts).
 */
export type OperatorCategory =
  | "flattening"
  | "creation"
  | "join-creation"
  | "transformation"
  | "filtering"
  | "join"
  | "multicasting"
  | "error-handling"
  | "utility"
  | "conditional-boolean"
  | "mathematical-aggregate";

/**
 * One operator the general advisor can recommend, assembled from the ontology
 * (name, description, export sites, flattening policy / bare variant) plus the
 * advisor's own task category. Operators with no curated intent still appear as
 * candidates so they stay reachable via description matching.
 */
export interface OperatorCandidate {
  /** e.g. "debounceTime" */
  operator: string;
  operatorDescription: string;
  category: OperatorCategory;
  exportSites: string[];
  /** teaching-vocabulary flattening policy, when the operator has one */
  policy?: string;
  /** bare higher-order form, e.g. "switchAll" (via higherOrderVariantOf) */
  bareVariant?: string;
  /** true for creation functions (import differs conceptually from pipeables) */
  isCreation?: boolean;
  /** advisor-owned behavior phrases matched against a query (empty if un-curated) */
  signals: string[];
}

export interface RankedOperator {
  candidate: OperatorCandidate;
  score: number;
  /** Signal phrases / description keywords from the behavior text that matched. */
  matched: string[];
}

export interface Advice {
  behavior: string;
  /** Best match, or null when nothing scored. */
  best: RankedOperator | null;
  /** Top ranked operators (including `best`), each with score > 0. */
  results: RankedOperator[];
  /** True when there is a clear single winner. */
  confident: boolean;
}
