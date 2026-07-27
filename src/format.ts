import type { FlatteningOption, RankedOption, Recommendation } from "./types.js";

function optionLine(o: FlatteningOption): string {
  const variant = o.bareVariant ? ` (bare form: ${o.bareVariant})` : "";
  return `${o.operator} — ${o.policy}${variant}`;
}

/** A compact decision guide over all flattening options (from the ontology). */
export function formatGuide(options: FlatteningOption[]): string {
  const rows = options.map((o) => `  • ${optionLine(o)}\n      ${o.policyDescription}`);
  return ["Higher-order operator decision guide:", ...rows].join("\n");
}

function altSummary(alt: RankedOption): string {
  return `${alt.option.operator} (${alt.option.policy})`;
}

/** Render a recommendation for the CLI. Falls back to the guide when unsure. */
export function formatRecommendation(
  rec: Recommendation,
  allOptions: FlatteningOption[],
): string {
  if (!rec.best) {
    return [
      `No clear match for: "${rec.behavior}"`,
      "Try describing concurrency intent (parallel / latest / in-order / ignore-while-busy).",
      "",
      formatGuide(allOptions),
    ].join("\n");
  }

  const { option, matched } = rec.best;
  const lines: string[] = [];
  const header = rec.confident ? "Recommended operator" : "Best guess (low confidence)";
  lines.push(`${header}: ${option.operator}  [policy: ${option.policy}]`);
  lines.push("");
  lines.push(option.operatorDescription);
  if (option.bareVariant) {
    lines.push(`Bare (non-mapping) form: ${option.bareVariant}.`);
  }
  lines.push(`Import from: ${option.exportSites.join(", ")}.`);
  if (matched.length > 0) {
    lines.push(`Matched on: ${matched.join(", ")}.`);
  }

  const others = rec.alternatives.filter((a) => a.score > 0 && a !== rec.best);
  if (!rec.confident && others.length > 0) {
    lines.push("");
    lines.push(`Also consider: ${others.map(altSummary).join(", ")}.`);
  }
  return lines.join("\n");
}
