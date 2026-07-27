import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { OntologyGraph } from "./types.js";

/**
 * Node-only entry point for the vendored RxJS ontology graph. This is the ONLY
 * module that touches `node:fs`/`node:url`; the browser bundle imports the JSON
 * directly instead. All pure graph queries live in graph.ts.
 */

const ONTOLOGY_URL = new URL("../data/ontology.graph.json", import.meta.url);

/** Load the vendored RxJS ontology graph (sourced from the rxjs-ontology project). */
export function loadOntology(path: string = fileURLToPath(ONTOLOGY_URL)): OntologyGraph {
  const raw = JSON.parse(readFileSync(path, "utf8")) as OntologyGraph;
  return raw;
}
