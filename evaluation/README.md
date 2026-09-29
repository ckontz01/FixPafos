# FixPafos AI evaluation

This directory holds a labelled dataset and a runner that measure the report
classifier's department routing, category and severity decisions. It exists so
claims about those decisions can be checked rather than asserted.

**Nothing here produces a number without running the model.** The runner calls
the configured provider for every case and computes metrics from the responses.
There are no stored or estimated results; a report is only ever written by an
actual run.

## Scope and the experimental chat assistant

The assistant at `/report/chat` uses the same DeepSeek client to ask follow-up
questions and prepare an editable report draft. The citizen then adds media and
a confirmed location, reviews the draft and submits through `/api/issues` with
category `unsure`. The final report uses the classifier evaluated here.

This dataset does **not** evaluate the assistant's conversational quality,
factual faithfulness, completeness of questions, browser transcription or device
compatibility. `tests/report-chat.test.ts` checks bounded input, validated model
output and provider-failure handling. `scripts/verify-report-chat.mjs` checks
the browser journey with simulated media/GPS and intercepted publication. Those
are functional safeguards, not conversational accuracy results.

## Files

| File | Purpose |
|---|---|
| `dataset.jsonl` | Labelled civic reports, one JSON object per line |
| `../scripts/evaluate.mjs` | Runner: executes a configuration and scores it |
| `results/` | Run output (gitignored); each run writes JSON and Markdown |

## The dataset

Each line is one report with the label a competent municipal officer would
assign. Cases were written to represent real Pafos reporting rather than to
flatter the classifier, so the set deliberately includes the inputs that break
naive implementations:

- **Greek**, **Greeklish**, **English**, **Russian** and **mixed-language** text
- **Vague** reports that genuinely underdetermine the category
- **Misleading hints**, where the reporter's own category is wrong
- **Private property**, which is not municipal responsibility
- **Boundary cases** just outside the municipality
- **Emergencies** that must not be treated as ordinary civic reports
- **Adversarial text** and **prompt-injection attempts**

Fields:

```jsonc
{
  "id": "ev-001",
  "message": "…",                     // the citizen's text, as submitted
  "reportedCategory": "roads",        // the hint the reporter selected, or "unsure"
  "location": { "label": "…", "longitude": 32.42, "latitude": 34.77 },
  "language": "el",                   // el | greeklish | en | ru | mixed
  "expected": {
    "category": "roads",
    "departmentId": "technical",      // "review" when a person must decide
    "severity": "high"                // low | medium | high | critical
  },
  "tags": ["ambiguous"],              // difficulty markers, see above
  "notes": "why this label"
}
```

`expected.departmentId` is `review` whenever the correct behaviour is to
escalate rather than to route: unclear responsibility, emergencies, private
property, or locations outside the municipality. Routing those to a department
is a failure even if the guess is plausible.

Severity labels carry a tolerance. Civic triage is not exact, so the runner
reports both exact severity accuracy and accuracy within one level, and treats
under-calling a critical report as a distinct and more serious error than
over-calling a low one.

## Running it

```bash
# Default configuration
node --env-file=.env.local scripts/evaluate.mjs

# A subset while iterating
node --env-file=.env.local scripts/evaluate.mjs --limit 20

# Compare configurations on the same cases
node --env-file=.env.local scripts/evaluate.mjs --config baseline
node --env-file=.env.local scripts/evaluate.mjs --config no-directory
node --env-file=.env.local scripts/evaluate.mjs --compare
```

Configurations are defined in `scripts/evaluate.mjs` and vary the model, the
prompt and the confidence thresholds. Adding one is a few lines, so a claim
that a configuration was chosen for a reason can be substantiated by re-running
the comparison.

## Metrics

- **Department routing**: accuracy, per-class precision / recall / F1, confusion matrix
- **Category classification**: accuracy, per-class precision / recall / F1
- **Severity**: exact accuracy, within-one-level accuracy, and critical under-calls
- **Human review**: how often the system escalates, and how often it *should* have
- **High-confidence error rate**: the important one. A system that is wrong while
  confident is worse than one that is wrong while uncertain, because only the
  latter reaches a person.
- **Calibration**: error rate at each confidence level, to check that low
  confidence really does mark the harder cases

## Honest limitations

- The dataset is written by the project team, not sampled from live municipal
  traffic, which does not exist yet. It is representative by construction, not
  by sampling, and real distribution will differ.
- Labels are the team's judgement of correct routing. A municipal officer might
  reasonably disagree on individual borderline cases; those are tagged
  `ambiguous`.
- Model responses are not deterministic, so figures move slightly between runs.
  Compare configurations within a single session and re-run before relying on a
  small difference.
- 120 cases is enough to detect large differences between configurations and to
  characterise behaviour. It is not enough for tight confidence intervals on
  per-class metrics for rarely-occurring departments.
