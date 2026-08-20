# The Orchestrator Died. The Work Didn’t. — slideshow

This directory contains the HyperFrames slideshow for the durable agent-tree demo.

The 29-slide main line now follows the implementation from `POST /api/runs`
through Workflow start, Task Queue polling, Activity and Child Workflow fan-out,
heartbeat projection, process-group failure, timeout and retry, Workflow replay,
checkpoint restoration, final tests, and the Git diff. The replay slide opens a
two-slide Event History microscope for deeper Q&A.

## Present

From this directory:

```bash
npm run present
```

Click **Present**, or press **P**, to open the audience tab. Use the presenter tab for editable speaker notes and the audience tab for screen sharing.

- Google Meet: share the audience tab.
- Zoom: drag the audience tab into its own window and share that window.

The root `index.html` is the direct-open wrapper. The raw HyperFrames composition lives in `composition/index.html`.

## Validate

```bash
npm run check
npm run snapshot
```

The supported deliverable is the live slideshow and per-slide stills. HyperFrames currently truncates slideshow decks when rendered as one linear MP4, so this project intentionally has no video-render command.
