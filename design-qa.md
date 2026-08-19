# Design QA

## Comparison target

- Source visual truth: `/Users/richardmoot/.codex/generated_images/01a0172d-6ae3-79d1-98fb-4c79ffd11a24/exec-de7b7f71-d19b-42a7-a1a5-c49ba0f95cdc.png`
- Rendered implementation: `http://localhost:5173/`
- Implementation screenshot: `/Users/richardmoot/Projects/temporal-interview-two/output/design-qa/implementation-investigating-final.png`
- Viewport and pixels: source `1487 x 1058`; implementation CSS viewport `1487 x 1058` at device scale factor `1`, captured as `1487 x 1058` pixels. Both artifacts use the same crop and density, so the final pass required no density normalization.
- State: Temporal durability mode, fixture runtime, `investigating` phase, test investigator selected and expanded.
- Full-view comparison evidence: `/Users/richardmoot/Projects/temporal-interview-two/output/design-qa/comparison-final-full.png`
- Focused comparison evidence: `/Users/richardmoot/Projects/temporal-interview-two/output/design-qa/comparison-final-header.png` and `/Users/richardmoot/Projects/temporal-interview-two/output/design-qa/comparison-final-tree.png`

## Findings

No actionable P0, P1, or P2 findings remain.

- [P3] Runtime data differs from the illustrative source state.
  - Location: phase summary, worker states, progress, and inspector event count.
  - Evidence: the source illustration freezes an investigating moment with two workers complete and three events. The implementation capture records the real fixture at phase entry with zero workers complete and one pending event receipt.
  - Impact: visual hierarchy and geometry match while the data remains honest to the running system.
  - Disposition: accepted as an expected dynamic-state difference.
- [P3] The brand mark and active worker glyph use the Phosphor icon family.
  - Location: top-left brand and worker status icons.
  - Evidence: the source uses a custom plus-like mark and letter badge; the implementation uses `FlowArrow`, `CircleNotch`, and semantic completion icons from one production icon set.
  - Impact: the icon shapes differ slightly while retaining the source's scale, weight, alignment, and state meaning.
  - Disposition: accepted for visual consistency and semantic clarity.
- [P3] Runtime metadata favors verified information.
  - Location: top-right run status.
  - Evidence: the source shows a hard-coded start time; the implementation shows `Fixture runtime` or `Live Codex` because the current snapshot contract does not expose a reliable UI start timestamp.
  - Impact: the interface avoids presenting invented operational data.
  - Disposition: accepted.

## Required fidelity surfaces

- Fonts and typography: the implementation uses the system Apple font stack, compact optical weights, restrained letter spacing, the same hierarchy, and matching two-line coordinator wrapping. Dynamic labels truncate where needed.
- Spacing and layout rhythm: the final desktop capture matches the source's `124px` top bar, `1487 x 1058` frame, coordinator at `x=523, y=290`, first worker at `y=523`, selected worker at `y=623`, final worker at `y=880`, and inspector at `x=1082, y=519`. Card radii, borders, shadows, and gaps follow the source.
- Colors and visual tokens: the off-white canvas, white translucent surfaces, indigo active state, green completion state, red destructive state, and fine gray separators map directly to the source. Contrast remains readable and focus rings are visible.
- Image quality and asset fidelity: this interface has no raster product imagery. Visible icons come from Phosphor Icons, including the external favicon asset; the implementation contains no placeholder artwork or decorative image substitutes.
- Copy and content: phase headings, concise coordinator summaries, worker activity, checkpoints, thread IDs, attempts, event history, durability ownership, and destructive confirmation explain the real state in plain language.
- Responsiveness and accessibility: desktop, `1024px`, and `390px` checks produced equal client and scroll widths with primary controls and the inspector present. Controls are semantic buttons with pressed/expanded states, the modal has dialog labeling, keyboard focus is visible, and reduced-motion preferences disable animation.

## Comparison history

### Iteration 1

- Evidence: `/Users/richardmoot/Projects/temporal-interview-two/output/design-qa/comparison-v1.png`
- [P2] The execution column was too wide and the coordinator sat too far left compared with the source.
- [P2] An extra phase kicker, oversized heading, gray canvas, and explanatory footer changed above-the-fold density.
- [P2] The coordinator-to-worker connector and worker rhythm placed the first worker roughly `17px` too high.
- Fixes: inset the execution grid to the source width, aligned the coordinator to the page center, removed the phase kicker and passive footer, reduced the heading scale, lightened the canvas, shortened coordinator copy to two lines, rebuilt the connector geometry, and tuned worker heights and gaps.

### Final pass

- Evidence: `/Users/richardmoot/Projects/temporal-interview-two/output/design-qa/comparison-final-full.png`, plus the focused header and execution-tree comparisons above.
- Result: major-region geometry, hierarchy, typography, surface treatment, and interaction emphasis align with the selected source. Remaining differences are the expected P3 runtime and icon-family deviations listed above.

## Primary interactions tested

- Switch between Baseline and Temporal durability modes.
- Start a run and observe phase, worker, thread, attempt, checkpoint, and event updates.
- Select and expand each worker, switch the contextual inspector, and open full event history.
- Open and cancel/confirm the destructive worker-stop dialog.
- Verify Baseline loses process state after a stop.
- Verify Temporal preserves the execution, restarts workers, resumes checkpoints, and reaches the completion receipt and final diff.
- Verify desktop, tablet, and mobile layouts avoid horizontal overflow.

## Verification

- Browser console after the final navigation: `0` errors and `0` warnings.
- Type checks: passed.
- Unit and integration tests: `24` passed across `8` files.
- Production build: passed.
- End-to-end recovery presentation: `1` passed.

## Implementation checklist

- [x] Match the selected focused-tree composition.
- [x] Keep operational state visible at the phase, worker, checkpoint, and event levels.
- [x] Hide runtime selection during an active run and reveal contextual details on selection.
- [x] Require confirmation for destructive worker shutdown.
- [x] Preserve responsive and accessible interaction behavior.
- [x] Clear P0, P1, and P2 design-QA findings.

final result: passed
