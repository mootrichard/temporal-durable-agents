# Frame packet: 01-kill-every-worker

## Project inputs

- Project: /Users/richardmoot/Projects/temporal-interview-two/videos/temporal-durable-agents
- Design tokens: /Users/richardmoot/Projects/temporal-interview-two/videos/temporal-durable-agents/frame.md
- RULES_DIR: /Users/richardmoot/.agents/skills/hyperframes-animation/rules

## Assigned storyboard block

## Frame 1 — Kill every worker

- status: built
- src: compositions/frames/01-kill-every-worker.html
- duration: 3.307s
- poster: 2.9s
- transition_in: cut
- type: hook
- blueprint: compose
- scene: “KILL EVERY WORKER” lands over the real four-pane agent console, then the console loses power while one Workflow identity line remains.
- voiceover: "Kill every worker. The agent run keeps going."
- asset_candidates: .media/images/image_003.png, .media/images/logo_001.svg
- narrativeRole: Open on the outcome Temporal enables, not the implementation; establish the failure test in five words.
- focal: .media/images/image_003.png
- roles: .media/images/image_003.png = background product proof, dim 35% under type · .media/images/logo_001.svg = supporting brand receipt
- sfx: impact-bass-1, error

Use the real agent-console capture as the ground. “KILL” should feel like an action, not a slogan. Source: `README.md` lines 3–12 and `docs/talk-track.md` lines 44–67.

Compose: use the approved console layout and build a four-phase kinetic proof from `dynamic-content-sequencing`, `kinetic-beat-slam`, `discrete-text-sequence`, `chromatic-glitch`, and `asr-keyword-glow`.

Scene 1 (0.0–0.7s): extreme crop on the coordinator pane inside the console capture; `WORKER FLEET ONLINE` and one live receipt reveal via per-word stagger (`dynamic-content-sequencing`) in an asymmetric 70/30 crop with three depth layers.
Scene 2 (0.7–1.8s): `KILL` → `EVERY` → `WORKER` lands as three full-width kinetic beat-slams (`kinetic-beat-slam`), each phrase occupying the upper two-thirds while the console stays readable beneath; the violet action rail advances once per word.
Scene 3 (1.8–2.65s): on `Kill`, the four pane states hard-swap to OFFLINE via discrete state changes (`discrete-text-sequence`); a short deterministic chromatic glitch (`chromatic-glitch`) resolves immediately to a silent, frozen console.
Scene 4 (2.65–3.307s): only the Workflow ID pill remains at lower-right and `THE AGENT RUN KEEPS GOING` reveals chunk-by-chunk; `KEEPS GOING` receives one keyword glow (`asr-keyword-glow`), then everything holds still.

## Selected motion rule: asr-keyword-glow

---
name: asr-keyword-glow
description: Keywords glow + scale up when "spoken" — attack/sustain/release envelope synced to per-word timestamps. Even without real audio, hardcoded timings create a "narrator emphasis" effect.
metadata:
  tags: asr, audio-sync, highlight, glow, keyword, text, speech, emphasis
---

# ASR Keyword Glow

Words in a phrase visually activate (glow blur + scale) when "spoken", following an attack-sustain-release envelope over per-word `{ start, end }` timestamps. In a real ASR pipeline the timings come from a word-level transcript (`hyperframes transcribe` — same shape); for promo video, hand-author them to control emphasis pacing. The envelope never falls to zero after a word — it decays to a rest level, leaving a breadcrumb of recent emphasis.

## How It Works

A single linear driver tween (`ease: "none"` — any other ease distorts the per-word envelope; do not change) sweeps scene time; its `onUpdate` loops over ALL words computing each one's envelope: 0 before `start`, linear attack to 1 over `ATTACK_DUR`, sustain at 1 until `end`, decay to `REST_LEVEL` over `RELEASE`, then hold at rest. The envelope drives `text-shadow` blur and `scale` — one driver for the whole phrase, never one tween per word (60+ words would bloat the timeline).

## Recipe

```html
<!-- inside a standard scene clip (hyperframes-core) -->
<div class="phrase">
  <span class="word" data-word="{w1Key}">{w1}</span>
  <span class="word" data-word="{w2Key}">{w2}</span>
  <!-- … the final word may be the brand, with the .brand modifier -->
  <span class="word brand" data-word="{brandKey}">{brandWord}</span>
</div>
```

```css
.phrase {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  color: {restColor};
}
.word {
  display: inline-block; /* required for transform on <span> */
  transform-origin: 50% 50%;
  text-shadow: 0 0 0 {glowColorTransparent};
}
.word.brand {
  color: {brandAccentColor};
}
```

