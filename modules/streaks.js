/* =====================================================
   FocusFlow — Streak Module
   Tracks daily activity streaks, milestones, and renders
   streak widgets / stats sections.
   ===================================================== */

const STREAK_KEY = 'focusflow_streak';

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365];

const StreakModule = {
  data: {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    totalDaysActive: 0,
    milestonesCelebrated: [],
  },

  /* ---- Persistence ---- */

  load() {
    try {
      const raw = localStorage.getItem(STREAK_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.data = {
          currentStreak: parsed.currentStreak || 0,
          longestStreak: parsed.longestStreak || 0,
          lastActiveDate: parsed.lastActiveDate || null,
          totalDaysActive: parsed.totalDaysActive || 0,
          milestonesCelebrated: Array.isArray(parsed.milestonesCelebrated)
            ? parsed.milestonesCelebrated
            : [],
        };
      }
    } catch (_err) {
      // Corrupted data — keep defaults
    }
  },

  save() {
    try {
      localStorage.setItem(STREAK_KEY, JSON.stringify(this.data));
    } catch (_err) {
      // Storage full or unavailable
    }
  },

  /* ---- Date helpers ---- */

  formatDate(date) {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /** Returns the date string for yesterday relative to a given date */
  _yesterday(dateStr) {
    const d = new Date(dateStr + 'T12:00:00'); // noon to avoid DST edge cases
    d.setDate(d.getDate() - 1);
    return this.formatDate(d);
  },

  /* ---- Core logic ---- */

  /**
   * Called when a focus session completes.
   * Determines whether to increment, maintain, or reset the streak.
   */
  recordActivity() {
    const today = this.formatDate(new Date());

    // Already recorded today — nothing to do
    if (this.data.lastActiveDate === today) {
      return;
    }

    const previousStreak = this.data.currentStreak;

    if (this.data.lastActiveDate === null) {
      // Very first activity ever
      this.data.currentStreak = 1;
      this.data.totalDaysActive = 1;
    } else if (this.data.lastActiveDate === this._yesterday(today)) {
      // Consecutive day — extend streak
      this.data.currentStreak += 1;
      this.data.totalDaysActive += 1;
    } else {
      // Streak broken
      if (previousStreak > 3 && typeof showToast === 'function') {
        showToast(
          `Chuỗi ${previousStreak} ngay da bi mat. Bat dau lai nao!`,
          'warning',
          4000
        );
      }
      this.data.currentStreak = 1;
      this.data.totalDaysActive += 1;
    }

    this.data.lastActiveDate = today;

    // Update longest streak
    if (this.data.currentStreak > this.data.longestStreak) {
      this.data.longestStreak = this.data.currentStreak;
    }

    this.save();
    this.checkMilestones();
    this.renderStreakWidget();
  },

  /* ---- Milestones ---- */

  checkMilestones() {
    const streak = this.data.currentStreak;

    STREAK_MILESTONES.forEach((milestone) => {
      if (streak >= milestone && !this.data.milestonesCelebrated.includes(milestone)) {
        this.data.milestonesCelebrated.push(milestone);
        this.save();
        this.showMilestoneAnimation(milestone);

        // Map milestones to achievement IDs
        const milestoneAchievementMap = {
          7: 'streak_7',
          30: 'streak_30',
          100: 'streak_100',
        };
        const achievementId = milestoneAchievementMap[milestone];
        if (achievementId && typeof AchievementModule !== 'undefined' && AchievementModule.unlock) {
          AchievementModule.unlock(achievementId);
        }
      }
    });
  },

  /* ---- Animations ---- */

  showMilestoneAnimation(days) {
    // Remove existing overlay if present
    const existing = document.querySelector('.streak-milestone-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'streak-milestone-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', `Milestone ${days} ngay`);

    // Confetti particles
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'streak-milestone__confetti';
    for (let i = 0; i < 40; i++) {
      const particle = document.createElement('span');
      particle.className = 'streak-milestone__particle';
      particle.style.setProperty('--x', `${Math.random() * 100}%`);
      particle.style.setProperty('--delay', `${Math.random() * 0.6}s`);
      particle.style.setProperty('--duration', `${1.5 + Math.random() * 2}s`);
      particle.style.setProperty('--rotation', `${Math.random() * 720 - 360}deg`);
      particle.style.setProperty('--color', this._randomConfettiColor());
      confettiContainer.appendChild(particle);
    }

    const content = document.createElement('div');
    content.className = 'streak-milestone__content';

    const iconEl = document.createElement('div');
    iconEl.className = 'streak-milestone__icon';
    iconEl.textContent = days >= 100 ? '\uD83C\uDFC6' : '\uD83D\uDD25'; // trophy or fire

    const numberEl = document.createElement('div');
    numberEl.className = 'streak-milestone__number';
    numberEl.textContent = days;

    const labelEl = document.createElement('div');
    labelEl.className = 'streak-milestone__label';
    labelEl.textContent = `ngay lien tuc!`;

    const msgEl = document.createElement('div');
    msgEl.className = 'streak-milestone__message';
    msgEl.textContent = this._getMilestoneMessage(days);

    content.appendChild(iconEl);
    content.appendChild(numberEl);
    content.appendChild(labelEl);
    content.appendChild(msgEl);

    overlay.appendChild(confettiContainer);
    overlay.appendChild(content);

    // Click to dismiss
    overlay.addEventListener('click', () => {
      overlay.classList.add('streak-milestone-overlay--leaving');
      setTimeout(() => overlay.remove(), 400);
    });

    document.body.appendChild(overlay);

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.classList.add('streak-milestone-overlay--leaving');
        setTimeout(() => {
          if (overlay.parentNode) overlay.remove();
        }, 400);
      }
    }, 4000);
  },

  _getMilestoneMessage(days) {
    const messages = {
      3: 'Khoi dau tot dep!',
      7: 'Mot tuan kien tri! Tuyet voi!',
      14: 'Hai tuan lien tuc! Qua gioi!',
      30: 'Mot thang khong nghi! Phi thuong!',
      60: 'Hai thang vung ben! Dang ne!',
      100: 'Bach nhat! Ban la huyen thoai!',
      365: 'Mot nam lien tuc! Khong the tin noi!',
    };
    return messages[days] || `${days} ngay lien tuc! Tiep tuc phat huy!`;
  },

  _randomConfettiColor() {
    const colors = [
      '#d4b872', '#5a9e76', '#e8c547', '#ff7043',
      '#42a5f5', '#ab47bc', '#ef5350', '#66bb6a',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  /* ---- Getters ---- */

  getStreakData() {
    return { ...this.data };
  },

  /* ---- Rendering ---- */

  /**
   * Renders the compact streak widget.
   * Looks for an element with id="streak-widget" in the DOM.
   */
  renderStreakWidget() {
    let widget = document.getElementById('streak-widget');
    if (!widget) return; // Integration agent will create the container

    const streak = this.data.currentStreak;
    const isActive = streak > 0;

    widget.className = 'streak-widget' + (isActive ? ' streak-widget--active' : '');

    widget.innerHTML = '';

    const iconEl = document.createElement('span');
    iconEl.className = 'streak-widget__icon';
    iconEl.textContent = isActive ? '\uD83D\uDD25' : '\uD83D\uDE22'; // fire or sad

    const countEl = document.createElement('span');
    countEl.className = 'streak-widget__count';
    countEl.textContent = streak;

    const unitEl = document.createElement('span');
    unitEl.className = 'streak-widget__unit';
    unitEl.textContent = 'ngay';

    widget.appendChild(iconEl);
    widget.appendChild(countEl);
    widget.appendChild(unitEl);

    // Add pulse animation when streak is high
    if (streak >= 7) {
      widget.classList.add('streak-widget--hot');
    }
    if (streak >= 30) {
      widget.classList.add('streak-widget--blazing');
    }
  },

  /**
   * Renders the detailed streak section for the stats / analytics page.
   * @param {HTMLElement} container — the element to render into
   */
  renderStreakSection(container) {
    if (!container) return;

    const { currentStreak, longestStreak, totalDaysActive } = this.data;

    container.innerHTML = '';
    container.className = 'streak-section';

    // Title
    const title = document.createElement('h3');
    title.className = 'streak-section__title';
    title.textContent = 'Chuoi hoat dong';
    container.appendChild(title);

    // Stats row
    const statsRow = document.createElement('div');
    statsRow.className = 'streak-section__stats';

    const statItems = [
      { label: 'Hien tai', value: currentStreak, icon: '\uD83D\uDD25', highlight: true },
      { label: 'Ky luc', value: longestStreak, icon: '\uD83C\uDFC6' },
      { label: 'Tong ngay', value: totalDaysActive, icon: '\uD83D\uDCC5' },
    ];

    statItems.forEach((item) => {
      const statEl = document.createElement('div');
      statEl.className = 'streak-section__stat' + (item.highlight ? ' streak-section__stat--highlight' : '');

      const iconSpan = document.createElement('span');
      iconSpan.className = 'streak-section__stat-icon';
      iconSpan.textContent = item.icon;

      const valueSpan = document.createElement('span');
      valueSpan.className = 'streak-section__stat-value';
      valueSpan.textContent = item.value;

      const labelSpan = document.createElement('span');
      labelSpan.className = 'streak-section__stat-label';
      labelSpan.textContent = item.label;

      statEl.appendChild(iconSpan);
      statEl.appendChild(valueSpan);
      statEl.appendChild(labelSpan);
      statsRow.appendChild(statEl);
    });

    container.appendChild(statsRow);

    // Flame visualization (proportional to streak)
    const flameRow = document.createElement('div');
    flameRow.className = 'streak-section__flames';

    const maxFlames = Math.min(currentStreak, 30);
    for (let i = 0; i < maxFlames; i++) {
      const flame = document.createElement('span');
      flame.className = 'streak-section__flame';
      flame.textContent = '\uD83D\uDD25';
      flame.style.setProperty('--index', String(i));
      flame.style.animationDelay = `${i * 0.05}s`;
      flameRow.appendChild(flame);
    }
    if (currentStreak > 30) {
      const more = document.createElement('span');
      more.className = 'streak-section__flame-more';
      more.textContent = `+${currentStreak - 30}`;
      flameRow.appendChild(more);
    }
    container.appendChild(flameRow);

    // Next milestone indicator
    const nextMilestone = STREAK_MILESTONES.find((m) => m > currentStreak);
    if (nextMilestone) {
      const milestoneEl = document.createElement('div');
      milestoneEl.className = 'streak-section__next-milestone';

      const progress = currentStreak / nextMilestone;
      const progressBar = document.createElement('div');
      progressBar.className = 'streak-section__progress-bar';

      const progressFill = document.createElement('div');
      progressFill.className = 'streak-section__progress-fill';
      progressFill.style.width = `${Math.min(progress * 100, 100)}%`;

      progressBar.appendChild(progressFill);

      const milestoneLabel = document.createElement('span');
      milestoneLabel.className = 'streak-section__milestone-label';
      milestoneLabel.textContent = `Milestone tiep theo: ${nextMilestone} ngay (con ${nextMilestone - currentStreak})`;

      milestoneEl.appendChild(progressBar);
      milestoneEl.appendChild(milestoneLabel);
      container.appendChild(milestoneEl);
    }
  },
};

// Auto-load on script load
StreakModule.load();
