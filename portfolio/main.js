(function () {
  "use strict";

  var TITLES = {
    en: "Marcela Figueroa Delgado — Portfolio",
    es: "Marcela Figueroa Delgado — Portafolio"
  };
  var FLIP_MS = 700; // matches --dur-flip in styles.css
  var FADE_MS = 200;

  var currentLang = "en";
  var isFlipping = false;
  var app = document.getElementById("app");

  /* ---------------------------------------------------------------------
     Language toggle
     --------------------------------------------------------------------- */
  function renderCutoutHeader(el, lang) {
    var text = el.getAttribute("data-" + lang) || "";
    el.textContent = "";
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var span = document.createElement("span");
      if (ch === " ") {
        span.className = "ch ch--space";
        span.textContent = " ";
      } else {
        span.className = "ch";
        span.textContent = ch;
      }
      el.appendChild(span);
    }
  }

  function setLanguage(lang) {
    if (lang !== "en" && lang !== "es") return;
    currentLang = lang;

    var nodes = document.querySelectorAll("[data-en][data-es]:not(.cutout-header)");
    for (var i = 0; i < nodes.length; i++) {
      var value = nodes[i].getAttribute("data-" + lang);
      if (nodes[i].hasAttribute("aria-label")) {
        nodes[i].setAttribute("aria-label", value);
      } else {
        nodes[i].textContent = value;
      }
    }
    var headers = document.querySelectorAll(".cutout-header");
    for (var h = 0; h < headers.length; h++) {
      renderCutoutHeader(headers[h], lang);
    }

    document.documentElement.lang = lang;
    document.title = TITLES[lang];

    var enBtn = document.getElementById("lang-en");
    var esBtn = document.getElementById("lang-es");
    enBtn.classList.toggle("is-active", lang === "en");
    esBtn.classList.toggle("is-active", lang === "es");
    enBtn.setAttribute("aria-pressed", String(lang === "en"));
    esBtn.setAttribute("aria-pressed", String(lang === "es"));

    var active = document.querySelector(".spread.is-active");
    if (active) updateFooter(active);
  }

  document.getElementById("lang-en").addEventListener("click", function () { setLanguage("en"); });
  document.getElementById("lang-es").addEventListener("click", function () { setLanguage("es"); });

  /* ---------------------------------------------------------------------
     Hash routing + page flip
     --------------------------------------------------------------------- */
  function getSpreads() {
    return Array.prototype.slice.call(document.querySelectorAll(".spread"));
  }

  function findSpreadForHash(hash) {
    var spreads = getSpreads();
    for (var i = 0; i < spreads.length; i++) {
      if (spreads[i].dataset.hash === hash) return spreads[i];
    }
    return document.querySelector('.spread[data-hash="#/"]');
  }

  function updateFooter(spread) {
    document.querySelector(".footer-strip .page-num").textContent = spread.dataset.page;
    document.querySelector(".footer-strip .section-name").textContent =
      spread.getAttribute("data-section-" + currentLang);
  }

  function updatePageTurnControls(spread) {
    var spreads = getSpreads();
    var idx = spreads.indexOf(spread);
    document.getElementById("page-prev").hidden = idx <= 0;
    document.getElementById("page-next").hidden = idx >= spreads.length - 1;
  }

  function stepTo(delta) {
    var spreads = getSpreads();
    var current = document.querySelector(".spread.is-active");
    var nextIdx = spreads.indexOf(current) + delta;
    if (nextIdx < 0 || nextIdx >= spreads.length) return;
    location.hash = spreads[nextIdx].dataset.hash;
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function navigateTo(hash) {
    var target = findSpreadForHash(hash);
    var current = document.querySelector(".spread.is-active");
    if (!target || target === current || isFlipping) {
      if (target) updateFooter(target);
      return;
    }

    isFlipping = true;
    app.classList.add("is-flipping");
    target.classList.add("is-active");

    if (prefersReducedMotion()) {
      target.style.opacity = "0";
      current.style.opacity = "1";
      void target.offsetWidth;
      target.style.opacity = "";
      current.style.opacity = "0";
      window.setTimeout(finish, FADE_MS);
    } else {
      target.style.transform = "rotateY(180deg)";
      void target.offsetWidth;
      current.style.transform = "rotateY(-180deg)";
      target.style.transform = "rotateY(0deg)";
      window.setTimeout(finish, FLIP_MS);
    }

    function finish() {
      current.classList.remove("is-active");
      current.style.transform = "";
      current.style.opacity = "";
      target.style.transform = "";
      target.style.opacity = "";
      app.classList.remove("is-flipping");
      isFlipping = false;
      updateFooter(target);
      updatePageTurnControls(target);
    }
  }

  window.addEventListener("hashchange", function () {
    navigateTo(location.hash || "#/");
  });

  document.addEventListener("keydown", function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var active = document.activeElement;
    if (active && (active.hasAttribute("data-draggable") || active.getAttribute("role") === "slider" || active.closest(".player-viewport"))) return;
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    stepTo(e.key === "ArrowRight" ? 1 : -1);
  });

  document.getElementById("page-prev").addEventListener("click", function () { stepTo(-1); });
  document.getElementById("page-next").addEventListener("click", function () { stepTo(1); });

  /* ---------------------------------------------------------------------
     Draggable stickers / thumbnails — pointer events + arrow-key nudge
     --------------------------------------------------------------------- */
  var positions = new WeakMap();
  var dragState = null;

  function setOffset(el, x, y) {
    positions.set(el, { x: x, y: y });
    el.style.setProperty("--drag-x", x + "px");
    el.style.setProperty("--drag-y", y + "px");
  }

  function onPointerMove(e) {
    if (!dragState || dragState.el !== e.currentTarget) return;
    setOffset(
      dragState.el,
      dragState.startX + (e.clientX - dragState.startClientX),
      dragState.startY + (e.clientY - dragState.startClientY)
    );
  }

  function onPointerUp(e) {
    var el = e.currentTarget;
    el.classList.remove("is-dragging");
    el.removeEventListener("pointermove", onPointerMove);
    el.removeEventListener("pointerup", onPointerUp);
    el.removeEventListener("pointercancel", onPointerUp);
    dragState = null;
  }

  function onPointerDown(e) {
    var el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    var pos = positions.get(el) || { x: 0, y: 0 };
    dragState = { el: el, startClientX: e.clientX, startClientY: e.clientY, startX: pos.x, startY: pos.y };
    el.classList.add("is-dragging");
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
  }

  function onDragKeydown(e) {
    var moves = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] };
    if (!moves[e.key]) return;
    e.preventDefault();
    var el = e.currentTarget;
    var pos = positions.get(el) || { x: 0, y: 0 };
    setOffset(el, pos.x + moves[e.key][0], pos.y + moves[e.key][1]);
  }

  function initDraggable(el) {
    positions.set(el, { x: 0, y: 0 });
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("keydown", onDragKeydown);
  }

  /* ---------------------------------------------------------------------
     Flight-path map (About spread) — plane sampled along an SVG path
     --------------------------------------------------------------------- */
  (function () {
    var svg = document.getElementById("flight-map-svg");
    var path = document.getElementById("flight-path");
    var plane = document.getElementById("plane");
    if (!svg || !path || !plane) return;

    var total = path.getTotalLength();
    var samples = [];
    for (var i = 0; i <= 60; i++) {
      var p = path.getPointAtLength((i / 60) * total);
      samples.push({ t: i / 60, x: p.x, y: p.y });
    }

    var currentT = 0.5;

    function place(t) {
      currentT = Math.max(0, Math.min(1, t));
      var len = currentT * total;
      var pos = path.getPointAtLength(len);
      var ahead = path.getPointAtLength(Math.min(total, len + 1));
      var angle = Math.atan2(ahead.y - pos.y, ahead.x - pos.x) * (180 / Math.PI);
      plane.setAttribute("transform", "translate(" + pos.x + "," + pos.y + ") rotate(" + angle + ")");
      plane.setAttribute("aria-valuenow", String(Math.round(currentT * 100)));
    }

    function nearestT(x, y) {
      var best = samples[0], bestDist = Infinity;
      for (var s = 0; s < samples.length; s++) {
        var dx = samples[s].x - x, dy = samples[s].y - y;
        var d = dx * dx + dy * dy;
        if (d < bestDist) { bestDist = d; best = samples[s]; }
      }
      return best.t;
    }

    function toSvgPoint(clientX, clientY) {
      var pt = svg.createSVGPoint();
      pt.x = clientX; pt.y = clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    }

    var dragging = false;
    plane.addEventListener("pointerdown", function (e) { dragging = true; plane.setPointerCapture(e.pointerId); });
    plane.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var pt = toSvgPoint(e.clientX, e.clientY);
      place(nearestT(pt.x, pt.y));
    });
    plane.addEventListener("pointerup", function () { dragging = false; });
    plane.addEventListener("pointercancel", function () { dragging = false; });
    plane.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      place(currentT + (e.key === "ArrowRight" ? 0.03 : -0.03));
    });

    place(0.5);
  })();

  /* ---------------------------------------------------------------------
     Music swiper (Off the Clock spread) — pointer drag + arrows + dots,
     no library, snaps between fixed-width frames.
     --------------------------------------------------------------------- */
  (function () {
    var track = document.getElementById("player-track");
    if (!track) return;
    var viewport = track.parentElement;
    var frames = Array.prototype.slice.call(track.children);
    var dots = Array.prototype.slice.call(document.querySelectorAll(".player-dot"));
    var prevBtn = document.querySelector(".player-arrow--prev");
    var nextBtn = document.querySelector(".player-arrow--next");

    var index = 0;
    var dragStartX = 0;
    var dragDX = 0;
    var dragging = false;

    function slideWidth() {
      return frames[0].getBoundingClientRect().width + 16;
    }

    function render(animate) {
      track.style.transition = animate && !prefersReducedMotion() ? "transform 300ms ease" : "none";
      track.style.transform = "translateX(" + (-index * slideWidth() + dragDX) + "px)";
      dots.forEach(function (d, i) { d.classList.toggle("is-active", i === index); });
    }

    function goTo(i) {
      index = Math.max(0, Math.min(frames.length - 1, i));
      dragDX = 0;
      render(true);
    }

    prevBtn.addEventListener("click", function () { goTo(index - 1); });
    nextBtn.addEventListener("click", function () { goTo(index + 1); });
    dots.forEach(function (d, i) { d.addEventListener("click", function () { goTo(i); }); });

    viewport.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); goTo(index + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goTo(index - 1); }
    });

    viewport.addEventListener("pointerdown", function (e) {
      dragging = true;
      dragStartX = e.clientX;
      viewport.setPointerCapture(e.pointerId);
    });
    viewport.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      dragDX = e.clientX - dragStartX;
      render(false);
    });
    viewport.addEventListener("pointerup", function () {
      if (!dragging) return;
      dragging = false;
      if (dragDX < -40) goTo(index + 1);
      else if (dragDX > 40) goTo(index - 1);
      else goTo(index);
    });
    viewport.addEventListener("pointercancel", function () { dragging = false; goTo(index); });

    window.addEventListener("resize", function () {
      if (frames[0].getBoundingClientRect().width) render(false);
    });
    render(false);
  })();

  /* ---------------------------------------------------------------------
     Init
     --------------------------------------------------------------------- */
  var initial = findSpreadForHash(location.hash || "#/");
  getSpreads().forEach(function (s) { s.classList.remove("is-active"); });
  initial.classList.add("is-active");
  document.querySelectorAll(".cutout-header").forEach(function (el) { renderCutoutHeader(el, currentLang); });
  updateFooter(initial);
  updatePageTurnControls(initial);
  document.querySelectorAll("[data-draggable]").forEach(initDraggable);
  document.querySelector(".corner-stamp .year").textContent = String(new Date().getFullYear());
})();
