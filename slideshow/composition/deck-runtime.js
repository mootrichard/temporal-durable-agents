(function () {
  function initializeDeck() {
  var duration = 140;
  window.__timelines = window.__timelines || {};

  var scenes = [
    { id: "scene-cover", sceneId: "cover", start: 0, duration: 7 },
    { id: "scene-agent-tree", sceneId: "agent-tree", start: 7, duration: 7 },
    { id: "scene-agent-loop", sceneId: "agent-loop", start: 14, duration: 7 },
    { id: "scene-the-build", sceneId: "the-build", start: 21, duration: 7 },
    { id: "scene-baseline-owner", sceneId: "baseline-owner", start: 28, duration: 7 },
    { id: "scene-baseline-plan", sceneId: "baseline-plan", start: 35, duration: 7 },
    { id: "scene-baseline-fanout", sceneId: "baseline-fanout", start: 42, duration: 7 },
    { id: "scene-baseline-resume", sceneId: "baseline-resume", start: 49, duration: 7 },
    { id: "scene-baseline-kill", sceneId: "baseline-kill", start: 56, duration: 7 },
    { id: "scene-baseline-restart", sceneId: "baseline-restart", start: 63, duration: 7 },
    { id: "scene-temporal-shift", sceneId: "temporal-shift", start: 70, duration: 7 },
    { id: "scene-temporal-start", sceneId: "temporal-start", start: 77, duration: 7 },
    { id: "scene-temporal-workflow", sceneId: "temporal-workflow", start: 84, duration: 7 },
    { id: "scene-temporal-branches", sceneId: "temporal-branches", start: 91, duration: 7 },
    { id: "scene-temporal-kill", sceneId: "temporal-kill", start: 98, duration: 7 },
    { id: "scene-temporal-replay", sceneId: "temporal-replay", start: 105, duration: 7 },
    { id: "scene-temporal-heartbeats", sceneId: "temporal-heartbeats", start: 112, duration: 7 },
    { id: "scene-temporal-finish", sceneId: "temporal-finish", start: 119, duration: 7 },
    { id: "scene-boundary", sceneId: "boundary", start: 126, duration: 7 },
    { id: "scene-close", sceneId: "close", start: 133, duration: 7 }
  ];

  var clock = { time: 0 };
  var timeline = gsap.timeline({ paused: true });
  timeline.to(clock, { time: duration, duration: duration, ease: "none" }, 0);
  timeline.fromTo(
    "#scene-cover h1",
    { x: 0 },
    { x: 18, duration: 7, ease: "sine.inOut" },
    0
  );

  for (var orbIndex = 0; orbIndex < scenes.length; orbIndex += 1) {
    var orbScene = scenes[orbIndex];
    var orbHost = document.getElementById(orbScene.id);
    if (!orbHost) continue;
    var orb = document.createElement("div");
    orb.className = "ambient-orb";
    orbHost.appendChild(orb);
    timeline.fromTo(
      orb,
      { x: 0, scale: 0.8 },
      { x: 72, scale: 1.18, duration: orbScene.duration, ease: "sine.inOut" },
      orbScene.start
    );
  }

  function updateVisibility(time) {
    for (var i = 0; i < scenes.length; i += 1) {
      var scene = scenes[i];
      var element = document.getElementById(scene.id);
      if (!element) continue;
      var isLast = i === scenes.length - 1;
      var active = time >= scene.start && (time < scene.start + scene.duration || (isLast && time <= duration));
      element.classList.toggle("is-active", active);
    }
  }

  timeline.eventCallback("onUpdate", function () {
    updateVisibility(timeline.time());
  });

  for (var i = 0; i < scenes.length; i += 1) {
    window.__timelines[scenes[i].sceneId] = timeline;
  }

  window.__deckTimeline = timeline;
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeDeck, { once: true });
  } else {
    initializeDeck();
  }
})();
