/* ============================================================
   REFLECTION MODULE — FocusFlow
   Post-session mood logging and reflection history.
   Global: ReflectionModule
   ============================================================ */

const REFLECTIONS_KEY = 'focusflow_reflections';

const MOOD_OPTIONS = [
  { id: 'productive', label: 'Hi\u1ec7u qu\u1ea3', icon: '\ud83d\udcaa' },
  { id: 'energized', label: 'Tr\u00e0n n\u0103ng l\u01b0\u1ee3ng', icon: '\u26a1' },
  { id: 'calm', label: 'B\u00ecnh t\u0129nh', icon: '\ud83d\ude0c' },
  { id: 'distracted', label: 'Xao nh\u00e3ng', icon: '\ud83d\ude35' },
  { id: 'tired', label: 'M\u1ec7t m\u1ecfi', icon: '\ud83d\ude34' },
];

const ReflectionModule = {

  /** @type {Array<{sessionId: string, mood: string, note: string, timestamp: string}>} */
  reflections: [],

  // --------------- Persistence ---------------

  /** Load reflections from localStorage. */
  load() {
    try {
      const raw = localStorage.getItem(REFLECTIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.reflections = parsed;
        }
      }
    } catch (_) {
      this.reflections = [];
    }
  },

  /** Save reflections to localStorage. */
  save() {
    try {
      localStorage.setItem(REFLECTIONS_KEY, JSON.stringify(this.reflections));
    } catch (_) {
      /* quota exceeded — silent */
    }
  },

  // --------------- Reflection prompt modal ---------------

  /** Escape key handler reference. */
  _escHandler: null,

  /**
   * Show the reflection prompt after a focus session completes.
   * Only triggers for focus sessions (not breaks).
   * @param {string} sessionId  ID of the completed session
   * @param {string} sessionType  "focus" or "break"
   */
  showPrompt(sessionId, sessionType) {
    if (sessionType !== 'focus') return;

    // Show after a short delay so the completion modal can close first
    setTimeout(() => {
      this._renderPromptModal(sessionId);
    }, 500);
  },

  /**
   * Build and show the reflection prompt modal.
   * @param {string} sessionId
   */
  _renderPromptModal(sessionId) {
    // Remove any existing reflection modal
    this._removeModal();

    let selectedMood = null;

    // --- Modal shell ---
    const modal = document.createElement('div');
    modal.className = 'reflection-modal';
    modal.id = 'reflection-modal';

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'reflection-modal__backdrop';
    backdrop.addEventListener('click', () => this._closeModal());
    modal.appendChild(backdrop);

    // Content
    const content = document.createElement('div');
    content.className = 'reflection-modal__content';

    // Icon
    const icon = document.createElement('span');
    icon.className = 'reflection-modal__icon';
    icon.textContent = '\ud83d\udcdd';
    content.appendChild(icon);

    // Title
    const title = document.createElement('h3');
    title.className = 'reflection-modal__title';
    title.textContent = 'Phi\u00ean focus v\u1eeba k\u1ebft th\u00fac';
    content.appendChild(title);

    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.className = 'reflection-modal__subtitle';
    subtitle.textContent = 'B\u1ea1n c\u1ea3m th\u1ea5y phi\u00ean n\u00e0y th\u1ebf n\u00e0o?';
    content.appendChild(subtitle);

    // --- Mood buttons ---
    const moodGrid = document.createElement('div');
    moodGrid.className = 'mood-grid';

    MOOD_OPTIONS.forEach((mood) => {
      const btn = document.createElement('button');
      btn.className = 'mood-btn';
      btn.dataset.mood = mood.id;

      const moodIcon = document.createElement('span');
      moodIcon.className = 'mood-btn__icon';
      moodIcon.textContent = mood.icon;
      btn.appendChild(moodIcon);

      const moodLabel = document.createElement('span');
      moodLabel.textContent = mood.label;
      btn.appendChild(moodLabel);

      btn.addEventListener('click', () => {
        // Deselect all
        moodGrid.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('is-selected'));
        // Select this one
        btn.classList.add('is-selected');
        selectedMood = mood.id;
        // Enable save button
        saveBtn.disabled = false;
      });

      moodGrid.appendChild(btn);
    });

    content.appendChild(moodGrid);

    // --- Note textarea ---
    const textarea = document.createElement('textarea');
    textarea.className = 'reflection-modal__textarea';
    textarea.placeholder = 'Ghi ch\u00fa nhanh... (tu\u1ef3 ch\u1ecdn)';
    textarea.rows = 3;
    content.appendChild(textarea);

    // --- Action buttons ---
    const actions = document.createElement('div');
    actions.className = 'reflection-modal__actions';

    const skipBtn = document.createElement('button');
    skipBtn.className = 'reflection-modal__btn reflection-modal__btn--ghost';
    skipBtn.textContent = 'B\u1ecf qua';
    skipBtn.addEventListener('click', () => this._closeModal());
    actions.appendChild(skipBtn);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'reflection-modal__btn reflection-modal__btn--primary';
    saveBtn.textContent = 'L\u01b0u';
    saveBtn.disabled = true;
    saveBtn.addEventListener('click', () => {
      if (!selectedMood) return;

      const entry = {
        sessionId: sessionId || null,
        mood: selectedMood,
        note: textarea.value.trim(),
        timestamp: new Date().toISOString(),
      };

      this.reflections.push(entry);
      this.save();

      if (typeof showToast === 'function') {
        const moodData = MOOD_OPTIONS.find(m => m.id === selectedMood);
        showToast(`${moodData ? moodData.icon : ''} \u0110\u00e3 l\u01b0u nh\u1eadn x\u00e9t!`, 'success');
      }

      this._closeModal();
    });
    actions.appendChild(saveBtn);

    content.appendChild(actions);
    modal.appendChild(content);

    // Keyboard: Escape to close
    this._escHandler = (e) => {
      if (e.key === 'Escape') this._closeModal();
    };
    document.addEventListener('keydown', this._escHandler);

    document.body.appendChild(modal);

    // Focus the first mood button for keyboard accessibility
    const firstMoodBtn = moodGrid.querySelector('.mood-btn');
    if (firstMoodBtn) firstMoodBtn.focus();
  },

  /**
   * Close the reflection modal with exit animation.
   */
  _closeModal() {
    const modal = document.getElementById('reflection-modal');
    if (!modal) return;

    modal.classList.add('is-closing');

    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }

    setTimeout(() => {
      modal.remove();
    }, 200);
  },

  /**
   * Remove any existing reflection modal instantly (no animation).
   */
  _removeModal() {
    const existing = document.getElementById('reflection-modal');
    if (existing) existing.remove();
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }
  },

  // --------------- Data queries ---------------

  /**
   * Get the most recent reflections.
   * @param {number} [limit=10]  Maximum entries to return
   * @returns {Array}
   */
  getReflections(limit) {
    const n = limit && limit > 0 ? limit : 10;
    return this.reflections.slice(-n);
  },

  /**
   * Count each mood type for analytics.
   * @returns {Object<string, number>}  e.g. { productive: 5, tired: 2, ... }
   */
  getMoodStats() {
    const counts = {};
    this.reflections.forEach((r) => {
      if (r.mood) {
        counts[r.mood] = (counts[r.mood] || 0) + 1;
      }
    });
    return counts;
  },

  /**
   * Get mood data enriched with label and icon.
   * @returns {Array<{id: string, label: string, icon: string, count: number}>}
   */
  getMoodStatsDetailed() {
    const counts = this.getMoodStats();
    return MOOD_OPTIONS.map((m) => ({
      id: m.id,
      label: m.label,
      icon: m.icon,
      count: counts[m.id] || 0,
    }));
  },

  // --------------- Reflection history rendering ---------------

  /**
   * Render recent reflections as compact cards inside a container.
   * Clears the container first.
   * @param {HTMLElement} container  DOM element to render into
   * @param {number} [limit=5]  How many entries to show
   */
  renderReflectionHistory(container, limit) {
    if (!container) return;
    const n = limit && limit > 0 ? limit : 5;

    // Clear container
    container.innerHTML = '';

    // Title
    const titleEl = document.createElement('div');
    titleEl.className = 'reflection-history__title';
    titleEl.innerHTML = '\ud83d\udcdd Nh\u1eadn x\u00e9t g\u1ea7n \u0111\u00e2y';
    container.appendChild(titleEl);

    const recent = this.getReflections(n);

    if (recent.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'reflection-history__empty';
      empty.textContent = 'Ch\u01b0a c\u00f3 nh\u1eadn x\u00e9t n\u00e0o. Ho\u00e0n th\u00e0nh m\u1ed9t phi\u00ean focus \u0111\u1ec3 b\u1eaft \u0111\u1ea7u!';
      container.appendChild(empty);
      return;
    }

    const historyWrap = document.createElement('div');
    historyWrap.className = 'reflection-history';

    // Show most recent first
    const sorted = [...recent].reverse();

    sorted.forEach((entry) => {
      const card = document.createElement('div');
      card.className = 'reflection-card';

      // Mood badge
      const moodBadge = document.createElement('div');
      moodBadge.className = 'reflection-card__mood';
      const moodData = MOOD_OPTIONS.find(m => m.id === entry.mood);
      moodBadge.textContent = moodData ? moodData.icon : '\ud83d\udcad';
      card.appendChild(moodBadge);

      // Body
      const body = document.createElement('div');
      body.className = 'reflection-card__body';

      // Meta row: date + mood label
      const meta = document.createElement('div');
      meta.className = 'reflection-card__meta';

      const dateEl = document.createElement('span');
      dateEl.className = 'reflection-card__date';
      dateEl.textContent = this._formatDate(entry.timestamp);
      meta.appendChild(dateEl);

      if (moodData) {
        const labelEl = document.createElement('span');
        labelEl.className = 'reflection-card__mood-label';
        labelEl.textContent = moodData.label;
        meta.appendChild(labelEl);
      }

      body.appendChild(meta);

      // Note text (if any)
      if (entry.note) {
        const noteEl = document.createElement('p');
        noteEl.className = 'reflection-card__note';
        noteEl.textContent = entry.note;
        body.appendChild(noteEl);
      }

      card.appendChild(body);
      historyWrap.appendChild(card);
    });

    container.appendChild(historyWrap);
  },

  /**
   * Format a timestamp into a readable Vietnamese date string.
   * @param {string} isoString
   * @returns {string}
   */
  _formatDate(isoString) {
    try {
      const d = new Date(isoString);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const entryDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const diffDays = Math.round((today - entryDay) / (1000 * 60 * 60 * 24));

      const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

      if (diffDays === 0) return `H\u00f4m nay, ${timeStr}`;
      if (diffDays === 1) return `H\u00f4m qua, ${timeStr}`;
      if (diffDays < 7) return `${diffDays} ng\u00e0y tr\u01b0\u1edbc, ${timeStr}`;

      return d.toLocaleDateString('vi-VN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }) + `, ${timeStr}`;
    } catch (_) {
      return '';
    }
  },

  // --------------- Init ---------------

  /**
   * Initialize the reflection module.
   * Loads persisted data. Injects reflection history into analytics view if possible.
   */
  init() {
    this.load();

    const inject = () => {
      const statsView = document.getElementById('view-stats');
      if (!statsView) return;

      // Avoid duplicate injection
      if (statsView.querySelector('.reflection-history-section')) return;

      // Create analytics section wrapper
      const section = document.createElement('div');
      section.className = 'analytics-section reflection-history-section';

      const sectionHeader = document.createElement('div');
      sectionHeader.className = 'analytics-section__header';
      sectionHeader.innerHTML = '<span class="analytics-section__icon">\ud83d\udcdd</span><h3>Nh\u1eadn x\u00e9t phi\u00ean</h3>';
      section.appendChild(sectionHeader);

      const historyContainer = document.createElement('div');
      historyContainer.id = 'reflection-history-container';
      section.appendChild(historyContainer);

      statsView.appendChild(section);

      // Render initial content
      this.renderReflectionHistory(historyContainer, 5);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', inject);
    } else {
      inject();
    }
  },
};
