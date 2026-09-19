import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { score } from "./evaluation-metrics.ts";

/**
 * AI evaluation runner.
 *
 * Executes the labelled cases in evaluation/dataset.jsonl through the
 * classifier the application actually ships, and scores the responses with the
 * shared metric functions in evaluation-metrics.ts.
 *
 * Every number in a report comes from an executed run. This script cannot
 * produce a figure without calling the model, and no result is committed to the
 * repository, so a reported metric is always reproducible rather than asserted.
 *
 *   npm run evaluate
 *   npm run evaluate -- --config terse --limit 30
 *   npm run evaluate -- --compare
 */

// Imported through tsx (see the commands above), so the evaluation measures the
// classifier the application actually ships rather than a copy of it.
const { classifyIssue, DEFAULT_SYSTEM_PROMPT } = await import(
  "../src/lib/assignment.ts"
);

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--")
    ? args[i + 1]
    : fallback;
};
const has = (name) => args.includes(`--${name}`);

/**
 * Configurations under comparison. Adding one is a few lines, so "this
 * configuration was chosen for a reason" can be substantiated by re-running the
 * comparison. `baseline` is exactly what the application ships.
 */
export const CONFIGS = {
  baseline: {
    label: "Shipped configuration",
    config: {},
  },
  "no-directory": {
    label: "Without the service directory in the prompt",
    // Measures how much routing accuracy comes from giving the model each
    // service's actual remit rather than just its name.
    config: {
      system: DEFAULT_SYSTEM_PROMPT.replace(
        /Pick ONLY from this directory: \{.*?\}\. /s,
        "Pick ONLY from these department identifiers: technical, sewerage, water, cleaning, green, traffic, health, review. ",
      ),
    },
  },
  "no-escalation-guidance": {
    label: "Without explicit escalation guidance",
    // Measures whether emergencies, private property and out-of-area reports
    // are escalated on the model's own judgement or only because it is told to.
    config: {
      system: DEFAULT_SYSTEM_PROMPT.replace(
        "Use review with low confidence for unclear responsibility, emergencies, private plumbing, major highways, or locations in neighbouring municipalities. ",
        "",
      ),
    },
  },
  terse: {
    label: "Minimal prompt",
    config: {
      system:
        "Route a civic issue in Pafos, Cyprus to a department and estimate severity. Call classify_issue exactly once.",
    },
  },
};

