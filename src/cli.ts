import { loadOntology } from "./ontology.js";
import { flatteningOptions } from "./graph.js";
import { adviseOperators } from "./advisor.js";
import { formatAdvice, formatGuide } from "./format.js";

function main(): void {
  const graph = loadOntology();
  const args = process.argv.slice(2);
  const first = args[0];

  // `advise` with no args, or `advise list/guide`, prints the flattening guide.
  if (args.length === 0 || first === "list" || first === "guide") {
    console.log(formatGuide(flatteningOptions(graph)));
    return;
  }

  const behavior = args.join(" ");
  console.log(formatAdvice(adviseOperators(graph, behavior)));
}

main();
