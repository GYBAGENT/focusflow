/* ============================================================
   SHARING MODULE — FocusFlow
   Generates beautiful shareable focus cards using Canvas API.
   Global: SharingModule
   ============================================================ */

const SharingModule = {

  // --------------- Data helpers ---------------

  /**
   * Gather today's focus statistics from app globals.
   * Safely checks for optional modules (StreakModule, AchievementModule).
   */
  getTodayStats() {
    const today = new Date().toDateString();
    const allSessions = typeof sessions !== 'undefined' ? sessions : [];
    const todaySessions = allSessions.filter(
      s => s.type === 'focus' && new Date(s.completedAt).toDateString() === today
    );

    const totalMinutes = todaySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const sessionCount = todaySessions.length;
    const completedTasks = (typeof tasks !== 'undefined' ? tasks : []).filter(t => t.done).length;

    let streak = 0;
    if (typeof StreakModule !== 'undefined' && typeof StreakModule.getStreakData === 'function') {
      try { streak = StreakModule.getStreakData().currentStreak || 0; } catch (_) { /* silent */ }
    }

    let badges = 0;
    if (typeof AchievementModule !== 'undefined' && typeof AchievementModule.getStats === 'function') {
      try { badges = AchievementModule.getStats().totalUnlocked || 0; } catch (_) { /* silent */ }
    }

    return { totalMinutes, sessionCount, completedTasks, streak, badges };
  },

  // --------------- Canvas card generation ---------------

  /**
   * Create a 1200x630 share-card canvas with today's stats.
   * Returns the HTMLCanvasElement.
   */
  generateCard(stats) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');

    // --- Background gradient ---
    const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, '#0a0f0d');
    gradient.addColorStop(0.5, '#121a16');
    gradient.addColorStop(1, '#0d1210');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 630);

    // --- Subtle grid pattern ---
    ctx.strokeStyle = 'rgba(212, 184, 114, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1200; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 630);
      ctx.stroke();
    }
    for (let y = 0; y < 630; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1200, y);
      ctx.stroke();
    }

    // --- Decorative accent glow ---
    const glow = ctx.createRadialGradient(200, 150, 0, 200, 150, 400);
    glow.addColorStop(0, 'rgba(212, 184, 114, 0.06)');
    glow.addColorStop(1, 'rgba(212, 184, 114, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 600, 400);

    // --- Header: FocusFlow branding ---
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#d4b872';
    ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('\ud83c\udfaf FocusFlow', 60, 70);

    // Divider
    ctx.strokeStyle = 'rgba(212, 184, 114, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 95);
    ctx.lineTo(1140, 95);
    ctx.stroke();

    // --- Main stat: focus time (large) ---
    ctx.fillStyle = '#f2ede4';
    ctx.font = 'bold 120px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const hours = Math.floor(stats.totalMinutes / 60);
    const mins = stats.totalMinutes % 60;
    const timeText = hours > 0 ? `${hours}h ${mins}m` : `${stats.totalMinutes} ph\u00fat`;
    ctx.fillText(timeText, 60, 260);

    ctx.fillStyle = '#7a756c';
    ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('th\u1eddi gian t\u1eadp trung h\u00f4m nay', 60, 300);

    // --- Stat cards row ---
    const statsY = 400;
    const statItems = [
      { icon: '\u26a1', value: String(stats.sessionCount), label: 'phi\u00ean' },
      { icon: '\u2705', value: String(stats.completedTasks), label: 'tasks' },
      { icon: '\ud83d\udd25', value: String(stats.streak), label: 'ng\u00e0y streak' },
      { icon: '\ud83c\udfc5', value: String(stats.badges), label: 'badges' },
    ];

    const statWidth = 250;
    statItems.forEach((item, i) => {
      const x = 60 + i * statWidth;

      // Card background
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      this._roundRect(ctx, x, statsY - 30, 220, 100, 12);
      ctx.fill();

      // Value
      ctx.fillStyle = '#f2ede4';
      ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`${item.icon} ${item.value}`, x + 20, statsY + 15);

      // Label
      ctx.fillStyle = '#7a756c';
      ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(item.label, x + 20, statsY + 50);
    });

    // --- Footer: date + URL ---
    ctx.fillStyle = '#7a756c';
    ctx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    const dateStr = new Date().toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    ctx.fillText(dateStr, 60, 580);

    ctx.fillStyle = 'rgba(212, 184, 114, 0.6)';
    ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('gybagent.github.io/focusflow', 1140, 580);
    ctx.textAlign = 'left';

    return canvas;
  },

  /**
   * Polyfill-safe rounded rectangle helper.
   * Draws the path; caller should call fill() or stroke().
   */
  _roundRect(ctx, x, y, w, h, r) {
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
  },

  // --------------- Share modal ---------------

  /** Currently active canvas (set by showShareModal). */
  _activeCanvas: null,

  /**
   * Show the share modal with a generated card preview.
   * Creates DOM elements, styles them, appends to body.
   */
  showShareModal() {
    // Remove any existing modal
    this._removeModal();

    const stats = this.getTodayStats();
    const canvas = this.generateCard(stats);
    this._activeCanvas = canvas;

    // Build modal DOM
    const modal = document.createElement('div');
    modal.className = 'share-modal';
    modal.id = 'share-modal';

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'share-modal__backdrop';
    backdrop.addEventListener('click', () => this._closeModal());
    modal.appendChild(backdrop);

    // Content
    const content = document.createElement('div');
    content.className = 'share-modal__content';

    // Header
    const header = document.createElement('div');
    header.className = 'share-modal__header';

    const title = document.createElement('h3');
    title.className = 'share-modal__title';
    title.textContent = '\ud83d\udcf4 Chia s\u1ebb k\u1ebft qu\u1ea3';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'share-modal__close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', '\u0110\u00f3ng');
    closeBtn.addEventListener('click', () => this._closeModal());
    header.appendChild(closeBtn);

    content.appendChild(header);

    // Card preview
    const cardWrap = document.createElement('div');
    cardWrap.className = 'share-card';
    cardWrap.appendChild(canvas);
    content.appendChild(cardWrap);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'share-modal__actions';

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'share-modal__btn share-modal__btn--primary';
    downloadBtn.innerHTML = '\ud83d\udce5 T\u1ea3i \u1ea3nh';
    downloadBtn.addEventListener('click', () => this.downloadCard(canvas));
    actions.appendChild(downloadBtn);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'share-modal__btn';
    copyBtn.innerHTML = '\ud83d\udccb Sao ch\u00e9p';
    copyBtn.addEventListener('click', () => this.copyToClipboard(canvas));
    actions.appendChild(copyBtn);

    content.appendChild(actions);
    modal.appendChild(content);

    // Keyboard: Escape to close
    this._escHandler = (e) => {
      if (e.key === 'Escape') this._closeModal();
    };
    document.addEventListener('keydown', this._escHandler);

    document.body.appendChild(modal);
  },

  /**
   * Close the share modal with exit animation.
   */
  _closeModal() {
    const modal = document.getElementById('share-modal');
    if (!modal) return;

    modal.classList.add('is-closing');

    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }

    setTimeout(() => {
      modal.remove();
      this._activeCanvas = null;
    }, 200);
  },

  /**
   * Remove any existing modal instantly (no animation).
   */
  _removeModal() {
    const existing = document.getElementById('share-modal');
    if (existing) existing.remove();
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }
    this._activeCanvas = null;
  },

  // --------------- Download / Copy ---------------

  /**
   * Download the canvas as a PNG image.
   */
  downloadCard(canvas) {
    const link = document.createElement('a');
    link.download = `focusflow-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    if (typeof showToast === 'function') {
      showToast('\u0110\u00e3 t\u1ea3i \u1ea3nh xu\u1ed1ng!', 'success');
    }
  },

  /**
   * Copy the canvas to clipboard as a PNG blob.
   * Falls back to download prompt if clipboard API is unavailable.
   */
  async copyToClipboard(canvas) {
    try {
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('toBlob failed'));
        }, 'image/png');
      });
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      if (typeof showToast === 'function') {
        showToast('\u0110\u00e3 sao ch\u00e9p \u1ea3nh!', 'success');
      }
    } catch (e) {
      if (typeof showToast === 'function') {
        showToast('Kh\u00f4ng th\u1ec3 sao ch\u00e9p. H\u00e3y t\u1ea3i \u1ea3nh xu\u1ed1ng.', 'warning');
      }
    }
  },

  // --------------- Share button factory ---------------

  /**
   * Create a share button element that opens the modal.
   * Can be placed anywhere in the DOM.
   */
  createShareButton() {
    const btn = document.createElement('button');
    btn.className = 'share-btn';
    btn.innerHTML = '\ud83d\udce4 Chia s\u1ebb k\u1ebft qu\u1ea3';
    btn.addEventListener('click', () => this.showShareModal());
    return btn;
  },

  // --------------- Init ---------------

  /**
   * Initialize the sharing module.
   * Attempts to inject a share button into the analytics view.
   */
  init() {
    const inject = () => {
      const statsView = document.getElementById('view-stats');
      if (!statsView) return;

      // Avoid duplicate injection
      if (statsView.querySelector('.share-section')) return;

      // Create share section
      const section = document.createElement('div');
      section.className = 'share-section';

      const text = document.createElement('span');
      text.className = 'share-section__text';
      text.textContent = 'Chia s\u1ebb k\u1ebft qu\u1ea3 h\u00f4m nay c\u1ee7a b\u1ea1n';
      section.appendChild(text);

      section.appendChild(this.createShareButton());

      statsView.appendChild(section);
    };

    // Try immediately, or wait for DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', inject);
    } else {
      inject();
    }
  },
};

// Auto-init when script loads
(function() {
  function autoInit() {
    if (!document.querySelector('.share-section')) {
      SharingModule.init();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    setTimeout(autoInit, 50);
  }
})();
