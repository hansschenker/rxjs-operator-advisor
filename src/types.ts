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