```js
// Per-word spoken windows — one entry per span; brand word 1.5-2× a normal word's window.
const TIMINGS = {
  // {w1Key}: { start: …, end: … },  — seconds, local to the scene
};

function envelope(time, start, end) {
  if (time < start) return 0;
  if (time < end) return Math.min((time - start) / ATTACK_DUR, 1);
  const releaseEnd = end + RELEASE;
  if (time < releaseEnd) return 1 - ((time - end) / RELEASE) * (1 - REST_LEVEL);
  return REST_LEVEL;
}

const words = document.querySelectorAll(".word");
const driver = { t: 0 };
tl.to(
  driver,
  {
    t: SCENE_DURATION,
    duration: SCENE_DURATION,
    ease: "none", // linear — t maps 1:1 to scene time
    onUpdate: () => {
      words.forEach((el) => {
        const timing = TIMINGS[el.dataset.word];
        if (!timing) return;
        const env = envelope(driver.t, timing.start, timing.end);
        el.style.textShadow = `0 0 ${MAX_BLUR * env}px ${glowColorRgba(env)}`;
        el.style.transform = `scale(${1 + MAX_SCALE_BOOST * env})`;
      });
    },
  },
  0,
);
```

`glowColorRgba(env)` returns the glow color with `env`-modulated alpha.

## Variations

- **Karaoke style (RECOMMENDED for video narration)** — the default amplitudes read too subtle in video: inactive words still dominate. Render inactive words DIM and lerp the active word toward bright + larger; at any moment 1–2 words are bright (spoken + lingering rest) and the rest is dim. Use for short phrases (5–10 words) where one word at a time should POP; keep the subtle default for long dense text. Pushes MAX_BLUR, MAX_SCALE_BOOST, and REST↔ACTIVE contrast; everything else identical:

```js
function lerpChannel(a, b, t) {
  return Math.round(a + (b - a) * t);
}
function colorAt(env, isBrand) {
  const target = isBrand ? BRAND_RGB : ACTIVE_RGB;
  return `rgb(${lerpChannel(REST_RGB.r, target.r, env)}, ${lerpChannel(REST_RGB.g, target.g, env)}, ${lerpChannel(REST_RGB.b, target.b, env)})`;
}
// in onUpdate: el.style.color = colorAt(env, el.classList.contains("brand"));
```

- **Multi-octave glow** — multiply the sustain by `1 + sin(driver.t × PULSE_HZ) × PULSE_AMPLITUDE` so high-emphasis words breathe at peak.
- **Color shift on the peak** — same channel-lerp from `restColor` → `peakColor` as `env` rises (non-karaoke form).
- **3D pop-out** — add `translateZ(env × MAX_POP_Z)` so the spoken word leans toward camera; requires `perspective` on the parent.
- **From real ASR transcripts** — convert `{ word, start_ms, end_ms }` entries to seconds and feed in identically.

## Values

| token           | default style        | karaoke style | notes                                                      |
| --------------- | -------------------- | ------------- | ---------------------------------------------------------- |
| ATTACK_DUR      | 0.1–0.25s            | same          | must be < the shortest word's window or it never reaches 1 |
| RELEASE         | 0.2–0.5s             | same          | decay to rest                                              |
| REST_LEVEL      | 0.15–0.4             | 0.05–0.2      | > 0 (breadcrumb), < 1                                      |
| MAX_BLUR        | 15–25px              | 30–45px       | bigger = "shouting"                                        |
| MAX_SCALE_BOOST | 0.03–0.10            | 0.15–0.25     | additive at peak (0.08 ⇒ scale 1.08)                       |
| PULSE_HZ / AMP  | 4–10 rad/s / 0.1–0.3 | —             | multi-octave variation                                     |
| MAX_POP_Z       | 20–60px              | —             | 3D variation                                               |
| SCENE_DURATION  | = `data-duration`    | same          | driver must end in sync with the scene's seek window       |

## Critical Constraints

- **Timings monotonic, non-overlapping** — every entry's `end` < the next entry's `start`; overlapping windows make the envelope ambiguous.
- **Brand word window 1.5–2× a normal word** — the brand is the headline; let it sustain.
- **Driver ease stays `"none"`** — any other ease warps every word's envelope timing.
- **`text-shadow`, not `box-shadow`** — the glow must hug the GLYPH (speaking emphasis), not the inline-block rectangle.
- **One driver looping all words** — never one tween per word.
- **Commit to a style** — values between the default and karaoke columns yield awkward "half-loud" emphasis.
- **Climax dwell ≥1s** after the final word's emphasis — the last word IS the headline beat.

## See also

`3d-text-depth-layers` (depth on the active word at peak) · `sine-wave-loop` (idle breathe between emphasis moments) · `context-sensitive-cursor` (typewriter matching the ASR cadence) · `/media-use` for `hyperframes transcribe` and caption rendering.

## Selected motion rule: chromatic-glitch

---
name: chromatic-glitch
description: RGB-split / slice glitch that snaps sharp — offset color copies jitter on a deterministic hash of quantized timeline time (never Math.random), or horizontal slices displace and converge; a brief vibration, then a clean resolve. Entrance or emphasis punctuation; finite, seek-safe.
metadata:
  tags: glitch, rgb-split, chromatic, slice, jitter, stutter, text, snap, distortion
---

# Chromatic Glitch

Digital interference as punctuation: for a fraction of a second the element **breaks** — offset color copies shudder behind it, or horizontal slices displace sideways — then it **snaps sharp** and holds clean. The payoff is the resolve; the glitch exists to make the clean state land harder. Two forms: an **RGB-split jitter** (warm + cool ghost copies vibrating behind the base) and a **slice displacement** (horizontal bands that arrive offset and converge).

