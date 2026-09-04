# The Orchestrator Died. The Work Didn’t. — slideshow

This directory contains the HyperFrames slideshow for the durable agent-tree demo.

The 20-slide deck contrasts a process-owned agent run with a Temporal-owned one:
the shared bug and agent tree, the baseline plan, fan-out, resume, kill, and
restart-from-zero, then the Temporal Workflow start, Child Workflow identities,
heartbeat-driven resume, replay on a replacement Worker, and the same Git diff.

## Present

From this directory:

```bash
npm run present   # serves this directory on http://localhost:3004
```

Click **Present** to open the audience tab. Use the presenter tab for editable speaker notes and the audience tab for screen sharing.

- Google Meet: share the audience tab.
- Zoom: drag the audience tab into its own window and share that window.

The root `index.html` is the direct-open wrapper. The raw HyperFrames composition lives in `composition/index.html`.

## Validate

```bash
npm run check
npm run snapshot
```

The supported deliverable is the live slideshow and per-slide stills. HyperFrames currently truncates slideshow decks when rendered as one linear MP4, so this project intentionally has no video-render command.
