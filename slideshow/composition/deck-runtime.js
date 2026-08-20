(function () {
  var duration = 250;
  window.__timelines = window.__timelines || {};
  if (!window.__deckTimeline) {
    window.__deckMotion = { y: 0 };
    window.__deckTimeline = gsap.timeline({ paused: true });
    window.__deckTimeline.to(
      window.__deckMotion,
      {
        y: 12,
        duration: 8,
        ease: "none",
        onUpdate: function () {
          var el = document.getElementById("cover-tree-center");
          if (el) el.style.transform = "translateY(" + window.__deckMotion.y + "px)";
        }
      },
      0
    );
    window.__deckTimeline.to(
      window.__deckMotion,
      { y: 13, duration: 242, ease: "none" },
      8
    );
  }
  var scenes = [
    { id: "scene-cover", sceneId: "cover", start: 0, duration: 8 },
    { id: "scene-question", sceneId: "question", start: 8, duration: 8 },
    { id: "scene-same-job", sceneId: "same-job", start: 16, duration: 8 },
    { id: "scene-baseline", sceneId: "baseline", start: 24, duration: 8 },
    { id: "scene-baseline-kill", sceneId: "baseline-kill", start: 32, duration: 8 },
    { id: "scene-migration", sceneId: "migration", start: 40, duration: 8 },
    { id: "scene-durable-tree", sceneId: "durable-tree", start: 48, duration: 8 },
    { id: "scene-recovery", sceneId: "recovery", start: 56, duration: 8 },
    { id: "scene-boundary", sceneId: "boundary", start: 64, duration: 8 },
    { id: "scene-close", sceneId: "close", start: 72, duration: 8 },
    { id: "scene-state-ledger", sceneId: "state-ledger", start: 80, duration: 8 },
    { id: "scene-trace-topology", sceneId: "trace-topology", start: 88, duration: 6 },
    { id: "scene-trace-api", sceneId: "trace-api", start: 94, duration: 6 },
    { id: "scene-trace-start", sceneId: "trace-start", start: 100, duration: 6 },
    { id: "scene-trace-worker", sceneId: "trace-worker", start: 106, duration: 6 },
    { id: "scene-trace-state", sceneId: "trace-state", start: 112, duration: 6 },
    { id: "scene-trace-policy", sceneId: "trace-policy", start: 118, duration: 6 },
    { id: "scene-trace-checkpoint", sceneId: "trace-checkpoint", start: 124, duration: 6 },
    { id: "scene-trace-codex", sceneId: "trace-codex", start: 130, duration: 6 },
    { id: "scene-trace-heartbeat", sceneId: "trace-heartbeat", start: 136, duration: 6 },
    { id: "scene-trace-plan", sceneId: "trace-plan", start: 142, duration: 6 },
    { id: "scene-trace-fanout", sceneId: "trace-fanout", start: 148, duration: 6 },
    { id: "scene-trace-child", sceneId: "trace-child", start: 154, duration: 6 },
    { id: "scene-trace-tests", sceneId: "trace-tests", start: 160, duration: 6 },
    { id: "scene-trace-barrier", sceneId: "trace-barrier", start: 166, duration: 6 },
    { id: "scene-trace-projection", sceneId: "trace-projection", start: 172, duration: 6 },
    { id: "scene-trace-kill", sceneId: "trace-kill", start: 178, duration: 6 },
    { id: "scene-trace-survive", sceneId: "trace-survive", start: 184, duration: 6 },
    { id: "scene-trace-timeout", sceneId: "trace-timeout", start: 190, duration: 6 },
    { id: "scene-trace-restart", sceneId: "trace-restart", start: 196, duration: 6 },
    { id: "scene-trace-replay", sceneId: "trace-replay", start: 202, duration: 6 },
    { id: "scene-trace-codex-retry", sceneId: "trace-codex-retry", start: 208, duration: 6 },
    { id: "scene-trace-test-retry", sceneId: "trace-test-retry", start: 214, duration: 6 },
    { id: "scene-trace-implementation", sceneId: "trace-implementation", start: 220, duration: 6 },
    { id: "scene-trace-completion", sceneId: "trace-completion", start: 226, duration: 6 },
    { id: "scene-trace-proof", sceneId: "trace-proof", start: 232, duration: 6 },
    { id: "scene-trace-history-events", sceneId: "trace-history-events", start: 238, duration: 6 },
    { id: "scene-trace-heartbeat-semantics", sceneId: "trace-heartbeat-semantics", start: 244, duration: 6 }
  ];

  function setFragmentState(id, visible) {
    var el = document.getElementById(id);
    if (!el) return;
    el.style.opacity = visible ? "1" : "0";
    el.style.transform = visible ? "translateY(0)" : "translateY(24px)";
  }

  function updateVisibility(time) {
    for (var i = 0; i < scenes.length; i += 1) {
      var scene = scenes[i];
      var el = document.getElementById(scene.id);
      if (!el) continue;
      var active =
        time >= scene.start &&
        (time < scene.start + scene.duration || (scene.start === 244 && time <= 250));
      el.classList.toggle("is-active", active);
    }

    setFragmentState("migration-event-history", time >= 40.6);
    setFragmentState("migration-child-workflows", time >= 41.8);
    setFragmentState("migration-heartbeats", time >= 43.0);
    setFragmentState("trace-heartbeat-1", time >= 136.7);
    setFragmentState("trace-heartbeat-2", time >= 138.2);
    setFragmentState("trace-heartbeat-3", time >= 139.8);
    setFragmentState("trace-fanout-1", time >= 148.7);
    setFragmentState("trace-fanout-2", time >= 150.2);
    setFragmentState("trace-fanout-3", time >= 151.8);
  }

  var timeline = window.__deckTimeline;
  timeline.eventCallback("onUpdate", function () {
    updateVisibility(timeline.time());
  });

  for (var i = 0; i < scenes.length; i += 1) {
    window.__timelines[scenes[i].sceneId] = timeline;
  }
  window.__timelines.cover = timeline;
  window.__hfSetTime = updateVisibility;
  updateVisibility(0);

  function postTimeline() {
    parent.postMessage(
      {
        source: "hf-preview",
        type: "timeline",
        durationInFrames: duration * 30,
        scenes: scenes.map(function (scene) {
          return { id: scene.sceneId, start: scene.start, duration: scene.duration };
        })
      },
      "*"
    );
  }

  if (document.readyState === "complete") {
    setTimeout(postTimeline, 300);
  } else {
    window.addEventListener("load", function () {
      setTimeout(postTimeline, 300);
    });
  }
})();