Boundaries: [motion-blur-streak.md](motion-blur-streak.md) is velocity blur tied to **travel** — its element is going somewhere fast. A glitching element is **in place**; the disturbance is temporal, not directional. [hacker-flip-3d.md](hacker-flip-3d.md) substitutes **glyphs** (a decode); here the glyphs are fixed and only displaced copies of them move.

## How It Works

The subject is stacked: the **base copy on top** (full legibility at every frame), ghost copies behind. All motion comes from one finite **amplitude-envelope** tween read by an `onUpdate`:

1. **Quantized time** — `const step = Math.floor(tl.time() / JITTER_STEP)`. The stutter comes from offsets that hold for `JITTER_STEP` and then jump. Smoothly interpolated offsets read as wobble, not glitch — **the quantization IS the digital texture**.
2. **Deterministic hash** — offsets are a pure function of `(step, layerIndex)`:

   ```js
   const glitchHash = (n) => {
     const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
     return x - Math.floor(x); // 0..1, pure — a scrub to any t recomputes the same frame
   };
   ```

3. **Amplitude envelope** — a proxy tween carries `amp: 1 → 0` over `GLITCH_DUR`. Per-frame offset = `amp × (glitchHash(step * 13 + layer * 7) * 2 − 1) × MAX_SPLIT`. When the envelope hits zero the copies sit at exactly 0 — the snap-sharp is built into the math, and a final `tl.set` clamps the rest state so the hold is bit-exact.

The **slice form** swaps color copies for `SLICE_COUNT` full copies, each clipped to a horizontal band via `clip-path: inset()`; per-band `x` (and optional `scaleX` stretch) start at hash-derived offsets and converge to 0 under a stepped ease.

## Recipe

```html
<!-- inside a standard scene clip (hyperframes-core) -->
<!-- Form A: RGB-split — ghosts behind, base on top. Copies metric-identical (one grid cell, same font stack); aria-hidden on every non-base copy. -->
<div class="glitch-stack" id="glitch-stack">
  <span class="glitch-copy warm" aria-hidden="true">{glitchText}</span>
  <span class="glitch-copy cool" aria-hidden="true">{glitchText}</span>
  <span class="glitch-base">{glitchText}</span>
</div>
```

```css
.glitch-stack {
  display: grid; /* all copies share one cell — pixel-identical boxes */
}
.glitch-base,
.glitch-copy {
  grid-area: 1 / 1;
}
.glitch-base {
  z-index: 2; /* grid items take z-index without position */
  color: {textColor};
}
.glitch-copy {
  z-index: 1;
  opacity: 0; /* raised only while the envelope is live */
  will-change: transform; /* updates every frame while live */
  mix-blend-mode: screen; /* additive on dark bg; drop to normal (and lower opacity) on light */
}
.glitch-copy.warm {
  color: {warmSplit}; /* classic: red/orange */
}
.glitch-copy.cool {
  color: {coolSplit}; /* classic: cyan/blue */
}
```

```js
// Form A: RGB-split jitter — envelope snaps to full amplitude, decays to zero.
// All per-frame state derives from tl.time() + the envelope: pure, replays on seek.
const copies = gsap.utils.toArray("#glitch-stack .glitch-copy");
const amp = { a: 0 };
tl.set(amp, { a: 1 }, GLITCH_START);
tl.set(copies, { opacity: SPLIT_OPACITY }, GLITCH_START);
tl.to(
  amp,
  {
    a: 0,
    duration: GLITCH_DUR,
    ease: "power3.in", // most of the violence up front, dying fast
    onUpdate: () => {
      const step = Math.floor(tl.time() / JITTER_STEP); // quantized — the stutter
      copies.forEach((el, layer) => {
        const jx = (glitchHash(step * 13 + layer * 7) * 2 - 1) * MAX_SPLIT * amp.a;
        const jy = (glitchHash(step * 29 + layer * 11) * 2 - 1) * MAX_SPLIT * 0.35 * amp.a;
        gsap.set(el, { x: jx, y: jy });
      });
    },
  },
  GLITCH_START,
);
// The clean resolve: clamp ghosts to exact rest — never rely on the decay
// landing on zero. A ghost left 1px off reads as a bug every frame after.
tl.set(copies, { x: 0, y: 0, opacity: 0 }, GLITCH_START + GLITCH_DUR);

// Form B: slice displacement — N band copies of the same content converge.
const slices = gsap.utils.toArray("#slice-stack .slice");
const bandH = 100 / slices.length;
slices.forEach((el, i) => {
  gsap.set(el, { clipPath: `inset(${i * bandH}% 0 ${100 - (i + 1) * bandH}% 0)` });
  const dir = glitchHash(i * 3 + 1) > 0.5 ? 1 : -1;
  tl.fromTo(
    el,
    {
      x: dir * (SLICE_OFFSET_MIN + glitchHash(i * 5 + 2) * (SLICE_OFFSET_MAX - SLICE_OFFSET_MIN)),
      scaleX: 1 + glitchHash(i * 7 + 3) * SLICE_STRETCH,
      opacity: 1,
    },
    { x: 0, scaleX: 1, duration: SLICE_RESOLVE_DUR, ease: "steps(SLICE_STEPS)" },
    SLICE_START + glitchHash(i * 11 + 4) * SLICE_JITTER_LAG,
  );
});
```

