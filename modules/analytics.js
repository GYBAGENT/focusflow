/* =====================================================
   FocusFlow — Analytics Module (Round 6)
   Advanced analytics: heatmap, insights, productive hours.
   Renders into #analytics-advanced in the Stats view.
   ===================================================== */

var AnalyticsModule = {

  _container: null,
  _initialized: false,

  /* ---- Public API ---- */

  init: function () {
    this._container = document.getElementById("analytics-advanced");
    if (!this._container) return;
    this._initialized = true;
    this.render();
  },

  render: function () {
    if (!this._container) return;
    this._container.innerHTML = "";

    var allSessions = this._getSessions();
    var focusSessions = allSessions.filter(function (s) { return s.type === "focus"; });

    if (focusSessions.length === 0) {
      this._renderEmptyState();
      return;
    }

    this._renderInsightCards(focusSessions);
    this._renderHeatmap(focusSessions);
    this._renderProductiveHours(focusSessions);
  },

  /* ---- Empty State ---- */

  _renderEmptyState: function () {
    var el = document.createElement("div");
    el.className = "analytics-empty";

    var icon = document.createElement("span");
    icon.className = "analytics-empty__icon";
    icon.textContent = "\uD83D\uDCCA";

    var text = document.createElement("p");
    text.className = "analytics-empty__text";
    text.textContent = "Ho\u00E0n th\u00E0nh v\u00E0i phi\u00EAn focus \u0111\u1EC3 xem ph\u00E2n t\u00EDch chi ti\u1EBFt.";

    el.appendChild(icon);
    el.appendChild(text);
    this._container.appendChild(el);
  },

  /* ---- Insight Cards ---- */

  _renderInsightCards: function (focusSessions) {
    var wrapper = document.createElement("div");
    wrapper.className = "analytics-insights";

    var bestHours = this._getBestHours(focusSessions);
    var avgMinutes = this._getAverageDailyMinutes(focusSessions);
    var goalRate = this._getGoalAchievementRate(focusSessions);
    var longestStreak = this._getLongestStreak(focusSessions);

    wrapper.appendChild(this._createCard(
      "\uD83D\uDD50",
      "Gi\u1EDD v\u00E0ng",
      bestHours.length > 0 ? bestHours.join(", ") : "\u2014",
      "Khung gi\u1EDD t\u1EADp trung t\u1ED1t nh\u1EA5t"
    ));

    wrapper.appendChild(this._createCard(
      "\uD83D\uDCC8",
      "Trung b\u00ECnh",
      avgMinutes + " ph\u00FAt/ng\u00E0y",
      "Th\u1EDDi gian focus trung b\u00ECnh"
    ));

    wrapper.appendChild(this._createCard(
      "\uD83C\uDFAF",
      "\u0110\u1EA1t m\u1EE5c ti\u00EAu",
      goalRate + "%",
      "T\u1EC9 l\u1EC7 ng\u00E0y \u0111\u1EA1t daily goal"
    ));

    wrapper.appendChild(this._createCard(
      "\uD83D\uDD25",
      "Chu\u1ED7i t\u1ED1t nh\u1EA5t",
      longestStreak + " ng\u00E0y",
      "Chu\u1ED7i li\u00EAn ti\u1EBFp d\u00E0i nh\u1EA5t"
    ));

    this._container.appendChild(wrapper);
  },

  _createCard: function (icon, label, value, detail) {
    var card = document.createElement("div");
    card.className = "analytics-insight-card";

    var iconEl = document.createElement("div");
    iconEl.className = "analytics-insight-card__icon";
    iconEl.textContent = icon;

    var labelEl = document.createElement("div");
    labelEl.className = "analytics-insight-card__label";
    labelEl.textContent = label;

    var valueEl = document.createElement("div");
    valueEl.className = "analytics-insight-card__value";
    valueEl.textContent = value;

    var detailEl = document.createElement("div");
    detailEl.className = "analytics-insight-card__detail";
    detailEl.textContent = detail;

    card.appendChild(iconEl);
    card.appendChild(labelEl);
    card.appendChild(valueEl);
    card.appendChild(detailEl);
    return card;
  },

  /* ---- 30-Day Heatmap ---- */

  _renderHeatmap: function (focusSessions) {
    var self = this;
    var section = document.createElement("div");
    section.className = "analytics-heatmap";

    var title = document.createElement("h4");
    title.className = "analytics-heatmap__title";
    title.textContent = "\uD83D\uDCC5 30 ng\u00E0y g\u1EA7n \u0111\u00E2y";
    section.appendChild(title);

    var byDate = this._getSessionsByDate(focusSessions);

    var grid = document.createElement("div");
    grid.className = "analytics-heatmap__grid";

    var dayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    dayLabels.forEach(function (label) {
      var dayLabel = document.createElement("div");
      dayLabel.className = "analytics-heatmap__day-label";
      dayLabel.textContent = label;
      grid.appendChild(dayLabel);
    });

    var today = new Date();
    var startDate = new Date(today);
    startDate.setDate(today.getDate() - 34);

    var startDay = startDate.getDay();
    var mondayOffset = startDay === 0 ? -6 : 1 - startDay;
    startDate.setDate(startDate.getDate() + mondayOffset);

    var current = new Date(startDate);
    var maxDays = 35;
    for (var i = 0; i < maxDays; i++) {
      var dateKey = self._formatDateKey(current);
      var data = byDate[dateKey];
      var minutes = data ? data.minutes : 0;

      var level = 0;
      if (minutes > 0 && minutes <= 30) level = 1;
      else if (minutes > 30 && minutes <= 60) level = 2;
      else if (minutes > 60 && minutes <= 120) level = 3;
      else if (minutes > 120) level = 4;

      var cell = document.createElement("div");
      cell.className = "analytics-heatmap__cell analytics-heatmap__cell--" + level;

      if (dateKey === self._formatDateKey(today)) {
        cell.classList.add("analytics-heatmap__cell--today");
      }

      if (current > today) {
        cell.classList.add("analytics-heatmap__cell--future");
      }

      var dayNum = current.getDate();
      var monthNum = current.getMonth() + 1;
      cell.title = dayNum + "/" + monthNum + ": " + minutes + " ph\u00FAt focus";

      if (dayNum === 1 || dateKey === self._formatDateKey(today)) {
        var dateLabel = document.createElement("span");
        dateLabel.className = "analytics-heatmap__date";
        dateLabel.textContent = String(dayNum);
        cell.appendChild(dateLabel);
      }

      grid.appendChild(cell);
      current.setDate(current.getDate() + 1);
    }

    section.appendChild(grid);

    var legend = document.createElement("div");
    legend.className = "analytics-heatmap__legend";
    legend.innerHTML =
      '<span class="analytics-heatmap__legend-label">\u00CDt</span>' +
      '<div class="analytics-heatmap__cell analytics-heatmap__cell--0 analytics-heatmap__cell--mini"></div>' +
      '<div class="analytics-heatmap__cell analytics-heatmap__cell--1 analytics-heatmap__cell--mini"></div>' +
      '<div class="analytics-heatmap__cell analytics-heatmap__cell--2 analytics-heatmap__cell--mini"></div>' +
      '<div class="analytics-heatmap__cell analytics-heatmap__cell--3 analytics-heatmap__cell--mini"></div>' +
      '<div class="analytics-heatmap__cell analytics-heatmap__cell--4 analytics-heatmap__cell--mini"></div>' +
      '<span class="analytics-heatmap__legend-label">Nhi\u1EC1u</span>';
    section.appendChild(legend);

    this._container.appendChild(section);
  },

  /* ---- Productive Hours Chart ---- */

  _renderProductiveHours: function (focusSessions) {
    var section = document.createElement("div");
    section.className = "analytics-hours";

    var title = document.createElement("h4");
    title.className = "analytics-hours__title";
    title.textContent = "\u23F0 Ph\u00E2n b\u1ED1 gi\u1EDD focus";
    section.appendChild(title);

    var hourMap = {};
    focusSessions.forEach(function (s) {
      var hour = new Date(s.completedAt).getHours();
      if (!hourMap[hour]) hourMap[hour] = 0;
      hourMap[hour] += s.durationMinutes;
    });

    var maxMinutes = 1;
    for (var h = 6; h <= 23; h++) {
      if (hourMap[h] && hourMap[h] > maxMinutes) maxMinutes = hourMap[h];
    }

    var chart = document.createElement("div");
    chart.className = "analytics-hours__chart";

    for (var hour = 6; hour <= 23; hour++) {
      var minutes = hourMap[hour] || 0;
      var pct = Math.round((minutes / maxMinutes) * 100);

      var row = document.createElement("div");
      row.className = "analytics-hours__bar-row";

      var label = document.createElement("span");
      label.className = "analytics-hours__label";
      label.textContent = String(hour).padStart(2, "0") + "h";

      var barBg = document.createElement("div");
      barBg.className = "analytics-hours__bar";

      var fill = document.createElement("div");
      fill.className = "analytics-hours__fill";
      fill.style.width = (minutes > 0 ? Math.max(pct, 4) : 0) + "%";

      var value = document.createElement("span");
      value.className = "analytics-hours__value";
      value.textContent = minutes > 0 ? minutes + "p" : "";

      barBg.appendChild(fill);
      row.appendChild(label);
      row.appendChild(barBg);
      row.appendChild(value);
      chart.appendChild(row);
    }

    section.appendChild(chart);
    this._container.appendChild(section);
  },

  /* ---- Data Helpers ---- */

  _getSessions: function () {
    if (typeof sessions !== "undefined" && Array.isArray(sessions)) return sessions;
    try {
      var raw = localStorage.getItem("focusflow_sessions");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  _getSessionsByDate: function (focusSessions) {
    var map = {};
    var self = this;
    focusSessions.forEach(function (s) {
      var key = self._formatDateKey(new Date(s.completedAt));
      if (!map[key]) map[key] = { minutes: 0, count: 0 };
      map[key].minutes += s.durationMinutes;
      map[key].count += 1;
    });
    return map;
  },

  _formatDateKey: function (date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, "0");
    var d = String(date.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  },

  _getBestHours: function (focusSessions) {
    var hourMap = {};
    focusSessions.forEach(function (s) {
      var hour = new Date(s.completedAt).getHours();
      if (!hourMap[hour]) hourMap[hour] = 0;
      hourMap[hour] += s.durationMinutes;
    });
    var sorted = Object.keys(hourMap).sort(function (a, b) {
      return hourMap[b] - hourMap[a];
    });
    return sorted.slice(0, 2).map(function (h) {
      return String(h).padStart(2, "0") + ":00";
    });
  },

  _getAverageDailyMinutes: function (focusSessions) {
    var byDate = this._getSessionsByDate(focusSessions);
    var dates = Object.keys(byDate);
    if (dates.length === 0) return 0;
    var total = dates.reduce(function (sum, key) {
      return sum + byDate[key].minutes;
    }, 0);
    return Math.round(total / dates.length);
  },

  _getGoalAchievementRate: function (focusSessions) {
    var goal = (typeof settings !== "undefined" && settings.dailyGoal)
      ? settings.dailyGoal
      : 4;
    var byDate = this._getSessionsByDate(focusSessions);
    var dates = Object.keys(byDate);
    if (dates.length === 0) return 0;
    var achieved = dates.filter(function (key) {
      return byDate[key].count >= goal;
    }).length;
    return Math.round((achieved / dates.length) * 100);
  },

  _getLongestStreak: function (focusSessions) {
    var byDate = this._getSessionsByDate(focusSessions);
    var dates = Object.keys(byDate).sort();
    if (dates.length === 0) return 0;
    if (dates.length === 1) return 1;

    var maxStreak = 1;
    var current = 1;
    for (var i = 1; i < dates.length; i++) {
      var prev = new Date(dates[i - 1] + "T12:00:00");
      var curr = new Date(dates[i] + "T12:00:00");
      var diff = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        current++;
        if (current > maxStreak) maxStreak = current;
      } else {
        current = 1;
      }
    }
    return maxStreak;
  }
};

/* =====================================================
   Self-initialization
   ===================================================== */

(function () {
  function tryInit() {
    AnalyticsModule.init();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(tryInit, 200);
    });
  } else {
    setTimeout(tryInit, 200);
  }
})();
