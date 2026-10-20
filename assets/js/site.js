(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Mobile menu
  var side = document.querySelector(".side");
  var toggle = document.querySelector(".side__toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = side.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  // Scroll reveal
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  // Tabs (Evidence / Reflection)
  document.querySelectorAll("[data-tabs]").forEach(function (group) {
    var buttons = group.querySelectorAll('[role="tab"]');
    var ink = group.querySelector(".tabs__ink");
    function moveInk(btn) {
      if (!ink) return;
      ink.style.left = btn.offsetLeft + "px";
      ink.style.width = btn.offsetWidth + "px";
    }
    function select(btn, focus) {
      buttons.forEach(function (b) {
        var on = b === btn;
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(b.getAttribute("aria-controls"));
        panel.hidden = !on;
        if (on) { panel.classList.remove("is-entering"); void panel.offsetWidth; panel.classList.add("is-entering"); }
      });
      moveInk(btn);
      if (focus) btn.focus();
    }
    buttons.forEach(function (b, i) {
      b.addEventListener("click", function () { select(b); });
      b.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          var n = (i + (e.key === "ArrowRight" ? 1 : buttons.length - 1)) % buttons.length;
          select(buttons[n], true);
        }
      });
    });
    var current = group.querySelector('[aria-selected="true"]') || buttons[0];
    requestAnimationFrame(function () { moveInk(current); });
    window.addEventListener("resize", function () { moveInk(group.querySelector('[aria-selected="true"]')); });
  });

  // Route rail: progress + current stop
  var route = document.querySelector(".route");
  if (route) {
    var links = route.querySelectorAll(".route__line a");
    var fill = route.querySelector(".route__fill");
    var stops = Array.prototype.map.call(links, function (a) { return document.querySelector(a.getAttribute("href")); });
    var line = route.querySelector(".route__line");
    function update() {
      var y = window.scrollY + window.innerHeight * 0.35;
      var idx = -1;
      stops.forEach(function (s, i) { if (s && s.offsetTop <= y) idx = i; });
      links.forEach(function (a, i) {
        a.classList.toggle("is-current", i === idx);
        a.classList.toggle("is-passed", i < idx);
        if (i === idx) a.setAttribute("aria-current", "step"); else a.removeAttribute("aria-current");
      });
      if (fill && links.length > 1) {
        var first = links[0].querySelector(".route__dot").getBoundingClientRect();
        var last = links[links.length - 1].querySelector(".route__dot").getBoundingClientRect();
        var box = line.getBoundingClientRect();
        var span = last.left - first.left;
        var pct = 0;
        if (idx >= 0) {
          var start = stops[idx].offsetTop;
          var next = stops[idx + 1] ? stops[idx + 1].offsetTop : start + stops[idx].offsetHeight;
          var within = Math.min(Math.max((y - start) / Math.max(next - start, 1), 0), 1);
          pct = (idx + within) / (links.length - 1);
        }
        fill.style.left = (first.left - box.left + first.width / 2) + "px";
        fill.style.width = Math.min(pct, 1) * span + "px";
      }
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  // User story filter
  var storyList = document.querySelector("[data-stories]");
  if (storyList) {
    var items = storyList.querySelectorAll("li");
    var filterBox = document.querySelector("[data-story-filters]");
    var roles = ["All"];
    items.forEach(function (li) { if (roles.indexOf(li.dataset.role) < 0) roles.push(li.dataset.role); });
    roles.forEach(function (r) {
      var n = r === "All" ? items.length : storyList.querySelectorAll('li[data-role="' + r + '"]').length;
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-pressed", r === "All" ? "true" : "false");
      b.innerHTML = r + '<span class="count">' + n + "</span>";
      b.addEventListener("click", function () {
        filterBox.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
        items.forEach(function (li) { li.hidden = !(r === "All" || li.dataset.role === r); });
      });
      filterBox.appendChild(b);
    });
    // Totals used in the fact strip and the MoSCoW chart
    var total = items.length;
    var done = storyList.querySelectorAll('li[data-done="yes"]').length;
    document.querySelectorAll("[data-count='stories']").forEach(function (el) { el.textContent = total; });
    document.querySelectorAll("[data-count='done']").forEach(function (el) { el.textContent = done; });
    document.querySelectorAll("[data-count='roles']").forEach(function (el) { el.textContent = roles.length - 1; });
    var colors = { Must: "#c2593d", Should: "#d9a21b", Could: "#2f7d5b", "Won't": "#9aa1b3" };
    var chart = document.querySelector("[data-moscow]");
    if (chart) {
      ["Must", "Should", "Could", "Won't"].forEach(function (p) {
        var n = storyList.querySelectorAll('li[data-priority="' + p + '"]').length;
        var row = document.createElement("div");
        row.className = "moscow__row";
        row.innerHTML = "<span>" + p + " have</span><div class='moscow__track'><div class='moscow__bar' style='background:" + colors[p] + "'></div></div><strong>" + n + "</strong>";
        chart.appendChild(row);
        var bar = row.querySelector(".moscow__bar");
        var go = function () { bar.style.width = (n / total * 100) + "%"; };
        if ("IntersectionObserver" in window && !reduce) {
          var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { go(); o.disconnect(); } });
          o.observe(row);
        } else { go(); }
      });
    }
  }

  // Screenshots: hide any that have not been added yet, open the rest in a lightbox
  var box = document.getElementById("lightbox");
  document.querySelectorAll(".shot").forEach(function (fig) {
    var img = fig.querySelector("img");
    var hide = function () {
      fig.remove();
      document.querySelectorAll(".shots").forEach(function (s) { if (!s.querySelector(".shot")) s.remove(); });
    };
    // Probe the file straight away, so a missing screenshot is removed even before lazy-loading kicks in
    var probe = new Image();
    probe.onerror = hide;
    probe.src = img.currentSrc || img.src;
    img.addEventListener("error", hide);
    fig.tabIndex = 0;
    var open = function () {
      box.querySelector("img").src = img.src;
      box.querySelector("img").alt = img.alt;
      box.querySelector("figcaption").textContent = fig.querySelector("figcaption") ? fig.querySelector("figcaption").textContent : "";
      box.hidden = false;
      box.querySelector(".lightbox__close").focus();
    };
    fig.addEventListener("click", open);
    fig.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  });
  if (box) {
    var close = function () { box.hidden = true; };
    box.addEventListener("click", function (e) { if (e.target === box || e.target.classList.contains("lightbox__close")) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !box.hidden) close(); });
  }
})();