## Variations

- **Glitch-stretch entrance** — the element ENTERS glitching: layer `fromTo(stack, { scaleX: STRETCH_FROM, opacity: 0 }, { scaleX: 1, opacity: 1, duration: GLITCH_DUR, ease: "power4.out" })` (`STRETCH_FROM` 1.3–1.8) on the whole stack while the envelope runs. Stretch, split, and envelope all die at the same frame — the word is simply _there_, sharp.
- **Emphasis burst on a held word** — a spasm, not an arrival: 2–3 short envelopes (`GLITCH_DUR` ~0.12–0.2s each) separated by clean gaps of ~0.2–0.4s, each its own `set(amp)/to(amp)/set(rest)` triplet. The clean frames between bursts make it read as energy instead of a rendering fault.
- **Slice reveal** — Form B as the arrival itself: bands start opaque but displaced, converge under the stepped ease. Drop the color copies for the monochrome version — the restrained enterprise read of this rule.
- **Card / non-text glitch** — the stacked-copy machinery is content-agnostic (logo lockup, small card). Keep `MAX_SPLIT` proportional (~1% of element width) — oversized splits read as broken layout, not interference.

## Values

| token                                        | range                                  | notes                                                                                         |
| -------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------- |
| MAX_SPLIT                                    | 4–14px at headline sizes (~0.06–0.1em) | vertical ~35% of horizontal; base must stay legible at peak                                   |
| JITTER_STEP                                  | 1/30–1/12 s                            | shorter = frantic buzz, longer = VHS stutter; **≥ one render frame** or quantization vanishes |
| GLITCH_DUR                                   | 0.25–0.6s entrance; 0.12–0.2s burst    | ≥ ~1s stops reading as an event and starts reading as a broken render                         |
| SPLIT_OPACITY                                | 0.5–0.9 (screen on dark)               | 0.35–0.6 unblended on light — screen on white is invisible                                    |
| SLICE_COUNT                                  | 4–10                                   | more = finer tear, diminishing past ~10                                                       |
| SLICE_OFFSET_MIN / MAX                       | 12–60px                                | derive per-band values from `glitchHash(i)`, never uniform — equal offsets read mechanical    |
| SLICE_STRETCH                                | 0–0.5                                  | 0 pure displacement; ~0.3 stretched-scanline read                                             |
| SLICE_RESOLVE_DUR / SLICE_STEPS / JITTER_LAG | 0.2–0.4s / 3–6 / ≤0.08s per band       | the stepped ease keeps the settle digital                                                     |
| {warmSplit} / {coolSplit}                    | —                                      | classic red/cyan; any opposing warm+cool brand pair survives                                  |

## Critical Constraints

- **Quantize time — the stutter IS the effect.** Offsets hold for `JITTER_STEP` then jump; if the glitch looks like jelly, you interpolated. `JITTER_STEP` ≥ one render frame or the quantization silently disappears.
- **Pure functions of (quantized time, index)** — every per-frame value comes from `glitchHash`; the hash inputs use `tl.time()`, nothing else.
- **Clamp the rest state** — `tl.set({ x: 0, y: 0, opacity: 0 })` on the ghosts at envelope end; never rely on the decay landing exactly on zero.
- **Base on top, always legible** — ghosts vibrate _behind_ the base; a glitch that destroys legibility for more than ~2 frames is a tear-down, not an accent.
- **Brief, then clean** — the clean hold after the snap is the actual beat; `GLITCH_DUR` well under half the element's screen time. Emphasis bursts are separate finite triplets.
- **No CSS `@keyframes` glitch loops** — the classic CSS glitch snippet runs on the wall clock and desyncs from seek; every displacement goes through the timeline's `onUpdate`.
- **Match the register** — RGB-split is a loud consumer/tech gesture; the monochrome slice variant is the only form that belongs in a restrained enterprise composition.

## See also