export function loadDataset(limit, file = "evaluation/dataset.jsonl") {
  const lines = readFileSync(file, "utf8").trim().split("\n");
  const cases = lines.map((line, i) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${file} line ${i + 1}: ${error.message}`);
    }
  });
  return limit ? cases.slice(0, Number(limit)) : cases;
}

/** Build the same Issue shape the API would construct from a submission. */
function issueFor(testCase) {
  return {
    id: testCase.id,
    author: "Evaluation",
    message: testCase.message,
    location: testCase.location,
    category:
      testCase.reportedCategory === "unsure" ? "other" : testCase.reportedCategory,
    reportedCategory: testCase.reportedCategory,
    assignment: {
      departmentId: "review",
      confidence: "low",
      source: "manual_review",
      category: "other",
    },
    createdAt: Date.now(),
    seconds: 0,
    replies: [],
  };
}

async function runConfig(name, cases) {
  const entry = CONFIGS[name];
  if (!entry) throw new Error(`Unknown config "${name}"`);
  process.stdout.write(
    `\nRunning "${name}" (${entry.label}) over ${cases.length} cases\n`,
  );

  const results = [];
  for (const [index, testCase] of cases.entries()) {
    let classification = null;
    let error = null;
    try {
      classification = await classifyIssue(issueFor(testCase), entry.config);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    results.push({ case: testCase, classification, error });
    if ((index + 1) % 10 === 0)
      process.stdout.write(`  ${index + 1}/${cases.length}\n`);
  }
  return { name, label: entry.label, results };
}

const pct = (v) =>
  v === null || v === undefined ? "n/a" : `${(v * 100).toFixed(1)}%`;

export function toMarkdown(report) {
  const lines = [];
  lines.push(`# Evaluation: ${report.name}`, "", `_${report.label}_`, "");
  lines.push(`- Run: ${report.ranAt}`);
  lines.push(`- Model: \`${report.model}\``);
  lines.push(`- Cases: ${report.cases}`);
  if (report.unusableResponses)
    lines.push(
      `- Unusable responses (rejected by output validation): ${report.unusableResponses}`,
    );
  lines.push("", "## Headline", "", "| Metric | Value |", "|---|---|");
  lines.push(`| Department routing accuracy | ${pct(report.department.accuracy)} |`);
  lines.push(`| Department macro F1 | ${pct(report.department.macroF1)} |`);
  lines.push(`| Category accuracy | ${pct(report.category.accuracy)} |`);
  lines.push(`| Severity exact | ${pct(report.severity.exactAccuracy)} |`);
  lines.push(
    `| Severity within one level | ${pct(report.severity.withinOneAccuracy)} |`,
  );
  lines.push(
    `| Critical under-calls | ${report.severity.criticalUnderCalls} of ${report.severity.criticalCases} |`,
  );
  lines.push(`| Escalation recall | ${pct(report.humanReview.recall)} |`);
  lines.push(`| Escalation precision | ${pct(report.humanReview.precision)} |`);
  lines.push(`| Missed escalations | ${report.humanReview.missedEscalations} |`);

  lines.push(
    "",
    "## Calibration",
    "",
    "Low confidence should mark the harder cases. A flat error rate across",
    "confidence levels would mean the confidence signal carries no information,",
    "and the human-review threshold would be catching the wrong reports.",
    "",
    "| Stated confidence | Cases | Errors | Error rate |",
    "|---|---|---|---|",
  );
  for (const [level, v] of Object.entries(report.calibration))
    lines.push(`| ${level} | ${v.count} | ${v.errors} | ${pct(v.errorRate)} |`);

  lines.push(
    "",
    "## Routing by language",
    "",
    "| Language | Cases | Department accuracy |",
    "|---|---|---|",
  );
  for (const [lang, v] of Object.entries(report.byLanguage))
    lines.push(`| ${lang} | ${v.count} | ${pct(v.departmentAccuracy)} |`);

  lines.push(
    "",
    "## Routing by difficulty",
    "",
    "| Tag | Cases | Department accuracy |",
    "|---|---|---|",
  );
  for (const [tag, v] of Object.entries(report.byTag))
    lines.push(`| ${tag} | ${v.count} | ${pct(v.departmentAccuracy)} |`);

  lines.push(
    "",
    "## Department detail",
    "",
    "| Department | Support | Precision | Recall | F1 |",
    "|---|---|---|---|---|",
  );
  for (const r of report.department.rows)
    lines.push(
      `| ${r.cls} | ${r.support} | ${pct(r.precision)} | ${pct(r.recall)} | ${pct(r.f1)} |`,
    );

  const classes = Object.keys(report.department.confusion);
  lines.push("", "## Confusion matrix (expected to predicted)", "");
  lines.push(`| expected \\ predicted | ${classes.join(" | ")} |`);
  lines.push(`|---|${classes.map(() => "---").join("|")}|`);
  for (const expected of classes)
    lines.push(
      `| **${expected}** | ${classes
        .map((p) => report.department.confusion[expected][p] || "")
        .join(" | ")} |`,
    );

  if (report.humanReview.missedIds.length) {
    lines.push(
      "",
      "## Missed escalations",
      "",
      "Cases that should have reached a person but were routed to a department:",
      "",
      report.humanReview.missedIds.map((id) => `\`${id}\``).join(", "),
    );
  }
  lines.push("");
  return lines.join("\n");
}

function printSummary(report) {
  console.log(`\n=== ${report.name} (${report.label}) ===`);
  console.log(`  department accuracy   ${pct(report.department.accuracy)}`);
  console.log(`  department macro F1   ${pct(report.department.macroF1)}`);
  console.log(`  category accuracy     ${pct(report.category.accuracy)}`);
  console.log(`  severity exact        ${pct(report.severity.exactAccuracy)}`);
  console.log(`  severity within one   ${pct(report.severity.withinOneAccuracy)}`);
  console.log(
    `  critical under-calls  ${report.severity.criticalUnderCalls}/${report.severity.criticalCases}`,
  );
  console.log(`  escalation recall     ${pct(report.humanReview.recall)}`);
  console.log(`  missed escalations    ${report.humanReview.missedEscalations}`);
  if (report.unusableResponses)
    console.log(`  unusable responses    ${report.unusableResponses}`);
}

async function main() {
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error(
      "DEEPSEEK_API_KEY is not set.\n" +
        "The evaluation calls the real model and deliberately cannot produce\n" +
        "figures without it. Run with: npm run evaluate",
    );
    process.exit(1);
  }

  mkdirSync("evaluation/results", { recursive: true });
  const cases = loadDataset(flag("limit"));
  const names = has("compare")
    ? Object.keys(CONFIGS)
    : [flag("config", "baseline")];

  const reports = [];
  for (const name of names) {
    const run = await runConfig(name, cases);
    const report = score({
      ...run,
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
    });
    reports.push(report);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    writeFileSync(
      `evaluation/results/${name}-${stamp}.json`,
      JSON.stringify(report, null, 2),
    );
    writeFileSync(`evaluation/results/${name}-${stamp}.md`, toMarkdown(report));
    printSummary(report);
  }

  if (reports.length > 1) {
    console.log("\n=== Comparison (same cases, same session) ===");
    console.log(
      "configuration".padEnd(26) +
        "dept".padEnd(9) +
        "cat".padEnd(9) +
        "sev+-1".padEnd(9) +
        "esc.recall",
    );
    for (const r of reports)
      console.log(
        r.name.padEnd(26) +
          pct(r.department.accuracy).padEnd(9) +
          pct(r.category.accuracy).padEnd(9) +
          pct(r.severity.withinOneAccuracy).padEnd(9) +
          pct(r.humanReview.recall),
      );
  }

  console.log("\nReports written to evaluation/results/");
}

// Only run when invoked directly, so the tests can import the helpers above.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
