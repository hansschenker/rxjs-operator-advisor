import { loadOntology, flatteningOptions } from "./ontology.js";
import { advise } from "./advisor.js";
import { formatRecommendation, formatGuide } from "./format.js";

function main(): void {
  const graph = loadOntology();
  const args = process.argv.slice(2);
  const first = args[0];

  // `advise` with no args, or `advise list/guide`, prints the decision guide.
  if (args.length === 0 || first === "list" || first === "guide") {
    console.log(formatGuide(flatteningOptions(graph)));
    return;
  }

  const behavior = args.join(" ");
  const rec = advise(graph, behavior);
  console.log(formatRecommendation(rec, flatteningOptions(graph)));
}

main();
