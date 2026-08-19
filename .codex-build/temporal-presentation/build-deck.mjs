import fs from 'node:fs/promises';
import path from 'node:path';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const ROOT = '/Users/richardmoot/Projects/temporal-interview-two';
const BUILD = path.join(ROOT, '.codex-build/temporal-presentation');
const FINAL = path.join(ROOT, 'temporal-durable-agent-execution.pptx');
const RENDERED = path.join(BUILD, 'rendered');

const W = 1280;
const H = 720;
const C = {
  canvas: '#FFFFFF',
  ink: '#111318',
  muted: '#60646F',
  panel: '#F2F3F6',
  panel2: '#E9EAF0',
  rule: '#C7CAD2',
  purple: '#5B4FE9',
  purpleSoft: '#E9E7FF',
  green: '#248A3D',
  greenSoft: '#E7F6EA',
  red: '#D92D3A',
  redSoft: '#FDEBED',
  amber: '#C47B00',
  navy: '#1B2338',
};

const FONT = 'Helvetica Neue';
const MONO = 'Menlo';

function addText(slide, text, x, y, w, h, options = {}) {
  const shape = slide.shapes.add({
    geometry: 'textbox',
    name: options.name,
    position: { left: x, top: y, width: w, height: h },
    fill: 'none',
    line: { style: 'solid', fill: 'none', width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    fontSize: options.fontSize ?? 24,
    typeface: options.typeface ?? FONT,
    color: options.color ?? C.ink,
    bold: options.bold ?? false,
    alignment: options.align ?? 'left',
    verticalAlignment: options.vertical ?? 'top',
    autoFit: options.autoFit ?? 'shrinkText',
    wrap: 'square',
    lineSpacing: options.lineSpacing ?? 1.05,
    insets: options.insets ?? { top: 0, right: 0, bottom: 0, left: 0 },
  };
  return shape;
}

function addRect(slide, x, y, w, h, fill, options = {}) {
  return slide.shapes.add({
    geometry: options.geometry ?? 'rect',
    name: options.name,
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: {
      style: 'solid',
      fill: options.lineFill ?? 'none',
      width: options.lineWidth ?? 0,
    },
    ...(options.borderRadius ? { borderRadius: options.borderRadius } : {}),
  });
}

function addLine(slide, x, y, w, h = 0, options = {}) {
  return slide.shapes.add({
    geometry: 'straightConnector1',
    name: options.name,
    position: { left: x, top: y, width: w, height: h },
    fill: 'none',
    line: {
      style: options.style ?? 'solid',
      fill: options.fill ?? C.rule,
      width: options.width ?? 2,
    },
  });
}

function addCircle(slide, x, y, size, fill, lineFill = 'none') {
  return slide.shapes.add({
    geometry: 'ellipse',
    position: { left: x, top: y, width: size, height: size },
    fill,
    line: { style: 'solid', fill: lineFill, width: lineFill === 'none' ? 0 : 1 },
  });
}

function addSlideTitle(slide, title, slideNumber, eyebrow = 'DURABLE AGENT EXECUTION') {
  addText(slide, eyebrow, 54, 34, 420, 24, {
    fontSize: 15,
    bold: true,
    color: C.purple,
    name: 'eyebrow',
  });
  addText(slide, title, 54, 70, 1172, 72, {
    fontSize: 48,
    bold: true,
    name: 'slide-title',
    autoFit: 'shrinkText',
  });
  addText(slide, String(slideNumber).padStart(2, '0'), 1180, 676, 46, 18, {
    fontSize: 14,
    color: C.muted,
    align: 'right',
    name: 'slide-number',
  });
}

function addNotes(slide, body, sources) {
  const sourceLines = sources.map((source) => `- ${source}`).join('\n');
  slide.speakerNotes.textFrame.setText(`${body}\n\n[Sources]\n${sourceLines}\n[/Sources]`);
  slide.speakerNotes.setVisible(true);
}

function addBulletList(slide, items, x, y, w, options = {}) {
  const fontSize = options.fontSize ?? 24;
  const gap = options.gap ?? 52;
  items.forEach((item, index) => {
    addCircle(slide, x, y + index * gap + 9, 9, options.bulletColor ?? C.purple);
    addText(slide, item, x + 24, y + index * gap, w - 24, gap - 4, {
      fontSize,
      color: options.color ?? C.ink,
      autoFit: 'shrinkText',
    });
  });
}

function addNode(slide, x, y, w, h, label, detail, options = {}) {
  addRect(slide, x, y, w, h, options.fill ?? C.canvas, {
    geometry: 'roundRect',
    borderRadius: 10,
    lineFill: options.lineFill ?? C.rule,
    lineWidth: options.lineWidth ?? 1.5,
  });
  if (options.dot) addCircle(slide, x + 18, y + 18, 10, options.dot);
  addText(slide, label, x + (options.dot ? 38 : 18), y + 15, w - (options.dot ? 54 : 36), 28, {
    fontSize: options.labelSize ?? 22,
    bold: true,
    color: options.labelColor ?? C.ink,
  });
  if (detail) {
    addText(slide, detail, x + 18, y + 48, w - 36, h - 58, {
      fontSize: options.detailSize ?? 18,
      color: options.detailColor ?? C.muted,
      autoFit: 'shrinkText',
    });
  }
}

async function addImage(slide, imagePath, alt, position, options = {}) {
  const bytes = await fs.readFile(imagePath);
  const image = slide.images.add({
    blob: bytes,
    contentType: 'image/png',
    alt,
    fit: options.fit ?? 'contain',
    position,
    geometry: options.geometry ?? 'roundRect',
    borderRadius: options.borderRadius ?? 12,
    ...(options.crop ? { crop: options.crop } : {}),
  });
  return image;
}

async function build() {
  await fs.mkdir(RENDERED, { recursive: true });
  const deck = Presentation.create({ slideSize: { width: W, height: H } });

  // 1 — Cover: Codex Grid slide-01 silhouette.
  {
    const slide = deck.slides.add();
    slide.background.fill = C.canvas;
    addText(slide, 'A DURABLE AGENT EXECUTION FIELD TEST', 54, 48, 560, 26, {
      fontSize: 17,
      bold: true,
      color: C.purple,
      name: 'cover-eyebrow',
    });
    addText(slide, 'The orchestrator died.\nThe work didn’t.', 54, 176, 1110, 232, {
      fontSize: 76,
      bold: true,
      name: 'cover-title',
      autoFit: 'none',
      lineSpacing: 0.92,
    });
    addText(slide, 'How Temporal turns a killable process tree into a durable execution tree', 54, 492, 780, 92, {
      fontSize: 29,
      color: C.muted,
      name: 'cover-subtitle',
    });
    addRect(slide, 54, 626, 1172, 6, C.purple);
    addText(slide, 'Temporal durable agent execution demo', 54, 654, 560, 24, {
      fontSize: 16,
      color: C.muted,
    });
    addNotes(
      slide,
      'Open with the tension: useful agent work is a tree of planning, delegation, tools, tests, and change. The demo asks who owns that tree after the process that started it disappears. State the thesis: the application stays the same; the owner of progress changes.',
      [
        `${ROOT}/docs/how-it-works.md`,
        `${ROOT}/docs/talk-track.md`,
      ],
    );
  }

  // 2 — What we built.
  {
    const slide = deck.slides.add();
    slide.background.fill = C.canvas;
    addSlideTitle(slide, 'We built one workload in two acts', 2);
    addText(slide, 'The task is intentionally small: fix one retry boundary, prove it with four test files, and preserve the final diff.', 54, 156, 1120, 64, {
      fontSize: 25,
      color: C.muted,
    });

    addRect(slide, 54, 254, 554, 176, C.redSoft, { geometry: 'roundRect', borderRadius: 12 });
    addText(slide, 'BEFORE', 80, 278, 130, 24, { fontSize: 16, bold: true, color: C.red });
    addText(slide, 'attempt <= maxAttempts', 80, 330, 480, 52, {
      fontSize: 30,
      typeface: MONO,
      color: C.red,
    });

    addRect(slide, 642, 254, 584, 176, C.greenSoft, { geometry: 'roundRect', borderRadius: 12 });
    addText(slide, 'AFTER', 670, 278, 130, 24, { fontSize: 16, bold: true, color: C.green });
    addText(slide, 'attempt < maxAttempts', 670, 330, 500, 52, {
      fontSize: 30,
      typeface: MONO,
      color: C.green,
    });

    addLine(slide, 54, 486, 1172, 0, { fill: C.rule, width: 1.5 });
    addText(slide, 'ACT I', 54, 516, 160, 28, { fontSize: 17, bold: true, color: C.red });
    addText(slide, 'Process memory owns the run', 54, 552, 460, 46, { fontSize: 31, bold: true });
    addText(slide, 'ACT II', 642, 516, 160, 28, { fontSize: 17, bold: true, color: C.purple });
    addText(slide, 'Event History owns the run', 642, 552, 520, 46, { fontSize: 31, bold: true });
    addText(slide, 'Same code task. Same execution tree. Different owner of continuation.', 54, 626, 1050, 36, {
      fontSize: 24,
      color: C.purple,
      bold: true,
    });
    addNotes(
      slide,
      'Explain why the defect stays plain: the demo isolates orchestration behavior. Both acts ask a coordinator to produce a bounded plan, run two read-only investigations and tests, implement one line, and verify the result. The experiment changes orchestration ownership rather than the application task.',
      [
        `${ROOT}/fixture/src/retry.ts`,
        `${ROOT}/fixture/tests/retry-limit.test.ts`,
        `${ROOT}/docs/how-it-works.md`,
      ],
    );
  }

  // 3 — Workload workflow.
  {
    const slide = deck.slides.add();
    slide.background.fill = C.canvas;
    addSlideTitle(slide, 'The workload is an execution tree, not a chat', 3);
    addText(slide, 'One coordinator creates structure; independent branches gather evidence; the same coordinator resumes to change code.', 54, 148, 1120, 56, {
      fontSize: 24,
      color: C.muted,
    });

    // Connectors first.
    addLine(slide, 194, 328, 880, 0, { fill: C.navy, width: 2 });
    [194, 487, 780, 1074].forEach((x) => addCircle(slide, x - 8, 320, 16, C.navy));
    addLine(slide, 487, 336, 0, 76, { fill: C.rule, width: 2 });
    addLine(slide, 390, 412, 194, 0, { fill: C.rule, width: 2 });

    addText(slide, '01', 150, 260, 90, 30, { fontSize: 18, bold: true, color: C.purple });
    addText(slide, 'Plan', 112, 360, 165, 44, { fontSize: 30, bold: true, align: 'center' });
    addText(slide, 'Exactly two bounded assignments', 92, 416, 205, 64, { fontSize: 20, color: C.muted, align: 'center' });

    addText(slide, '02', 443, 260, 90, 30, { fontSize: 18, bold: true, color: C.purple });
    addText(slide, 'Investigate', 380, 360, 220, 44, { fontSize: 30, bold: true, align: 'center' });
    addNode(slide, 328, 430, 156, 96, 'Source', 'Read-only', { fill: C.panel, labelSize: 21, detailSize: 17 });
    addNode(slide, 496, 430, 156, 96, 'Tests', 'Read-only', { fill: C.panel, labelSize: 21, detailSize: 17 });
    addNode(slide, 412, 540, 156, 86, 'Reproduce', 'Test job', { fill: C.panel, labelSize: 20, detailSize: 17 });

    addText(slide, '03', 736, 260, 90, 30, { fontSize: 18, bold: true, color: C.purple });
    addText(slide, 'Implement', 690, 360, 180, 44, { fontSize: 30, bold: true, align: 'center' });
    addText(slide, 'Resume the planner thread with evidence', 674, 416, 220, 72, { fontSize: 20, color: C.muted, align: 'center' });

    addText(slide, '04', 1030, 260, 90, 30, { fontSize: 18, bold: true, color: C.purple });
    addText(slide, 'Verify', 992, 360, 165, 44, { fontSize: 30, bold: true, align: 'center' });
    addText(slide, '4/4 tests + one-line Git diff', 966, 416, 220, 72, { fontSize: 20, color: C.muted, align: 'center' });

    addNotes(
      slide,
      'Walk the audience through the actual sequence. The planner uses a JSON schema and stays read-only. The source investigator, test investigator, and initial test run fan out before the coordinator resumes in workspace-write mode. Final verification produces the test receipt and Git diff.',
      [
        `${ROOT}/src/temporal/workflows.ts`,
        `${ROOT}/src/baseline/orchestrator.ts`,
        `${ROOT}/docs/how-it-works.md`,
      ],
    );
  }

  // 4 — Act I with runtime evidence.
  {
    const slide = deck.slides.add();
    slide.background.fill = C.canvas;
    addSlideTitle(slide, 'Act I borrows the lifetime of one process', 4, 'ACT I · PROCESS-OWNED ORCHESTRATION');

    addText(slide, 'JS memory owns the continuation.', 54, 166, 410, 90, {
      fontSize: 39,
      bold: true,
      lineSpacing: 0.95,
    });
    addBulletList(slide, [
      'Promises hold the branch structure.',
      'The process tracks thread IDs and test progress.',
      'SIGKILL removes the coordinator and every subprocess.',
    ], 58, 286, 418, { fontSize: 22, gap: 70, bulletColor: C.red });
    addRect(slide, 54, 522, 400, 92, C.redSoft, { geometry: 'roundRect', borderRadius: 10 });
    addText(slide, 'Restart creates a fresh workspace and zeroed snapshot.', 76, 544, 356, 54, {
      fontSize: 22,
      bold: true,
      color: C.red,
      vertical: 'middle',
    });

    addRect(slide, 502, 162, 724, 490, C.panel, { geometry: 'roundRect', borderRadius: 12, lineFill: C.rule, lineWidth: 1 });
    await addImage(
      slide,
      path.join(ROOT, 'output/playwright/baseline-killed.png'),
      'Baseline presentation after the process group is killed, showing interrupted nodes and zero durable test progress.',
      { left: 518, top: 178, width: 692, height: 458 },
      { fit: 'contain', geometry: 'roundRect', borderRadius: 8 },
    );

    addNotes(
      slide,
      'Start the baseline and kill it during investigation. The supervisor targets the exact detached process group, so the coordinator, Codex subprocesses, and test subprocess disappear together. The surviving API can display the final snapshot, but that snapshot contains no continuation. Restart resets the isolated fixture and counters.',
      [
        `${ROOT}/src/baseline/orchestrator.ts`,
        `${ROOT}/src/supervisor/fleet-supervisor.ts`,
        `${ROOT}/output/playwright/baseline-killed.png`,
        `${ROOT}/docs/how-it-works.md`,
      ],
    );
  }

  // 5 — Act II architecture.
  {
    const slide = deck.slides.add();
    slide.background.fill = C.canvas;
    addSlideTitle(slide, 'Act II gives the tree a durable identity', 5, 'ACT II · HISTORY-OWNED ORCHESTRATION');
    addText(slide, 'Workflow code owns the sequence. Activities own external effects. Child Workflows give delegated branches their own histories.', 54, 146, 1130, 58, {
      fontSize: 24,
      color: C.muted,
    });

    // Diagram connectors first.
    addLine(slide, 390, 290, 0, 64, { fill: C.purple, width: 2.5 });
    addLine(slide, 188, 354, 578, 0, { fill: C.purple, width: 2.5 });
    addLine(slide, 188, 354, 0, 74, { fill: C.purple, width: 2 });
    addLine(slide, 476, 354, 0, 74, { fill: C.purple, width: 2 });
    addLine(slide, 766, 354, 0, 74, { fill: C.purple, width: 2 });
    addLine(slide, 188, 526, 0, 56, { fill: C.rule, width: 2 });
    addLine(slide, 476, 526, 0, 56, { fill: C.rule, width: 2 });

    addNode(slide, 242, 220, 296, 70, 'FixWorkflow', 'Plan → fan out → implement → verify', {
      fill: C.purpleSoft,
      lineFill: C.purple,
      lineWidth: 2,
      dot: C.purple,
      detailSize: 18,
    });
    addNode(slide, 78, 428, 220, 98, 'Source child', 'Stable Workflow ID', {
      fill: C.canvas,
      lineFill: C.purple,
      dot: C.purple,
    });
    addNode(slide, 366, 428, 220, 98, 'Test child', 'Stable Workflow ID', {
      fill: C.canvas,
      lineFill: C.purple,
      dot: C.purple,
    });
    addNode(slide, 656, 428, 220, 98, 'Test Activity', 'File-level checkpoints', {
      fill: C.panel,
      lineFill: C.rule,
      dot: C.green,
    });
    addNode(slide, 98, 582, 180, 74, 'Codex Activity', 'External effect', {
      fill: C.panel,
      labelSize: 19,
      detailSize: 16,
    });
    addNode(slide, 386, 582, 180, 74, 'Codex Activity', 'External effect', {
      fill: C.panel,
      labelSize: 19,
      detailSize: 16,
    });

    addLine(slide, 924, 220, 0, 430, { fill: C.rule, width: 1.5 });
    addText(slide, 'TEMPORAL SERVICE', 968, 222, 250, 24, { fontSize: 15, bold: true, color: C.purple });
    addText(slide, 'Event History', 968, 262, 250, 44, { fontSize: 31, bold: true });
    addText(slide, 'Records decisions and completed results.', 968, 316, 246, 64, { fontSize: 20, color: C.muted });
    addText(slide, 'WORKERS', 968, 424, 250, 24, { fontSize: 15, bold: true, color: C.purple });
    addText(slide, 'Disposable compute', 968, 464, 250, 44, { fontSize: 29, bold: true });
    addText(slide, 'Poll Tasks, replay Workflow code, and execute Activities.', 968, 518, 246, 88, { fontSize: 20, color: C.muted });

    addNotes(
      slide,
      'Separate the three Temporal concepts. The parent Workflow contains deterministic control flow. Each investigator becomes a Child Workflow with a stable identity and separate Event History. Codex calls, tests, Git, and filesystem work remain Activities because those operations are external and nondeterministic. Workers execute the code; the Temporal Service preserves the logical execution.',
      [
        `${ROOT}/src/temporal/workflows.ts`,
        `${ROOT}/src/temporal/activities.ts`,
        `${ROOT}/docs/architecture.md`,
        'https://docs.temporal.io/encyclopedia/event-history',
        'https://docs.temporal.io/activities',
      ],
    );
  }

  // 6 — Before/after comparison using Codex Grid slide-11 silhouette.
  {
    const slide = deck.slides.add();
    slide.background.fill = C.canvas;
    addSlideTitle(slide, 'Temporal changes ownership, not the application', 6);
    addText(slide, 'The same execution tree runs in both acts. Four ownership decisions change its failure behavior.', 54, 146, 1120, 48, {
      fontSize: 24,
      color: C.muted,
    });

    addText(slide, 'PROCESS-OWNED', 54, 224, 512, 30, { fontSize: 17, bold: true, color: C.red });
    addText(slide, 'HISTORY-OWNED', 666, 224, 512, 30, { fontSize: 17, bold: true, color: C.purple });
    addRect(slide, 54, 266, 548, 320, C.redSoft, { geometry: 'roundRect', borderRadius: 10 });
    addRect(slide, 642, 266, 584, 320, C.purpleSoft, { geometry: 'roundRect', borderRadius: 10 });

    const rows = [
      ['Run identity', 'Process + promises', 'Workflow ID + Event History'],
      ['Delegation', 'Local promise branches', 'Child Workflows'],
      ['External work', 'Direct subprocess calls', 'Retryable Activities'],
      ['In-flight progress', 'Heap state', 'Heartbeat checkpoints'],
    ];
    rows.forEach(([label, before, after], index) => {
      const y = 292 + index * 72;
      if (index > 0) {
        addLine(slide, 78, y - 12, 500, 0, { fill: '#E8BFC4', width: 1 });
        addLine(slide, 666, y - 12, 536, 0, { fill: '#C9C4FF', width: 1 });
      }
      addText(slide, label, 78, y, 148, 28, { fontSize: 17, bold: true, color: C.muted });
      addText(slide, before, 230, y, 344, 32, { fontSize: 22, bold: true });
      addText(slide, label, 666, y, 148, 28, { fontSize: 17, bold: true, color: C.muted });
      addText(slide, after, 818, y, 376, 32, { fontSize: 22, bold: true });
    });
    addText(slide, 'Kill the process → the continuation disappears.', 78, 610, 500, 40, { fontSize: 21, bold: true, color: C.red });
    addText(slide, 'Kill the Worker → the continuation waits.', 666, 610, 536, 40, { fontSize: 21, bold: true, color: C.purple });

    addNotes(
      slide,
      'Emphasize the migration: orchestration state moves into a Workflow; delegated branches become Child Workflows; nondeterministic calls become Activities; in-flight checkpoints become heartbeats. The model prompt, source repository, test contract, and final change remain the same.',
      [
        `${ROOT}/docs/how-it-works.md`,
        `${ROOT}/docs/architecture.md`,
        `${ROOT}/src/temporal/workflows.ts`,
      ],
    );
  }

  // 7 — Recovery timeline based on Codex Grid slide-17.
  {
    const slide = deck.slides.add();
    slide.background.fill = C.canvas;
    addSlideTitle(slide, 'Recovery is replay plus targeted retries', 7);
    addText(slide, 'Worker replacement reconstructs the same Workflow state, then resumes only the operations that lack recorded completion.', 54, 146, 1120, 58, {
      fontSize: 24,
      color: C.muted,
    });

    const xs = [96, 340, 584, 828, 1072];
    addLine(slide, xs[0], 340, xs[4] - xs[0], 0, { fill: C.navy, width: 2.5 });
    xs.forEach((x, index) => addCircle(slide, x - 10, 330, 20, index === 0 ? C.red : index === 4 ? C.green : C.purple));
    const steps = [
      ['01', 'Kill compute', 'SIGKILL removes the Worker process group.'],
      ['02', 'History waits', 'The Workflow ID and recorded results remain.'],
      ['03', 'Replay', 'A replacement Worker rebuilds Workflow state.'],
      ['04', 'Retry incomplete work', 'Codex resumes by thread ID; tests skip passed files.'],
      ['05', 'Finish', 'Verification reaches 4/4 and records the diff.'],
    ];
    steps.forEach(([number, title, detail], index) => {
      const x = xs[index] - 92;
      addText(slide, number, x, 256, 184, 24, { fontSize: 16, bold: true, color: index === 0 ? C.red : index === 4 ? C.green : C.purple, align: 'center' });
      addText(slide, title, x, 382, 184, 54, { fontSize: 24, bold: true, align: 'center' });
      addText(slide, detail, x, 446, 184, 110, { fontSize: 18, color: C.muted, align: 'center' });
    });
    addRect(slide, 192, 604, 896, 52, C.purpleSoft, { geometry: 'roundRect', borderRadius: 10 });
    addText(slide, 'Same Workflow ID  ·  same workspace  ·  new compute', 212, 617, 856, 28, {
      fontSize: 22,
      bold: true,
      color: C.purple,
      align: 'center',
    });

    addNotes(
      slide,
      'Narrate the kill and recovery in order. The API freezes its last successful Query result. The Temporal Service retains Event History. Replacement Workers poll the same run-specific Task Queue, replay Workflow code, reuse completed results, and receive new attempts for unfinished Activities. Codex recovery uses a heartbeated thread ID when the local session exists. Test recovery uses heartbeated filenames.',
      [
        `${ROOT}/docs/how-it-works.md`,
        `${ROOT}/tests/temporal-recovery.integration.test.ts`,
        `${ROOT}/src/temporal/activities.ts`,
        'https://docs.temporal.io/workflows#how-workflow-replay-works',
        'https://docs.temporal.io/encyclopedia/detecting-activity-failures#activity-heartbeat',
      ],
    );
  }

  // 8 — State ledger.
  {
    const slide = deck.slides.add();
    slide.background.fill = C.canvas;
    addSlideTitle(slide, 'Durability is a system of state owners', 8);
    addText(slide, 'Temporal preserves orchestration facts. Other systems preserve conversation context, code, and resumable progress.', 54, 146, 1120, 58, {
      fontSize: 24,
      color: C.muted,
    });

    addText(slide, 'STATE', 54, 238, 260, 28, { fontSize: 16, bold: true, color: C.muted });
    addText(slide, 'OWNER', 344, 238, 330, 28, { fontSize: 16, bold: true, color: C.muted });
    addText(slide, 'RECOVERY BEHAVIOR', 724, 238, 488, 28, { fontSize: 16, bold: true, color: C.muted });
    addLine(slide, 54, 278, 1172, 0, { fill: C.ink, width: 2 });

    const ledger = [
      ['Plan + completed results', 'Temporal Event History', 'Replay reconstructs the same logical run.'],
      ['Conversation context', 'Local Codex session', 'Resume the heartbeated thread when it exists.'],
      ['Source edits', 'Isolated Git workspace', 'Files remain across Worker replacement.'],
      ['In-flight progress', 'Activity heartbeats', 'Retry reads thread IDs or passed filenames.'],
    ];
    ledger.forEach(([state, owner, behavior], index) => {
      const y = 304 + index * 82;
      if (index > 0) addLine(slide, 54, y - 16, 1172, 0, { fill: C.rule, width: 1 });
      addText(slide, state, 54, y, 260, 52, { fontSize: 22, bold: true });
      addText(slide, owner, 344, y, 330, 52, { fontSize: 22, color: C.purple, bold: true });
      addText(slide, behavior, 724, y, 488, 52, { fontSize: 21, color: C.muted });
    });

    addRect(slide, 54, 616, 1172, 46, C.panel, { geometry: 'roundRect', borderRadius: 8 });
    addText(slide, 'Event History is an orchestration log, not a copy of the Codex session or Git workspace.', 74, 627, 1132, 28, {
      fontSize: 21,
      bold: true,
      align: 'center',
    });

    addNotes(
      slide,
      'Use this ledger to keep the architecture honest. Event History owns durable decisions and completed results. The Codex session owns conversation continuity. Git owns the source bytes. Heartbeats own server-delivered progress hints. Machine loss remains outside the demonstration because the session and workspace are local.',
      [
        `${ROOT}/docs/how-it-works.md`,
        `${ROOT}/docs/architecture.md`,
      ],
    );
  }

  // 9 — Guarantee boundary.
  {
    const slide = deck.slides.add();
    slide.background.fill = C.canvas;
    addSlideTitle(slide, 'The boundary is part of the design', 9);
    addText(slide, 'Durable orchestration changes what the platform can reconstruct. It does not make every external effect exactly once.', 54, 146, 1120, 58, {
      fontSize: 24,
      color: C.muted,
    });

    const items = [
      ['RECORDED COMPLETION', 'Replay reuses the Activity result.', 'The completed effect does not execute again during Workflow replay.', C.green, C.greenSoft],
      ['HEARTBEAT', 'A resumability hint, not completion.', 'The server can hold a thread ID or passed-file list for a later attempt.', C.purple, C.purpleSoft],
      ['EXTERNAL EFFECT', 'The application still owns safety.', 'Idempotency, deduplication, reconciliation, and model correctness remain application responsibilities.', C.amber, '#FFF4D8'],
    ];
    items.forEach(([label, claim, detail, accent, fill], index) => {
      const y = 246 + index * 122;
      addRect(slide, 54, y, 1172, 96, fill, { geometry: 'roundRect', borderRadius: 10 });
      addRect(slide, 54, y, 8, 96, accent);
      addText(slide, label, 84, y + 18, 230, 24, { fontSize: 15, bold: true, color: accent });
      addText(slide, claim, 330, y + 16, 386, 34, { fontSize: 26, bold: true });
      addText(slide, detail, 746, y + 14, 446, 62, { fontSize: 20, color: C.muted });
    });
    addText(slide, 'Worker loss pauses compute. Workflow cancellation or termination ends the durable execution.', 54, 628, 1172, 34, {
      fontSize: 23,
      bold: true,
      color: C.red,
      align: 'center',
    });

    addNotes(
      slide,
      'Draw the guarantee line precisely. Completed Activity results become recorded facts that replay consumes. Heartbeats report liveness and may carry checkpoints, but they do not close an Activity. An effect can finish before Temporal records completion, so a later attempt can repeat the effect. Production code still needs effect-specific safety controls.',
      [
        `${ROOT}/docs/how-it-works.md`,
        `${ROOT}/src/temporal/activities.ts`,
        'https://docs.temporal.io/activity-execution',
        'https://docs.temporal.io/encyclopedia/detecting-activity-failures#activity-heartbeat',
      ],
    );
  }

  // 10 — Proof.
  {
    const slide = deck.slides.add();
    slide.background.fill = C.canvas;
    addSlideTitle(slide, 'The proof is visible and executable', 10);

    addText(slide, '29', 54, 178, 164, 76, { fontSize: 66, bold: true, color: C.purple });
    addText(slide, 'tests passed', 54, 252, 200, 30, { fontSize: 20, bold: true });
    addText(slide, '10 test files', 54, 286, 200, 28, { fontSize: 18, color: C.muted });

    addText(slide, '1', 278, 178, 100, 76, { fontSize: 66, bold: true, color: C.purple });
    addText(slide, 'browser proof', 278, 252, 200, 30, { fontSize: 20, bold: true });
    addText(slide, 'real kill + restart', 278, 286, 210, 28, { fontSize: 18, color: C.muted });

    addText(slide, '4/4', 54, 370, 164, 72, { fontSize: 58, bold: true, color: C.green });
    addText(slide, 'test checkpoint', 54, 444, 200, 30, { fontSize: 20, bold: true });
    addText(slide, 'after Worker replacement', 54, 478, 230, 44, { fontSize: 18, color: C.muted });

    addText(slide, '1 line', 278, 370, 190, 72, { fontSize: 52, bold: true, color: C.green });
    addText(slide, 'verified diff', 278, 444, 200, 30, { fontSize: 20, bold: true });
    addText(slide, '<= becomes <', 278, 478, 190, 28, { fontSize: 18, color: C.muted, typeface: MONO });

    addRect(slide, 54, 566, 412, 74, C.panel, { geometry: 'roundRect', borderRadius: 10 });
    addText(slide, 'Baseline restart: sequence 0\nTemporal restart: same run ID', 76, 580, 368, 48, {
      fontSize: 20,
      bold: true,
      lineSpacing: 1.05,
    });

    addRect(slide, 510, 158, 716, 494, C.panel, { geometry: 'roundRect', borderRadius: 12, lineFill: C.rule, lineWidth: 1 });
    await addImage(
      slide,
      path.join(ROOT, 'output/playwright/temporal-recovered.png'),
      'Recovered Temporal run showing completed branches, a four-of-four test checkpoint, and the final one-line diff.',
      { left: 526, top: 174, width: 684, height: 462 },
      { fit: 'contain', geometry: 'roundRect', borderRadius: 8 },
    );

    addNotes(
      slide,
      'Treat the screen as an execution receipt. The automated suite starts a real ephemeral Temporal server, kills and replaces Workers, verifies completed Child Workflow reuse and Activity retry behavior, and drives the browser through both acts. The current repository passes 10 test files and 29 tests, the production build and type check, and one end-to-end browser scenario.',
      [
        `${ROOT}/tests/temporal-recovery.integration.test.ts`,
        `${ROOT}/e2e/presentation.spec.ts`,
        `${ROOT}/output/playwright/temporal-recovered.png`,
        `${BUILD}/source-notes.txt`,
      ],
    );
  }

  // 11 — Close.
  {
    const slide = deck.slides.add();
    slide.background.fill = C.navy;
    addText(slide, 'THE DURABLE-EXECUTION SHIFT', 54, 50, 520, 24, {
      fontSize: 16,
      bold: true,
      color: '#AFA8FF',
    });
    addText(slide, 'A Worker executes the work.\nEvent History owns what it means.', 54, 160, 1140, 220, {
      fontSize: 66,
      bold: true,
      color: C.canvas,
      autoFit: 'none',
      lineSpacing: 0.95,
    });
    addText(slide, 'That is the shift from a process tree to a durable execution tree.', 54, 428, 930, 56, {
      fontSize: 28,
      color: '#D7D9E3',
    });
    addLine(slide, 54, 538, 1172, 0, { fill: '#59617B', width: 1.5 });
    addText(slide, 'Delegation', 54, 574, 240, 34, { fontSize: 25, bold: true, color: '#AFA8FF' });
    addText(slide, 'Human approval', 420, 574, 300, 34, { fontSize: 25, bold: true, color: '#AFA8FF' });
    addText(slide, 'Long-running AI work', 832, 574, 360, 34, { fontSize: 25, bold: true, color: '#AFA8FF' });
    addText(slide, '11', 1180, 676, 46, 18, { fontSize: 14, color: '#9FA6BA', align: 'right' });

    addNotes(
      slide,
      'Resolve the opening tension. The process is disposable; the execution meaning is durable. Close by extending the pattern beyond this retry example: durable delegation, durable approval, observable recovery, and versioned long-running work. The key production judgment remains the same: Temporal owns orchestration recovery, while the application owns safe external effects.',
      [
        `${ROOT}/docs/how-it-works.md`,
        `${ROOT}/docs/talk-track.md`,
      ],
    );
  }

  for (const [index, slide] of deck.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, '0')}`;
    const png = await deck.export({ slide, format: 'png', scale: 1 });
    await fs.writeFile(path.join(RENDERED, `${stem}.png`), new Uint8Array(await png.arrayBuffer()));
    const layout = await slide.export({ format: 'layout' });
    await fs.writeFile(path.join(RENDERED, `${stem}.layout.json`), await layout.text());
  }

  const montage = await deck.export({ format: 'webp', montage: true, scale: 1 });
  await fs.writeFile(path.join(BUILD, 'deck-montage.webp'), new Uint8Array(await montage.arrayBuffer()));
  const pptx = await PresentationFile.exportPptx(deck);
  await pptx.save(FINAL);
  console.log(FINAL);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
