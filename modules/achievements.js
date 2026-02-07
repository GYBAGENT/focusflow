/* =====================================================
   FocusFlow — Achievement / Badge Module
   Defines all badges, tracks unlocks, and renders
   the badge grid + unlock animations.
   ===================================================== */

const ACHIEVEMENTS_KEY = 'focusflow_achievements';

const BADGE_DEFINITIONS = [
  {
    id: 'first_focus',
    name: 'Khoi Dau',
    desc: 'Hoan thanh phien focus dau tien',
    icon: '\uD83C\uDF31', // seedling
    category: 'milestone',
  },
  {
    id: 'streak_7',
    name: 'Tuan Vung Ben',
    desc: '7 ngay lien tuc',
    icon: '\uD83D\uDD25', // fire
    category: 'streak',
  },
  {
    id: 'streak_30',
    name: 'Thang Kien Tri',
    desc: '30 ngay lien tuc',
    icon: '\uD83D\uDCAA', // flexed biceps
    category: 'streak',
  },
  {
    id: 'streak_100',
    name: 'Bach Nhat',
    desc: '100 ngay lien tuc',
    icon: '\uD83C\uDFC5', // medal
    category: 'streak',
  },
  {
    id: 'deep_focus',
    name: 'Deep Worker',
    desc: 'Hoan thanh phien 90 phut',
    icon: '\uD83E\uDDE0', // brain
    category: 'focus',
  },
  {
    id: 'early_bird',
    name: 'Chim Som',
    desc: 'Focus truoc 7h sang',
    icon: '\uD83C\uDF05', // sunrise
    category: 'time',
  },
  {
    id: 'night_owl',
    name: 'Cu Dem',
    desc: 'Focus sau 22h',
    icon: '\uD83E\uDD89', // owl
    category: 'time',
  },
  {
    id: 'goal_crusher',
    name: 'Nghien Muc Tieu',
    desc: 'Dat muc tieu ngay 10 lan',
    icon: '\uD83C\uDFAF', // direct hit
    category: 'milestone',
  },
  {
    id: 'task_master_50',
    name: 'Task Master',
    desc: 'Hoan thanh 50 tasks',
    icon: '\u2705', // check mark
    category: 'tasks',
  },
  {
    id: 'focus_100',
    name: 'Century',
    desc: '100 phien focus',
    icon: '\uD83D\uDCAF', // 100
    category: 'milestone',
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    desc: '5 phien focus trong 1 ngay',
    icon: '\u26A1', // lightning
    category: 'focus',
  },
  {
    id: 'legend',
    name: 'Huyen Thoai',
    desc: 'Mo khoa tat ca badges',
    icon: '\uD83C\uDFC6', // trophy
    category: 'special',
  },
];