`kinetic-beat-slam` (one beat lands with the glitch-stretch entrance) · `spring-pop-entrance` (pop clean, burst on the stress beat) · `gradient-text-sweep` (gradient carries the hold after the resolve) · `discrete-text-sequence` (state swap masked at max amplitude) · `motion-blur-streak` (the traveling sibling — if it's moving fast, blur it there).

## Selected motion rule: discrete-text-sequence

---
name: discrete-text-sequence
description: Replace entire text states at frame thresholds for non-linear typing effects — typos, bulk additions, pauses, backspaces, simulated thinking.
metadata:
  tags: text, typing, discrete, threshold, non-linear, sequence
---

# Discrete Text Sequence

Instead of character-by-character typewriter, replace entire string states at time thresholds — enabling non-linear effects (typos, backspaces, bulk paste, "thinking" gaps) that smooth per-char typing can't achieve. If your effect is "type each character, no edits", this rule is overkill — use the smooth-slice variation below.

## How It Works

The typing is authored as a sparse array of `{ t, text }` states; on every `onUpdate` a **reverse search** finds the latest entry whose `t` has passed and renders its text. Display jumps between states with no animation between them — the realism comes from the schedule shape: fast keystroke clusters (0.06–0.20s apart), pauses at word breaks (0.3–0.6s), a typo, backspaces peeling back to the fork, then a bulk paste replacing many chars in one entry. A block cursor blinks via a deterministic sin square wave on the same timeline.

## Recipe

```html
<!-- inside a standard scene clip (hyperframes-core) -->
<div class="terminal">
  <div class="prompt">$</div>
  <div class="text-wrap">
    <span class="text" id="text"></span><span class="cursor" id="cursor">_</span>
  </div>
</div>
```

```css
.terminal {
  font-family: {monoFont}; /* monospace required — proportional jitters even in a fixed box */
  display: flex;
  align-items: baseline;
  font-size: TERMINAL_FONT_SIZE;
}
.text-wrap {
  display: inline-flex;
  align-items: baseline;
  min-width: TEXT_WRAP_MIN_WIDTH; /* ≥ widest state — stops right-edge jitter */
  white-space: nowrap;
}
.cursor {
  display: inline-block; /* inline ignores width */
  width: CURSOR_WIDTH;
}
```

```js
// Each entry shows from its t until the NEXT entry's t.
// Shape: keystrokes → typo → backspace to the fork → bulk paste → completion mark.
const SEQUENCE = [
  { t: 0.0, text: "" },
  { t: T_K1, text: "{p1}" }, // first keystrokes (~3-5 chars, 0.1-0.2s apart)
  { t: T_K2, text: "{p1 + ' ' + p2_typo}" }, // continuation containing a typo
  { t: T_BS, text: "{p1 + ' ' + p2_partial}" }, // backspace(s) — peel back to the fork
  { t: T_BULK, text: "{fullCorrectedText}" }, // bulk paste — many chars in one jump
  { t: T_DONE, text: "{fullCorrectedText + ' ✓'}" }, // completion marker
];

// Reverse-search for the latest entry whose t has passed
function textAt(time) {
  for (let i = SEQUENCE.length - 1; i >= 0; i--) {
    if (time >= SEQUENCE[i].t) return SEQUENCE[i].text;
  }
  return "";
}

const textEl = document.getElementById("text");
const cursorEl = document.getElementById("cursor");

const driver = { t: 0 };
tl.to(
  driver,
  {
    t: TOTAL_DURATION,
    duration: TOTAL_DURATION,
    ease: "none",
    onUpdate: () => {
      textEl.textContent = textAt(driver.t);
    },
  },
  0,
);

// Cursor blink — deterministic sin square wave, never a CSS animation
const blink = { p: 0 };
tl.to(
  blink,
  {
    p: Math.PI * 2 * BLINK_CYCLES,
    duration: TOTAL_DURATION,
    ease: "none",
    onUpdate: () => {
      cursorEl.style.opacity = Math.sin(blink.p) > 0 ? "1" : "0";
    },
  },
  0,
);
```

## Variations

- **Smooth character slice** (continuous typewriter — no pauses, no edits): faster to author but uniformly "machine-typed", missing the human realism:

```js
const fullText = "{fullPhrase}";
const len = { v: 0 };
tl.to(
  len,
  {
    v: fullText.length,
    duration: TYPE_DUR,
    ease: "power1.inOut",
    onUpdate: () => {
      textEl.textContent = fullText.substring(0, Math.floor(len.v));
    },
  },
  0,
);
```

- **Thinking pause** — hold one state for `THINK_HOLD_DUR` (0.8–2.0s; under 0.5s reads as a stutter, not thought) simply by leaving a gap before the next entry's `t`.
- **State pulse on completion** — when the final state lands, `tl.to(".text", { scale: 1.03–1.08, duration: 0.15–0.3, yoyo: true, repeat: 1 }, T_DONE)`.
- **Per-state color shift** — in `onUpdate`, branch on `driver.t` vs the milestones: success color after `T_DONE`, dim mid-edit, normal while typing.

## Values

| token               | range                                        | notes                                                                  |
| ------------------- | -------------------------------------------- | ---------------------------------------------------------------------- |
| TERMINAL_FONT_SIZE  | 48–96px                                      | full-bleed comps; smaller for terminal-style detail                    |
| TEXT_WRAP_MIN_WIDTH | ≥ widest state                               | measure with a hidden probe after `document.fonts.ready` if unsure     |
| milestone `t`s      | keystrokes 0.06–0.20s apart; pauses 0.3–0.6s | monotonically increasing; `T_DONE ≤ TOTAL_DURATION − ~1s` climax dwell |
| TYPE_DUR (smooth)   | `chars × 0.06–0.12s`                         | fast → relaxed                                                         |
| BLINK_CYCLES        | one cycle per 0.5–0.8s                       | `TOTAL_DURATION / 0.8 ≤ BLINK_CYCLES ≤ TOTAL_DURATION / 0.5`           |
| CURSOR_WIDTH        | ~0.3× font size                              | gap to text single-digit px so the cursor feels attached               |

## Critical Constraints

- **Reverse-search the array each frame** — O(n) with small n (≤30 typical); don't index by frame, the sequence is sparse.
- **`min-width` on the text wrap is mandatory** — without it the right edge jitters as state length changes.
- **Discrete jumps must be INSTANT** — any transition on the text turns the jump into a smear and kills the "typing" feel.
- **Cursor blink is sin/sequence-driven on the timeline**, `display: inline-block`, monospace font, `white-space: nowrap` (wrapping mid-state breaks the illusion; trailing spaces must survive).
- **Discrete vs smooth** — use discrete only for non-linear states (typos, pauses, bulk paste); plain typing takes the smooth-slice variation.

## See also

`context-sensitive-cursor` (same SEQUENCE pattern + segment-colored cursor) · `3d-text-depth-layers` (discrete text with layered depth) · `counting-dynamic-scale` (discrete label beside a smooth counter) · `press-release-spring` (post-completion press beat).

## Selected motion rule: dynamic-content-sequencing

---
name: dynamic-content-sequencing
description: Auto-calculate timeline start/end times from content length + per-item duration config — longer content gets more screen time without hardcoded numbers.
metadata:
  tags: timeline, sequencing, dynamic, duration, content-aware, utility
---

# Dynamic Content Sequencing

A utility pattern (not a motion rule in itself) for scenes that show a SEQUENCE of items (cards, phrases, stats): each item's duration is computed from its content length + per-item config, and the sequencer assigns absolute start/end times automatically — no hardcoded offsets per item. Distinct from [discrete-text-sequence](discrete-text-sequence.md) (one text element changing states) — this rule swaps between distinct content blocks.

## How It Works

A content array of `{ eyebrow, title, body, speedFactor, hold }` entries is reduced once at build time into a flat `TIMELINE` of `{ …entry, start, end }` — duration per entry is `BASE_DURATION + body.length × SEC_PER_CHAR + hold`, so longer text earns more reading time. A single linear driver's `onUpdate` reverse-searches the active entry and swaps the DOM **only on transitions** (a `lastTitle` guard — per-frame `textContent` writes flicker in render); an optional progress bar fills 0→100% across the whole run.

## Recipe

```html
<!-- inside a standard scene clip (hyperframes-core) -->
<div class="display">
  <div class="eyebrow" id="eyebrow"></div>
  <div class="title" id="title"></div>
  <div class="body" id="body"></div>
  <div class="progress-bar"><div class="progress-fill" id="progress-fill"></div></div>
</div>
```

```css
.body {
  min-height: 160px; /* reserve space — content height varies; without this, layout jumps */
}
.progress-fill {
  height: 100%;
  width: 0%;
}
```

```js
// N entries, each with its own pacing (optionally a speedFactor multiplier);
// the final entry uses a larger hold (closing beat).
const CONTENT = [
  { eyebrow: "{eyebrow1}", title: "{title1}", body: "{body1}", hold: HOLD_MID },
  // …
  { eyebrow: "{eyebrowN}", title: "{titleN}", body: "{bodyN}", hold: HOLD_FINAL },
];

// Pre-compute absolute start/end ONCE — never in onUpdate.
let cumulative = 0;
const TIMELINE = CONTENT.map((entry) => {
  const dur = BASE_DURATION + entry.body.length * SEC_PER_CHAR + entry.hold;
  const start = cumulative;
  cumulative += dur;
  return { ...entry, start, end: cumulative };
});

function entryAt(time) {
  for (let i = TIMELINE.length - 1; i >= 0; i--) {
    if (time >= TIMELINE[i].start) return TIMELINE[i];
  }
  return TIMELINE[0];
}

const eyebrowEl = document.getElementById("eyebrow");
const titleEl = document.getElementById("title");
const bodyEl = document.getElementById("body");
const progressEl = document.getElementById("progress-fill");

const TOTAL_DURATION = cumulative + TAIL_PAD;
const driver = { t: 0 };
let lastTitle = "";

tl.to(
  driver,
  {
    t: TOTAL_DURATION,
    duration: TOTAL_DURATION,
    ease: "none",
    onUpdate: () => {
      const entry = entryAt(driver.t);
      // Swap content only on transitions — no per-frame DOM thrash
      if (entry.title !== lastTitle) {
        eyebrowEl.textContent = entry.eyebrow;
        titleEl.textContent = entry.title;
        bodyEl.textContent = entry.body;
        lastTitle = entry.title;
      }
      progressEl.style.width = `${(driver.t / TOTAL_DURATION) * 100}%`;
    },
  },
  0,
);
```

## Variations

- **Crossfade between items** — return BOTH adjacent entries during an overlap window (`time ≥ e.start − overlap && time ≤ e.end + overlap`, overlap ≈ 0.3s) and render them with opacities computed from distance to the boundary.
- **Per-item motion variation** — map an `entry.style` key to an existing rule per chapter (e.g. `3d-text-depth-layers` → `hacker-flip-3d` → `counting-dynamic-scale`); the sequencer only orchestrates timing.
- **Auto-extend composition duration** — you can set `data-duration` from the computed `TOTAL_DURATION` in script, but HF reads `data-duration` at composition load and setting it after init may not take effect — author the duration manually from a rough total.

### Accelerating cadence (geometric hold decay)

For rhetorical escalation — "everyone says…", a roll-call, a praise flurry — the beat grid itself accelerates: early entries hold ~1s (read speed), then windows shrink geometrically into a ~0.15–0.3s flurry, braking on an emphasis state before the resolve. The acceleration is pre-computed into the same flat `TIMELINE` — still content-driven, still deterministic, no speed-up tween anywhere:

```js
// Geometric decay on the hold, clamped at a flurry floor; the brake state holds longest.
const HOLDS = CONTENT.map((entry, i) => Math.max(FLURRY_FLOOR, HOLD_START * Math.pow(DECAY, i)));
HOLDS[CONTENT.length - 1] = HOLD_FINAL;

let cumulative = 0;
const TIMELINE = CONTENT.map((entry, i) => {
  // Past ~0.5s states are glanced as motion texture, not read —
  // drop the per-char term or you never reach flurry speed.
  const readable = HOLDS[i] >= READ_THRESHOLD;
  const dur = HOLDS[i] + (readable ? entry.body.length * SEC_PER_CHAR : 0);
  const start = cumulative;
  cumulative += dur;
  return { ...entry, start, end: cumulative };
});
```

Worked example — **praise-chip flurry**: ~16 short quotes hard-cut through a chip beside a pinned wordmark. First 3 states at `HOLD_START = 1.0` (each reads fully); `DECAY = 0.8` shrinks every following window until `FLURRY_FLOOR = 0.2` catches it (≈12 states over ~2.5s — a churn of acclaim, individually glanced); the longest phrase takes `HOLD_FINAL ≈ 1.6` as the brake before the closing lockup.

Values: `HOLD_START` 0.8–1.2s; `DECAY` 0.75–0.88 (higher = longer runway before the flurry bites); `FLURRY_FLOOR` 0.15–0.3s (below ~0.15s swaps strobe); `READ_THRESHOLD` ~0.5s; brake ≥ 4× the floor or the stop doesn't register as a beat. The 3–6 entry guidance relaxes here — 12–18 states are legal precisely because flurry states aren't individually read. The hard-cut discipline (`lastTitle` guard, instant swaps) is what lets 0.2s states render clean.

## Values

| token         | range                 | notes                                                                                                                 |
| ------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| BASE_DURATION | 0.6–1.5s              | minimum per entry regardless of length — even one-word entries get read time                                          |
| SEC_PER_CHAR  | 0.03–0.06 s/char      | ≈17–33 chars/sec; uniform across the sequence so the pace reads as one engine; lean high for wide-character languages |
| HOLD_MID      | 0.5–1.0s              | dwell on a non-final entry; `< HOLD_FINAL`                                                                            |
| HOLD_FINAL    | 1.0–2.0s              | climax dwell — must exceed HOLD_MID by a clear margin so the close reads as a beat                                    |
| SPEED_FACTOR  | 0.5–2.0 (default 1.0) | per-entry only; if every entry shares a factor, fold it into SEC_PER_CHAR                                             |
| TAIL_PAD      | 0.0–1.0s              | quiet beat after the last entry; prefer 0 when the next composition owns the breath                                   |
| CONTENT N     | 3–6 entries           | <3 isn't a sequence; >6 drags (accelerating cadence relaxes this — see above)                                         |

Reference: `../../examples/messaging-multi-phrase.html`.

## Critical Constraints

- **Pre-compute the TIMELINE once at build** — never recompute in `onUpdate`; the reverse search over the flat array is the whole per-frame cost.
- **DOM swap only on entry transition** (`lastTitle`/key guard) — per-frame `textContent` assignment flickers in HF render.
- **`min-height` on the body element** — without reservation, downstream elements (progress bar, brand) jitter as content height varies.
- **Sequential only** — for parallel tracks use a different reduction.
- **Titles fit one line at the chosen size; bodies fit inside `min-height` after wrapping.**

## See also

`discrete-text-sequence` (per-entry typewriter on the body) · `context-sensitive-cursor` (cursor color per chapter) · `vertical-spring-ticker` (animated word swap instead of hard cut) · `scale-swap-transition` (visual morph between entries).

## Selected motion rule: kinetic-beat-slam

---
name: kinetic-beat-slam
description: Percussive kinetic typography — short phrases slam in on a steady beat with distinct per-phrase entrances, optional rhythm chrome (metronome ticks, beat bar), then a locked finale.
metadata:
  tags: text, kinetic, typography, beat, rhythm, slam, percussive, punchy
---

# Kinetic Beat Slam

Short phrases hit one at a time on a **steady beat**, each with a _different_ entrance, then stack into a locked finale — the recipe for "punchy / rhythmic" text-forward pieces (taglines, manifestos, hype intros). The difference between generic and rhythmic is (1) one shared **onset array** driving every element, (2) **distinct** entrances per phrase rather than one reused helper, and (3) optional **rhythm chrome** that visibly keeps the beat.

## How It Works

A single tempo grid — `PULSE` seconds per sub-beat, `BEATS = [t0, t1, t2, …]` on that grid — is the rhythmic spine; every phrase entrance, accent, and chrome tick reads its time from it, so the piece locks to one pulse instead of drifting hand-tuned offsets. Each phrase gets a different transform axis (scale+blur slam / side snap / rise+rotate) with short attacks (0.35–0.6s on the hit), then the stack holds with a finite low-amplitude breath.

## Recipe

```html
<!-- inside a standard scene clip (hyperframes-core) -->
<div class="kbs-stage">
  <div class="kbs-line" id="p1"><span class="verb">Notice</span> more.</div>
  <div class="kbs-line" id="p2"><span class="verb">Decide</span> faster.</div>
  <div class="kbs-line" id="p3"><span class="verb">Act</span> now.</div>
</div>
<!-- optional rhythm chrome -->
<div class="kbs-metronome" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
```

```css
.kbs-stage {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 120px 160px; /* title-safe margin */
}
.kbs-line {
  font-family: "Archivo Black", "League Gothic", sans-serif; /* embedded display face */
  font-size: 150px;
  line-height: 0.96;
  letter-spacing: -0.03em;
  color: #f5f5f5;
}
.kbs-line .verb {
  color: #ff5b2e; /* exactly one accent hue */
}
.kbs-metronome {
  position: absolute;
  bottom: 64px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 14px;
}
.kbs-metronome i {
  width: 6px;
  height: 28px;
  background: #ff5b2e;
  opacity: 0.25;
}
```

```js
// ONE tempo grid drives everything — phrases AND the metronome read it.
const PULSE = 0.4; // seconds per sub-beat
const BEATS = [PULSE * 1, PULSE * 5, PULSE * 9]; // phrase onsets, on the grid

// Distinct entrances per phrase (NOT one reused helper).
tl.fromTo(
  "#p1",
  { scale: 1.5, filter: "blur(16px)", opacity: 0 },
  { scale: 1, filter: "blur(0px)", opacity: 1, duration: 0.5, ease: "power4.out" },
  BEATS[0],
);
tl.fromTo(
  "#p2",
  { x: -320, opacity: 0 },
  { x: 0, opacity: 1, duration: 0.45, ease: "expo.out" },
  BEATS[1],
);
tl.fromTo(
  "#p3",
  { y: 90, rotation: 6, opacity: 0 },
  { y: 0, rotation: 0, opacity: 1, duration: 0.55, ease: "circ.out" },
  BEATS[2],
);

// Rhythm chrome: each tick flashes on the SAME grid, not a magic offset.
gsap.utils.toArray(".kbs-metronome i").forEach((tick, i) => {
  tl.to(tick, { opacity: 1, duration: 0.08, yoyo: true, repeat: 1, ease: "none" }, PULSE * (i + 1));
});

// Finale hold: floor (not ceil) so the repeat never overshoots data-duration;
// max(0,…) so a short hold never yields a negative repeat (GSAP reads negative as -1 = infinite).
const holdStart = BEATS[2] + 0.7,
  cycle = 1.6,
  holdDur = SCENE_DURATION - holdStart;
tl.to(
  ".kbs-stage",
  {
    scale: 1.01,
    duration: cycle / 2,
    ease: "sine.inOut",
    yoyo: true,
    repeat: Math.max(0, Math.floor(holdDur / cycle) - 1),
  },
  holdStart,
);
```

## Variations

- **Entrance easing by attack character** — `power4.out` hard slam ⭐ default hit · `expo.out` hardest snap (side-snaps, whip-ins) · `back.out(2)` overshoot pop (accents only, not body words) · `circ.out` heavy rise with momentum. Use **at least 3 distinct easings** across the piece.
- **Rhythm chrome alternatives** — a center beat bar or a `// label` monospace tag pulsing on-beat instead of the 5-tick metronome; mark any decorative that must survive a shader transition per `../../transitions/overview.md`.
- **Finale dressing** — stack + accent underline sweep ([css-marker-patterns](css-marker-patterns.md)); don't just leave the last phrase sitting.

## Values

| token             | range                | notes                                                                                        |
| ----------------- | -------------------- | -------------------------------------------------------------------------------------------- |
| BEATS spacing     | 1.2–1.8s             | <0.8s frantic, >2.5s loses the pulse; keep spacing even — it's a beat                        |
| entrance duration | 0.35–0.6s            | the hit must resolve before the next beat; exits ≤0.25s                                      |
| accent hue        | exactly 1            | the verbs; the rest mono white / near-black                                                  |
| display face      | 150px+, heavy weight | Archivo Black / League Gothic / Oswald — see `hyperframes-creative/references/typography.md` |

## Critical Constraints

- **One beat array, not scattered offsets** — every element times off `BEATS[]` / `PULSE`; this is the single biggest lever for "rhythmic".
- **Different entrance per phrase** — a reused `punchIn()` for all lines is the flat-but-competent tell. Vary the motion axis, reuse the ease _family_.
- **Finale repeat math**: `repeat: Math.max(0, Math.floor(dur / cycle) - 1)` — `Math.ceil` overshoots `data-duration` and trips the `gsap_repeat_ceil_overshoot` lint rule; a negative repeat is read by GSAP as `-1` (infinite).
- **No banned exit animations between scenes** — in a montage the _transition_ is the exit (`../../transitions/overview.md`); only a final scene may fade out.
- **Display font must be embedded** or it silently falls back at render — Anton / Bebas-as-literal are NOT embedded (`Bebas Neue` aliases to League Gothic; verify in `typography.md`).

## See also

`3d-text-depth-layers` (extruded depth on the slammed words) · `css-marker-patterns` (finale underline/circle) · `sine-wave-loop` (the finale breath) · `../adapters/gsap-easing-and-stagger.md` (easing vocabulary).
