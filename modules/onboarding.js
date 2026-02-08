/**
 * FocusFlow — Onboarding System
 * Self-contained module that shows a 5-step tutorial overlay for first-time users.
 * Creates sample tasks on completion to help users get started.
 *
 * Dependencies: None (self-initializes via DOMContentLoaded)
 * Integrates with: global `tasks` array + `saveTasks()` if available, otherwise localStorage directly.
 */
(function FocusFlowOnboarding() {
  "use strict";

  // ============================================================
  // CONSTANTS
  // ============================================================
  var ONBOARDING_KEY = "focusflow_onboarding_complete";
  var TASKS_KEY = "focusflow_tasks";
  var TOTAL_STEPS = 5;

  // ============================================================
  // STEP DATA
  // ============================================================
  var STEPS = [
    {
      icon: "\uD83C\uDFAF", // target emoji
      title: "Ch\u00E0o m\u1EEBng \u0111\u1EBFn FocusFlow! \uD83C\uDFAF",
      desc:
        "FocusFlow gi\u00FAp b\u1EA1n l\u00E0m vi\u1EC7c hi\u1EC7u qu\u1EA3 v\u1EDBi quy tr\u00ECnh 3 b\u01B0\u1EDBc \u0111\u01A1n gi\u1EA3n: " +
        "X\u00E1c \u0111\u1ECBnh \u01B0u ti\u00EAn \u2192 L\u00EAn l\u1ECBch th\u1EDDi gian \u2192 T\u1EADp trung s\u00E2u. " +
        "H\u00E3y c\u00F9ng kh\u00E1m ph\u00E1 t\u1EEBng b\u01B0\u1EDBc nh\u00E9!",
      illustration: "welcome",
    },
    {
      icon: "\uD83D\uDCCA", // bar chart emoji
      title: "\uD83D\uDCCA B\u01B0\u1EDBc 1: X\u00E1c \u0111\u1ECBnh \u01B0u ti\u00EAn",
      desc:
        "S\u1EED d\u1EE5ng Ma tr\u1EADn Eisenhower \u0111\u1EC3 ph\u00E2n lo\u1EA1i c\u00F4ng vi\u1EC7c v\u00E0o 4 \u00F4: " +
        "vi\u1EC7c quan tr\u1ECDng \u0111\u01B0\u1EE3c \u01B0u ti\u00EAn, vi\u1EC7c kh\u00F4ng c\u1EA7n thi\u1EBFt \u0111\u01B0\u1EE3c lo\u1EA1i b\u1ECF. " +
        "T\u1EADp trung v\u00E0o \u0111i\u1EC1u th\u1EF1c s\u1EF1 quan tr\u1ECDng!",
      illustration: "quadrant",
    },
    {
      icon: "\u23F0", // alarm clock emoji
      title: "\u23F0 B\u01B0\u1EDBc 2: L\u00EAn l\u1ECBch th\u1EDDi gian",
      desc:
        "Ph\u00E2n b\u1ED5 th\u1EDDi gian cho t\u1EEBng c\u00F4ng vi\u1EC7c b\u1EB1ng Time Blocking. " +
        "Xem timeline tr\u1EF1c quan v\u1EDBi m\u00E0u s\u1EAFc, k\u00E9o th\u1EA3 \u0111\u1EC3 s\u1EAFp x\u1EBFp l\u1ECBch tr\u00ECnh h\u1EE3p l\u00FD.",
      illustration: "timeline",
    },
    {
      icon: "\uD83D\uDD25", // fire emoji
      title: "\uD83D\uDD25 B\u01B0\u1EDBc 3: T\u1EADp trung s\u00E2u",
      desc:
        "S\u1EED d\u1EE5ng Pomodoro Timer \u0111\u1EC3 duy tr\u00EC s\u1EF1 t\u1EADp trung: " +
        "l\u00E0m vi\u1EC7c t\u1EADp trung \u2192 ngh\u1EC9 ng\u01A1i ng\u1EAFn \u2192 l\u1EB7p l\u1EA1i. " +
        "Ch\u1ECDn 25, 50 ho\u1EB7c 90 ph\u00FAt t\u00F9y theo n\u0103ng l\u01B0\u1EE3ng c\u1EE7a b\u1EA1n.",
      illustration: "pomodoro",
    },
    {
      icon: "\uD83D\uDE80", // rocket emoji
      title: "\uD83D\uDE80 B\u1EA1n \u0111\u00E3 s\u1EB5n s\u00E0ng!",
      desc:
        "B\u1EAFt \u0111\u1EA7u v\u1EDBi 3 task m\u1EABu \u0111\u00E3 \u0111\u01B0\u1EE3c t\u1EA1o s\u1EB5n. " +
        "Nh\u1EA5n ph\u00EDm ? \u0111\u1EC3 xem phi\u00EDm t\u1EAFt, v\u00E0 chuy\u1EC3n giao di\u1EC7n s\u00E1ng/t\u1ED1i \u1EDF thanh b\u00EAn. " +
        "Ch\u00FAc b\u1EA1n l\u00E0m vi\u1EC7c hi\u1EC7u qu\u1EA3!",
      illustration: "ready",
    },
  ];

  // ============================================================
  // BUILD ILLUSTRATION HTML
  // ============================================================
  function buildIllustration(type) {
    switch (type) {
      case "welcome":
        return (
          '<div class="onboarding__features">' +
          '<div class="onboarding__feature-item">' +
          '<span class="onboarding__feature-icon">\uD83C\uDFAF</span>' +
          "<span>Priority Flow \u2014 X\u00E1c \u0111\u1ECBnh vi\u1EC7c \u01B0u ti\u00EAn</span>" +
          "</div>" +
          '<div class="onboarding__feature-item">' +
          '<span class="onboarding__feature-icon">\u23F0</span>' +
          "<span>Time Flow \u2014 L\u00EAn l\u1ECBch th\u1EDDi gian</span>" +
          "</div>" +
          '<div class="onboarding__feature-item">' +
          '<span class="onboarding__feature-icon">\uD83D\uDD25</span>' +
          "<span>Deep Flow \u2014 T\u1EADp trung s\u00E2u</span>" +
          "</div>" +
          "</div>"
        );

      case "quadrant":
        return (
          '<div class="onboarding__quadrant-grid">' +
          '<div class="onboarding__quadrant-item onboarding__quadrant-item--do">' +
          "\uD83D\uDD25 L\u00E0m ngay</div>" +
          '<div class="onboarding__quadrant-item onboarding__quadrant-item--delegate">' +
          "\uD83D\uDC65 \u1EE6y quy\u1EC1n</div>" +
          '<div class="onboarding__quadrant-item onboarding__quadrant-item--schedule">' +
          "\uD83D\uDCC5 L\u00EAn l\u1ECBch</div>" +
          '<div class="onboarding__quadrant-item onboarding__quadrant-item--eliminate">' +
          "\uD83D\uDDD1\uFE0F Lo\u1EA1i b\u1ECF</div>" +
          "</div>"
        );

      case "timeline":
        return (
          '<div class="onboarding__timeline">' +
          '<div class="onboarding__timeline-bar onboarding__timeline-bar--1">9:00 \u2014 Vi\u1EBFt b\u00E1o c\u00E1o</div>' +
          '<div class="onboarding__timeline-bar onboarding__timeline-bar--2">10:30 \u2014 Meeting</div>' +
          '<div class="onboarding__timeline-bar onboarding__timeline-bar--3">13:00 \u2014 Deep work</div>' +
          "</div>"
        );

      case "pomodoro":
        return (
          '<div class="onboarding__pomodoro">' +
          '<div class="onboarding__pomodoro-phase onboarding__pomodoro-phase--focus">' +
          "\uD83D\uDD25<span>Focus</span><span>50 ph\u00FAt</span></div>" +
          '<span class="onboarding__pomodoro-arrow">\u2192</span>' +
          '<div class="onboarding__pomodoro-phase onboarding__pomodoro-phase--break">' +
          "\u2615<span>Ngh\u1EC9</span><span>10 ph\u00FAt</span></div>" +
          '<span class="onboarding__pomodoro-arrow">\u2192</span>' +
          '<div class="onboarding__pomodoro-phase onboarding__pomodoro-phase--focus">' +
          "\uD83D\uDD01<span>L\u1EB7p l\u1EA1i</span></div>" +
          "</div>"
        );

      case "ready":
        return (
          '<div class="onboarding__features">' +
          '<div class="onboarding__feature-item">' +
          '<span class="onboarding__feature-icon">\u2328\uFE0F</span>' +
          "<span>Nh\u1EA5n <strong>?</strong> \u0111\u1EC3 xem ph\u00EDm t\u1EAFt</span>" +
          "</div>" +
          '<div class="onboarding__feature-item">' +
          '<span class="onboarding__feature-icon">\uD83C\uDF19</span>' +
          "<span>Chuy\u1EC3n giao di\u1EC7n s\u00E1ng/t\u1ED1i \u1EDF sidebar</span>" +
          "</div>" +
          '<div class="onboarding__feature-item">' +
          '<span class="onboarding__feature-icon">\uD83D\uDCF1</span>' +
          "<span>Ho\u1EA1t \u0111\u1ED9ng tr\u00EAn m\u1ECDi thi\u1EBFt b\u1ECB (PWA)</span>" +
          "</div>" +
          "</div>"
        );

      default:
        return "";
    }
  }

  // ============================================================
  // BUILD OVERLAY DOM
  // ============================================================
  function buildOverlay() {
    var overlay = document.createElement("div");
    overlay.className = "onboarding__overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "H\u01B0\u1EDBng d\u1EABn s\u1EED d\u1EE5ng FocusFlow");

    var html = '<div class="onboarding__card">';
    html += '<div class="onboarding__steps">';

    for (var i = 0; i < STEPS.length; i++) {
      var step = STEPS[i];
      var activeClass = i === 0 ? " is-active" : "";

      html += '<div class="onboarding__step' + activeClass + '" data-step="' + i + '">';
      html += '<div class="onboarding__icon">' + step.icon + "</div>";
      html += '<h2 class="onboarding__title">' + step.title + "</h2>";
      html += '<p class="onboarding__desc">' + step.desc + "</p>";

      if (step.illustration) {
        html += '<div class="onboarding__illustration">';
        html += buildIllustration(step.illustration);
        html += "</div>";
      }

      html += "</div>"; // .onboarding__step
    }

    html += "</div>"; // .onboarding__steps

    // Footer: skip + dots + next
    html += '<div class="onboarding__footer">';
    html +=
      '<button class="onboarding__btn-skip" type="button" aria-label="B\u1ECF qua h\u01B0\u1EDBng d\u1EABn">' +
      "B\u1ECF qua</button>";

    html += '<div class="onboarding__dots" role="tablist" aria-label="B\u01B0\u1EDBc">';
    for (var d = 0; d < TOTAL_STEPS; d++) {
      var dotActiveClass = d === 0 ? " is-active" : "";
      html +=
        '<button class="onboarding__dot' +
        dotActiveClass +
        '" type="button" data-dot="' +
        d +
        '" role="tab" aria-selected="' +
        (d === 0 ? "true" : "false") +
        '" aria-label="B\u01B0\u1EDBc ' +
        (d + 1) +
        '"></button>';
    }
    html += "</div>";

    html +=
      '<button class="onboarding__btn-next" type="button">' +
      "<span>Ti\u1EBFp theo</span>" +
      '<span class="onboarding__btn-arrow">\u2192</span>' +
      "</button>";

    html += "</div>"; // .onboarding__footer
    html += "</div>"; // .onboarding__card

    overlay.innerHTML = html;
    return overlay;
  }

  // ============================================================
  // INJECT STYLESHEET
  // ============================================================
  function injectStylesheet() {
    // Check if already injected
    if (document.querySelector('link[data-onboarding-css]')) return;

    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.setAttribute("data-onboarding-css", "true");

    // Resolve path relative to the current script or base URL
    var scripts = document.querySelectorAll("script[src]");
    var basePath = "";
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute("src");
      if (src && src.indexOf("onboarding") !== -1) {
        basePath = src.substring(0, src.lastIndexOf("/") + 1);
        break;
      }
    }

    // Fallback: try modules/ relative to page
    if (!basePath) {
      basePath = "modules/";
    }

    link.href = basePath + "onboarding.css";
    document.head.appendChild(link);
  }

  // ============================================================
  // ONBOARDING CONTROLLER
  // ============================================================
  function Onboarding() {
    this.currentStep = 0;
    this.overlay = null;
    this.isAnimating = false;
  }

  Onboarding.prototype.init = function () {
    // Guard: already completed
    try {
      if (localStorage.getItem(ONBOARDING_KEY)) return;
    } catch (e) {
      return; // localStorage not available
    }

    // Inject CSS
    injectStylesheet();

    // Build and inject overlay
    this.overlay = buildOverlay();
    document.body.appendChild(this.overlay);

    // Cache elements
    this.card = this.overlay.querySelector(".onboarding__card");
    this.stepsEls = this.overlay.querySelectorAll(".onboarding__step");
    this.dots = this.overlay.querySelectorAll(".onboarding__dot");
    this.btnNext = this.overlay.querySelector(".onboarding__btn-next");
    this.btnSkip = this.overlay.querySelector(".onboarding__btn-skip");

    // Bind events
    this.bindEvents();

    // Show with entry animation
    this.show();
  };

  Onboarding.prototype.bindEvents = function () {
    var self = this;

    // Next button
    this.btnNext.addEventListener("click", function () {
      if (self.currentStep < TOTAL_STEPS - 1) {
        self.goToStep(self.currentStep + 1);
      } else {
        self.complete();
      }
    });

    // Skip button
    this.btnSkip.addEventListener("click", function () {
      self.complete();
    });

    // Dot navigation
    this.dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        var target = parseInt(dot.getAttribute("data-dot"), 10);
        if (!isNaN(target) && target !== self.currentStep) {
          self.goToStep(target);
        }
      });
    });

    // Keyboard navigation
    this.handleKeydown = function (e) {
      if (e.key === "Escape") {
        self.complete();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        if (self.currentStep < TOTAL_STEPS - 1) {
          self.goToStep(self.currentStep + 1);
        } else {
          self.complete();
        }
      } else if (e.key === "ArrowLeft") {
        if (self.currentStep > 0) {
          self.goToStep(self.currentStep - 1);
        }
      }
    };
    document.addEventListener("keydown", this.handleKeydown);

    // Prevent scroll behind overlay
    this.overlay.addEventListener("wheel", function (e) {
      // Allow scroll inside card, block outside
      var card = self.card;
      if (!card.contains(e.target)) {
        e.preventDefault();
      }
    }, { passive: false });
  };

  Onboarding.prototype.show = function () {
    var self = this;
    // Start with entering state
    this.overlay.classList.add("is-entering");
    this.overlay.classList.add("is-visible");

    // Trigger animation
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        self.overlay.classList.remove("is-entering");
      });
    });

    // Prevent body scroll
    document.body.style.overflow = "hidden";
  };

  Onboarding.prototype.goToStep = function (target) {
    if (this.isAnimating || target === this.currentStep) return;
    if (target < 0 || target >= TOTAL_STEPS) return;

    this.isAnimating = true;
    var self = this;
    var goingForward = target > this.currentStep;
    var currentEl = this.stepsEls[this.currentStep];
    var targetEl = this.stepsEls[target];

    // Exit current step
    currentEl.classList.add(goingForward ? "is-exiting-left" : "is-exiting-right");
    currentEl.classList.remove("is-active");

    // After exit animation, show target
    setTimeout(function () {
      currentEl.classList.remove("is-exiting-left", "is-exiting-right");

      // Prepare target for entry
      targetEl.style.transform = goingForward
        ? "translateX(var(--onboarding-slide-distance))"
        : "translateX(calc(var(--onboarding-slide-distance) * -1))";
      targetEl.classList.add("is-active");

      // Trigger slide-in
      requestAnimationFrame(function () {
        targetEl.style.transform = "";
        self.isAnimating = false;
      });
    }, 280);

    // Update state
    this.currentStep = target;
    this.updateDots();
    this.updateNextButton();
  };

  Onboarding.prototype.updateDots = function () {
    var self = this;
    this.dots.forEach(function (dot, index) {
      dot.classList.remove("is-active", "is-completed");
      dot.setAttribute("aria-selected", "false");

      if (index === self.currentStep) {
        dot.classList.add("is-active");
        dot.setAttribute("aria-selected", "true");
      } else if (index < self.currentStep) {
        dot.classList.add("is-completed");
      }
    });
  };

  Onboarding.prototype.updateNextButton = function () {
    if (this.currentStep === TOTAL_STEPS - 1) {
      this.btnNext.innerHTML =
        "<span>B\u1EAFt \u0111\u1EA7u!</span>" +
        '<span class="onboarding__btn-arrow">\uD83D\uDE80</span>';
      this.btnNext.classList.add("onboarding__btn-next--start");
    } else {
      this.btnNext.innerHTML =
        "<span>Ti\u1EBFp theo</span>" +
        '<span class="onboarding__btn-arrow">\u2192</span>';
      this.btnNext.classList.remove("onboarding__btn-next--start");
    }
  };

  Onboarding.prototype.complete = function () {
    var self = this;

    // Mark as completed
    try {
      localStorage.setItem(ONBOARDING_KEY, "true");
    } catch (e) {
      // ignore
    }

    // Create sample tasks
    this.createSampleTasks();

    // Exit animation
    this.overlay.classList.add("is-exiting");

    setTimeout(function () {
      // Restore body scroll
      document.body.style.overflow = "";

      // Remove keyboard listener
      if (self.handleKeydown) {
        document.removeEventListener("keydown", self.handleKeydown);
      }

      // Remove overlay from DOM
      if (self.overlay && self.overlay.parentNode) {
        self.overlay.parentNode.removeChild(self.overlay);
      }
      self.overlay = null;

      // Trigger re-render if app functions exist
      if (typeof window.renderMatrix === "function") {
        try {
          window.renderMatrix();
        } catch (e) {
          // ignore
        }
      }

      // Show welcome toast if available
      if (typeof window.showToast === "function") {
        try {
          window.showToast(
            "Ch\u00E0o m\u1EEBng b\u1EA1n \u0111\u1EBFn FocusFlow! 3 task m\u1EABu \u0111\u00E3 \u0111\u01B0\u1EE3c t\u1EA1o s\u1EB5n.",
            "success",
            4000
          );
        } catch (e) {
          // ignore
        }
      }
    }, 350);
  };

  Onboarding.prototype.createSampleTasks = function () {
    var now = Date.now();

    var sampleTasks = [
      {
        id: generateId(),
        text: "T\u00ECm hi\u1EC3u FocusFlow",
        done: false,
        important: true,
        urgent: true,
        estimateMinutes: 30,
        createdAt: now,
      },
      {
        id: generateId(),
        text: "L\u00EAn k\u1EBF ho\u1EA1ch tu\u1EA7n n\u00E0y",
        done: false,
        important: true,
        urgent: false,
        estimateMinutes: 30,
        createdAt: now + 1,
      },
      {
        id: generateId(),
        text: "D\u1ECDn d\u1EB9p email",
        done: false,
        important: false,
        urgent: true,
        estimateMinutes: 30,
        createdAt: now + 2,
      },
    ];

    // Strategy 1: Use global tasks array + saveTasks() (preferred)
    if (typeof window.tasks !== "undefined" && Array.isArray(window.tasks)) {
      for (var i = 0; i < sampleTasks.length; i++) {
        window.tasks.push(sampleTasks[i]);
      }
      if (typeof window.saveTasks === "function") {
        try {
          window.saveTasks();
        } catch (e) {
          // fallback to direct storage below
          this.saveTasksDirect(sampleTasks);
        }
      } else {
        // Global array exists but no saveTasks — save directly
        this.saveTasksDirect(sampleTasks);
      }
      return;
    }

    // Strategy 2: Directly write to localStorage
    this.saveTasksDirect(sampleTasks);
  };

  Onboarding.prototype.saveTasksDirect = function (sampleTasks) {
    try {
      var existing = [];
      var raw = localStorage.getItem(TASKS_KEY);
      if (raw) {
        try {
          existing = JSON.parse(raw);
          if (!Array.isArray(existing)) existing = [];
        } catch (e) {
          existing = [];
        }
      }

      for (var i = 0; i < sampleTasks.length; i++) {
        existing.push(sampleTasks[i]);
      }

      localStorage.setItem(TASKS_KEY, JSON.stringify(existing));
    } catch (e) {
      // localStorage not writable — silently fail
    }
  };

  // ============================================================
  // UTILITY: Generate unique ID
  // ============================================================
  function generateId() {
    // Use crypto.randomUUID if available (matches app.js pattern), otherwise fallback
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return (
      "ob-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).substring(2, 9)
    );
  }

  // ============================================================
  // SELF-INITIALIZE
  // ============================================================
  function boot() {
    // Guard: already completed
    try {
      if (localStorage.getItem(ONBOARDING_KEY)) return;
    } catch (e) {
      return;
    }

    // Guard: wait for landing page to hide before showing onboarding
    if (typeof LandingModule !== "undefined" && LandingModule.isVisible()) {
      document.addEventListener("landing:hidden", function() {
        setTimeout(function() {
          var onboarding = new Onboarding();
          onboarding.init();
        }, 300);
      }, { once: true });
      return;
    }

    // Delay 600ms to ensure app.js has loaded and initialized
    setTimeout(function () {
      var onboarding = new Onboarding();
      onboarding.init();
    }, 600);
  }

  // Listen for DOMContentLoaded (or run immediately if already loaded)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