const AchievementModule = {
  unlocked: [], // Array of { id, unlockedAt }

  /* ---- Persistence ---- */

  load() {
    try {
      const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.unlocked = Array.isArray(parsed) ? parsed : [];
      }
    } catch (_err) {
      this.unlocked = [];
    }
  },

  save() {
    try {
      localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(this.unlocked));
    } catch (_err) {
      // Storage full or unavailable
    }
  },

  /* ---- Status checks ---- */

  isUnlocked(badgeId) {
    return this.unlocked.some((u) => u.id === badgeId);
  },

  getBadgeDef(badgeId) {
    return BADGE_DEFINITIONS.find((b) => b.id === badgeId) || null;
  },

  /* ---- Unlock logic ---- */

  unlock(badgeId) {
    // Already unlocked — skip
    if (this.isUnlocked(badgeId)) return;

    const badge = this.getBadgeDef(badgeId);
    if (!badge) return;

    this.unlocked.push({
      id: badgeId,
      unlockedAt: Date.now(),
    });
    this.save();

    // Show unlock animation (delay slightly so it doesn't overlap with milestone)
    setTimeout(() => {
      this.showUnlockAnimation(badge);
    }, badgeId.startsWith('streak_') ? 2500 : 200);

    // Check if all non-legend badges are unlocked
    this._checkLegend();
  },

  _checkLegend() {
    if (this.isUnlocked('legend')) return;

    const nonLegend = BADGE_DEFINITIONS.filter((b) => b.id !== 'legend');
    const allUnlocked = nonLegend.every((b) => this.isUnlocked(b.id));

    if (allUnlocked) {
      // Small delay to let current animation finish
      setTimeout(() => this.unlock('legend'), 4000);
    }
  },

  /* ---- Session checks ---- */

  /**
   * Called after each session completes.
   * @param {string} type — "focus" or "break"
   * @param {number} durationMinutes — session duration
   */
  checkSession(type, durationMinutes) {
    if (type !== 'focus') return;

    // first_focus — first ever focus session
    if (!this.isUnlocked('first_focus')) {
      this.unlock('first_focus');
    }

    // deep_focus — 90+ minute session
    if (!this.isUnlocked('deep_focus') && durationMinutes >= 90) {
      this.unlock('deep_focus');
    }

    // early_bird — focus completed before 7:00 AM
    const now = new Date();
    if (!this.isUnlocked('early_bird') && now.getHours() < 7) {
      this.unlock('early_bird');
    }

    // night_owl — focus completed after 10:00 PM
    if (!this.isUnlocked('night_owl') && now.getHours() >= 22) {
      this.unlock('night_owl');
    }

    // focus_100 — 100 total focus sessions
    if (!this.isUnlocked('focus_100')) {
      const totalFocus = this._countFocusSessions();
      if (totalFocus >= 100) {
        this.unlock('focus_100');
      }
    }

    // speed_demon — 5 focus sessions in one day
    if (!this.isUnlocked('speed_demon')) {
      const todayCount = this._countTodayFocusSessions();
      if (todayCount >= 5) {
        this.unlock('speed_demon');
      }
    }

    // goal_crusher — daily goal achieved 10 times
    if (!this.isUnlocked('goal_crusher')) {
      const goalDays = this._countGoalAchievedDays();
      if (goalDays >= 10) {
        this.unlock('goal_crusher');
      }
    }
  },

  /**
   * Called when a task is marked as completed.
   */
  checkTaskCompletion() {
    if (!this.isUnlocked('task_master_50')) {
      const completedCount = this._countCompletedTasks();
      if (completedCount >= 50) {
        this.unlock('task_master_50');
      }
    }
  },

  /* ---- Private data helpers ---- */

  _countFocusSessions() {
    if (typeof sessions !== 'undefined' && Array.isArray(sessions)) {
      return sessions.filter((s) => s.type === 'focus').length;
    }
    return 0;
  },

  _countTodayFocusSessions() {
    if (typeof sessions !== 'undefined' && Array.isArray(sessions)) {
      const today = this._formatDateKey(new Date());
      return sessions.filter((s) => {
        return s.type === 'focus' && this._formatDateKey(new Date(s.completedAt)) === today;
      }).length;
    }
    return 0;
  },

  _countGoalAchievedDays() {
    if (typeof sessions === 'undefined' || !Array.isArray(sessions)) return 0;
    if (typeof settings === 'undefined') return 0;

    const goal = settings.dailyGoal || 4;

    // Count sessions per day
    const dayCounts = {};
    sessions.forEach((s) => {
      if (s.type === 'focus') {
        const key = this._formatDateKey(new Date(s.completedAt));
        dayCounts[key] = (dayCounts[key] || 0) + 1;
      }
    });

    // Count days where goal was met
    let goalDays = 0;
    Object.values(dayCounts).forEach((count) => {
      if (count >= goal) goalDays++;
    });
    return goalDays;
  },

  _countCompletedTasks() {
    if (typeof tasks !== 'undefined' && Array.isArray(tasks)) {
      return tasks.filter((t) => t.done).length;
    }
    return 0;
  },

  _formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /* ---- Unlock animation ---- */

  showUnlockAnimation(badge) {
    // Remove any existing unlock overlay
    const existing = document.querySelector('.achievement-unlock');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'achievement-unlock';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', `Badge unlocked: ${badge.name}`);

    // Confetti particles
    const confetti = document.createElement('div');
    confetti.className = 'achievement-unlock__confetti';
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('span');
      particle.className = 'achievement-unlock__particle';
      particle.style.setProperty('--x', `${Math.random() * 100}%`);
      particle.style.setProperty('--delay', `${Math.random() * 0.5}s`);
      particle.style.setProperty('--duration', `${1.2 + Math.random() * 1.8}s`);
      particle.style.setProperty('--rotation', `${Math.random() * 720 - 360}deg`);
      particle.style.setProperty('--color', this._randomConfettiColor());
      confetti.appendChild(particle);
    }

    const card = document.createElement('div');
    card.className = 'achievement-unlock__card';

    const headerEl = document.createElement('div');
    headerEl.className = 'achievement-unlock__header';
    headerEl.textContent = 'Badge Mo Khoa!';

    const iconEl = document.createElement('div');
    iconEl.className = 'achievement-unlock__icon';
    iconEl.textContent = badge.icon;

    const nameEl = document.createElement('div');
    nameEl.className = 'achievement-unlock__name';
    nameEl.textContent = badge.name;

    const descEl = document.createElement('div');
    descEl.className = 'achievement-unlock__desc';
    descEl.textContent = badge.desc;

    card.appendChild(headerEl);
    card.appendChild(iconEl);
    card.appendChild(nameEl);
    card.appendChild(descEl);

    overlay.appendChild(confetti);
    overlay.appendChild(card);

    // Click to dismiss
    overlay.addEventListener('click', () => {
      overlay.classList.add('achievement-unlock--leaving');
      setTimeout(() => overlay.remove(), 400);
    });

    document.body.appendChild(overlay);

    // Show toast as well
    if (typeof showToast === 'function') {
      showToast(`${badge.icon} ${badge.name} — ${badge.desc}`, 'success', 4000);
    }

    // Auto-dismiss after 3.5 seconds
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.classList.add('achievement-unlock--leaving');
        setTimeout(() => {
          if (overlay.parentNode) overlay.remove();
        }, 400);
      }
    }, 3500);
  },

  _randomConfettiColor() {
    const colors = [
      '#d4b872', '#5a9e76', '#e8c547', '#ff7043',
      '#42a5f5', '#ab47bc', '#ef5350', '#66bb6a',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  /* ---- Badge grid rendering ---- */

  /**
   * Renders all badges in a grid layout.
   * @param {HTMLElement} container — element to render into
   */
  renderBadgeGrid(container) {
    if (!container) return;

    container.innerHTML = '';
    container.className = 'badge-grid-wrapper';

    // Header with progress
    const header = document.createElement('div');
    header.className = 'badge-grid__header';

    const titleEl = document.createElement('h3');
    titleEl.className = 'badge-grid__title';
    titleEl.textContent = 'Thanh tuu';

    const progressEl = document.createElement('span');
    progressEl.className = 'badge-grid__progress';
    progressEl.textContent = `${this.unlocked.length} / ${BADGE_DEFINITIONS.length}`;

    header.appendChild(titleEl);
    header.appendChild(progressEl);
    container.appendChild(header);

    // Overall progress bar
    const overallBar = document.createElement('div');
    overallBar.className = 'badge-grid__overall-bar';
    const overallFill = document.createElement('div');
    overallFill.className = 'badge-grid__overall-fill';
    overallFill.style.width = `${(this.unlocked.length / BADGE_DEFINITIONS.length) * 100}%`;
    overallBar.appendChild(overallFill);
    container.appendChild(overallBar);

    // Grid
    const grid = document.createElement('div');
    grid.className = 'badge-grid';

    BADGE_DEFINITIONS.forEach((badge) => {
      const unlocked = this.isUnlocked(badge.id);
      const unlockData = unlocked
        ? this.unlocked.find((u) => u.id === badge.id)
        : null;

      const item = document.createElement('div');
      item.className = 'badge-item' + (unlocked ? ' badge-item--unlocked' : ' badge-item--locked');

      const iconEl = document.createElement('div');
      iconEl.className = 'badge-item__icon';
      iconEl.textContent = badge.icon;

      const nameEl = document.createElement('div');
      nameEl.className = 'badge-item__name';
      nameEl.textContent = unlocked ? badge.name : '???';

      const descEl = document.createElement('div');
      descEl.className = 'badge-item__desc';
      descEl.textContent = unlocked ? badge.desc : this._getLockedHint(badge);

      item.appendChild(iconEl);
      item.appendChild(nameEl);
      item.appendChild(descEl);

      // Show unlock date for unlocked badges
      if (unlocked && unlockData) {
        const dateEl = document.createElement('div');
        dateEl.className = 'badge-item__date';
        dateEl.textContent = this._formatUnlockDate(unlockData.unlockedAt);
        item.appendChild(dateEl);
      }

      // Show progress for trackable badges (only if locked)
      if (!unlocked) {
        const progressInfo = this._getBadgeProgress(badge.id);
        if (progressInfo) {
          const progBar = document.createElement('div');
          progBar.className = 'badge-item__progress';

          const progFill = document.createElement('div');
          progFill.className = 'badge-item__progress-fill';
          progFill.style.width = `${Math.min(progressInfo.percent, 100)}%`;

          const progLabel = document.createElement('span');
          progLabel.className = 'badge-item__progress-label';
          progLabel.textContent = `${progressInfo.current}/${progressInfo.target}`;

          progBar.appendChild(progFill);
          item.appendChild(progBar);
          item.appendChild(progLabel);
        }
      }

      grid.appendChild(item);
    });

    container.appendChild(grid);
  },

  _getLockedHint(badge) {
    const hints = {
      milestone: 'Dat cot moc de mo khoa',
      streak: 'Duy tri chuoi hoat dong',
      focus: 'Tap trung de mo khoa',
      time: 'Thoi diem dac biet',
      tasks: 'Hoan thanh nhieu tasks',
      special: 'Mo khoa tat ca badges khac',
    };
    return hints[badge.category] || 'Tiep tuc co gang!';
  },

  _formatUnlockDate(timestamp) {
    const d = new Date(timestamp);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  },

  _getBadgeProgress(badgeId) {
    switch (badgeId) {
      case 'task_master_50':
        return { current: this._countCompletedTasks(), target: 50, percent: (this._countCompletedTasks() / 50) * 100 };
      case 'focus_100':
        return { current: this._countFocusSessions(), target: 100, percent: (this._countFocusSessions() / 100) * 100 };
      case 'streak_7': {
        const streak = typeof StreakModule !== 'undefined' ? StreakModule.data.currentStreak : 0;
        return { current: streak, target: 7, percent: (streak / 7) * 100 };
      }
      case 'streak_30': {
        const streak = typeof StreakModule !== 'undefined' ? StreakModule.data.currentStreak : 0;
        return { current: streak, target: 30, percent: (streak / 30) * 100 };
      }
      case 'streak_100': {
        const streak = typeof StreakModule !== 'undefined' ? StreakModule.data.currentStreak : 0;
        return { current: streak, target: 100, percent: (streak / 100) * 100 };
      }
      case 'goal_crusher': {
        const days = this._countGoalAchievedDays();
        return { current: days, target: 10, percent: (days / 10) * 100 };
      }
      default:
        return null;
    }
  },

  /* ---- Stats summary ---- */

  getStats() {
    return {
      totalUnlocked: this.unlocked.length,
      totalBadges: BADGE_DEFINITIONS.length,
      recentUnlock: this.unlocked.length > 0 ? this.unlocked[this.unlocked.length - 1] : null,
    };
  },
};

// Auto-load on script load
AchievementModule.load();
