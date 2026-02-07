/**
 * FocusFlow — Ambient Sounds + Fullscreen Focus System
 *
 * SoundModule: Procedural ambient sound generation via Web Audio API
 * FullscreenModule: Immersive fullscreen focus overlay
 *
 * Depends on globals from app.js:
 *   - isRunning (boolean)
 *   - showToast(message, type, duration)
 *   - Timer view has id="view-timer"
 *   - #timer-display, #timer-context-task, #start-btn, #skip-btn
 */

/* ================================================================
   SOUND MODULE — Procedural Ambient Focus Sounds
   ================================================================ */

const SOUND_PREFS_KEY = 'focusflow_sound_prefs';

const AMBIENT_SOUNDS = [
  { id: 'rain',   name: 'M\u01B0a',        icon: '\uD83C\uDF27\uFE0F' },
  { id: 'cafe',   name: 'Qu\u00E1n Cafe',   icon: '\u2615' },
  { id: 'forest', name: 'R\u1EEBng',       icon: '\uD83C\uDF32' },
  { id: 'white',  name: 'White Noise',      icon: '\uD83D\uDCFB' },
  { id: 'fire',   name: 'L\u1EEDa Tr\u1EA1i', icon: '\uD83D\uDD25' },
];

const SoundModule = {
  audioCtx: null,
  masterGain: null,
  activeNodes: [],
  currentSound: null,
  volume: 0.3,
  isPlaying: false,
  _scheduledTimers: [],

  init() {
    this.loadPrefs();
    this.renderSoundBar();
  },

  ensureContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  },

  /* ---- RAIN: Brown noise through lowpass filter ---- */
  generateRain() {
    const ctx = this.audioCtx;
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 800;
    lowpass.Q.value = 0.5;

    // Add a gentle highpass to remove rumble
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 40;

    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(this.masterGain);
    source.start();

    return [source, lowpass, highpass];
  },

  /* ---- CAFE: Pink noise base + low murmur oscillation + distant clatter ---- */
  generateCafe() {
    const ctx = this.audioCtx;
    const sampleRate = ctx.sampleRate;
    const bufferSize = 2 * sampleRate;

    // --- Pink noise via Voss-McCartney approximation ---
    const pinkBuffer = ctx.createBuffer(2, bufferSize, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = pinkBuffer.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    }

    const pinkSource = ctx.createBufferSource();
    pinkSource.buffer = pinkBuffer;
    pinkSource.loop = true;

    // Bandpass to keep it in the "murmur" range
    const murmurFilter = ctx.createBiquadFilter();
    murmurFilter.type = 'bandpass';
    murmurFilter.frequency.value = 500;
    murmurFilter.Q.value = 0.4;

    const pinkGain = ctx.createGain();
    pinkGain.gain.value = 0.7;

    pinkSource.connect(murmurFilter);
    murmurFilter.connect(pinkGain);
    pinkGain.connect(this.masterGain);
    pinkSource.start();

    // --- Subtle low-frequency hum (like AC / room tone) ---
    const humOsc = ctx.createOscillator();
    humOsc.type = 'sine';
    humOsc.frequency.value = 85;

    const humGain = ctx.createGain();
    humGain.gain.value = 0.03;

    humOsc.connect(humGain);
    humGain.connect(this.masterGain);
    humOsc.start();

    // --- Occasional clinking / clatter using filtered noise bursts ---
    const clatterBuffer = ctx.createBuffer(1, sampleRate * 0.08, sampleRate);
    const clatterData = clatterBuffer.getChannelData(0);
    for (let i = 0; i < clatterData.length; i++) {
      clatterData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.015));
    }

    const scheduleClatter = () => {
      if (!this.isPlaying || this.currentSound !== 'cafe') return;

      const clatterSrc = ctx.createBufferSource();
      clatterSrc.buffer = clatterBuffer;

      const clatterBP = ctx.createBiquadFilter();
      clatterBP.type = 'bandpass';
      clatterBP.frequency.value = 2000 + Math.random() * 3000;
      clatterBP.Q.value = 2;

      const clatterGain = ctx.createGain();
      clatterGain.gain.value = 0.04 + Math.random() * 0.06;

      // Pan randomly left or right
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.random() * 2 - 1;

      clatterSrc.connect(clatterBP);
      clatterBP.connect(clatterGain);
      clatterGain.connect(panner);
      panner.connect(this.masterGain);
      clatterSrc.start();

      const nextDelay = 1500 + Math.random() * 5000;
      const timer = setTimeout(scheduleClatter, nextDelay);
      this._scheduledTimers.push(timer);
    };

    const initialTimer = setTimeout(scheduleClatter, 800 + Math.random() * 2000);
    this._scheduledTimers.push(initialTimer);

    return [pinkSource, murmurFilter, pinkGain, humOsc, humGain];
  },

  /* ---- FOREST: Pink noise base + bird-like chirps via bandpass bursts ---- */
  generateForest() {
    const ctx = this.audioCtx;
    const sampleRate = ctx.sampleRate;
    const bufferSize = 2 * sampleRate;

    // --- Gentle pink noise for wind / leaves rustling ---
    const windBuffer = ctx.createBuffer(2, bufferSize, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = windBuffer.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    }

    const windSource = ctx.createBufferSource();
    windSource.buffer = windBuffer;
    windSource.loop = true;

    const windLP = ctx.createBiquadFilter();
    windLP.type = 'lowpass';
    windLP.frequency.value = 1200;
    windLP.Q.value = 0.3;

    const windGain = ctx.createGain();
    windGain.gain.value = 0.45;

    windSource.connect(windLP);
    windLP.connect(windGain);
    windGain.connect(this.masterGain);
    windSource.start();

    // --- Bird chirps: short sine tones with frequency sweep ---
    const scheduleChirp = () => {
      if (!this.isPlaying || this.currentSound !== 'forest') return;

      const chirpCount = 1 + Math.floor(Math.random() * 4);
      let delay = 0;

      for (let c = 0; c < chirpCount; c++) {
        const chirpTimer = setTimeout(() => {
          if (!this.isPlaying || this.currentSound !== 'forest') return;

          const osc = ctx.createOscillator();
          osc.type = 'sine';
          const baseFreq = 2000 + Math.random() * 3000;
          osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(
            baseFreq * (0.8 + Math.random() * 0.6),
            ctx.currentTime + 0.06 + Math.random() * 0.08
          );

          const chirpGain = ctx.createGain();
          chirpGain.gain.setValueAtTime(0, ctx.currentTime);
          chirpGain.gain.linearRampToValueAtTime(0.03 + Math.random() * 0.04, ctx.currentTime + 0.01);
          chirpGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06 + Math.random() * 0.1);

          const chirpPan = ctx.createStereoPanner();
          chirpPan.pan.value = Math.random() * 1.6 - 0.8;

          osc.connect(chirpGain);
          chirpGain.connect(chirpPan);
          chirpPan.connect(this.masterGain);

          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.15);
        }, delay);

        this._scheduledTimers.push(chirpTimer);
        delay += 80 + Math.random() * 150;
      }

      const nextGroupDelay = 2000 + Math.random() * 6000;
      const groupTimer = setTimeout(scheduleChirp, nextGroupDelay);
      this._scheduledTimers.push(groupTimer);
    };

    const initialTimer = setTimeout(scheduleChirp, 500 + Math.random() * 1500);
    this._scheduledTimers.push(initialTimer);

    return [windSource, windLP, windGain];
  },

  /* ---- WHITE NOISE: Flat spectrum ---- */
  generateWhite() {
    const ctx = this.audioCtx;
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // White noise is harsh at full volume, reduce and soften slightly
    const gain = ctx.createGain();
    gain.gain.value = 0.35;

    // Gentle lowpass to tame extreme highs
    const softLP = ctx.createBiquadFilter();
    softLP.type = 'lowpass';
    softLP.frequency.value = 14000;
    softLP.Q.value = 0.3;

    source.connect(softLP);
    softLP.connect(gain);
    gain.connect(this.masterGain);
    source.start();

    return [source, softLP, gain];
  },

  /* ---- FIRE: Brown noise base + random crackling bursts ---- */
  generateFire() {
    const ctx = this.audioCtx;
    const sampleRate = ctx.sampleRate;
    const bufferSize = 2 * sampleRate;

    // --- Brown noise base (warm, low rumble) ---
    const brownBuffer = ctx.createBuffer(2, bufferSize, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = brownBuffer.getChannelData(ch);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }
    }

    const brownSource = ctx.createBufferSource();
    brownSource.buffer = brownBuffer;
    brownSource.loop = true;

    const fireLowpass = ctx.createBiquadFilter();
    fireLowpass.type = 'lowpass';
    fireLowpass.frequency.value = 400;
    fireLowpass.Q.value = 0.5;

    const brownGain = ctx.createGain();
    brownGain.gain.value = 0.5;

    brownSource.connect(fireLowpass);
    fireLowpass.connect(brownGain);
    brownGain.connect(this.masterGain);
    brownSource.start();

    // --- Crackle: Short noise bursts with fast envelope decay ---
    const crackleLen = Math.floor(sampleRate * 0.03);
    const crackleBuffer = ctx.createBuffer(1, crackleLen, sampleRate);
    const crackleData = crackleBuffer.getChannelData(0);
    for (let i = 0; i < crackleLen; i++) {
      crackleData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.005));
    }

    const scheduleCrackle = () => {
      if (!this.isPlaying || this.currentSound !== 'fire') return;

      // Fire a small burst of 1-3 crackles close together
      const burstCount = 1 + Math.floor(Math.random() * 3);
      let burstDelay = 0;

      for (let b = 0; b < burstCount; b++) {
        const crackTimer = setTimeout(() => {
          if (!this.isPlaying || this.currentSound !== 'fire') return;

          const crackSrc = ctx.createBufferSource();
          crackSrc.buffer = crackleBuffer;

          const crackBP = ctx.createBiquadFilter();
          crackBP.type = 'highpass';
          crackBP.frequency.value = 800 + Math.random() * 2000;

          const crackGain = ctx.createGain();
          crackGain.gain.value = 0.08 + Math.random() * 0.15;

          const crackPan = ctx.createStereoPanner();
          crackPan.pan.value = Math.random() * 1.2 - 0.6;

          crackSrc.connect(crackBP);
          crackBP.connect(crackGain);
          crackGain.connect(crackPan);
          crackPan.connect(this.masterGain);
          crackSrc.start();
        }, burstDelay);

        this._scheduledTimers.push(crackTimer);
        burstDelay += 30 + Math.random() * 80;
      }

      const nextDelay = 200 + Math.random() * 800;
      const nextTimer = setTimeout(scheduleCrackle, nextDelay);
      this._scheduledTimers.push(nextTimer);
    };

    const initialTimer = setTimeout(scheduleCrackle, 300);
    this._scheduledTimers.push(initialTimer);

    return [brownSource, fireLowpass, brownGain];
  },

  /* ---- Playback controls ---- */
  play(soundId) {
    this.stop();
    this.ensureContext();

    const generators = {
      rain:   () => this.generateRain(),
      cafe:   () => this.generateCafe(),
      forest: () => this.generateForest(),
      white:  () => this.generateWhite(),
      fire:   () => this.generateFire(),
    };

    if (generators[soundId]) {
      this.activeNodes = generators[soundId]();
      this.currentSound = soundId;
      this.isPlaying = true;
      this.updateUI();
      this.savePrefs();
    }
  },

  stop() {
    // Clear all scheduled timers (for crackle, chirps, clatter)
    this._scheduledTimers.forEach(t => clearTimeout(t));
    this._scheduledTimers = [];

    this.activeNodes.forEach(node => {
      try { node.disconnect(); } catch (e) { /* ignore */ }
      try { if (node.stop) node.stop(); } catch (e) { /* ignore */ }
    });
    this.activeNodes = [];
    this.currentSound = null;
    this.isPlaying = false;
    this.updateUI();
  },

  toggle(soundId) {
    if (this.isPlaying && this.currentSound === soundId) {
      this.stop();
      this.savePrefs();
    } else {
      this.play(soundId);
    }
  },

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.audioCtx.currentTime, 0.05);
    }
    this.savePrefs();
    this.updateVolumeLabel();
  },

  loadPrefs() {
    try {
      const raw = localStorage.getItem(SOUND_PREFS_KEY);
      if (raw) {
        const prefs = JSON.parse(raw);
        if (typeof prefs.volume === 'number') this.volume = prefs.volume;
        // We don't auto-play on load (requires user gesture for AudioContext)
      }
    } catch (e) { /* ignore */ }
  },

  savePrefs() {
    try {
      localStorage.setItem(SOUND_PREFS_KEY, JSON.stringify({
        volume: this.volume,
        lastSound: this.currentSound,
      }));
    } catch (e) { /* ignore */ }
  },

  updateVolumeLabel() {
    const label = document.querySelector('.sound-bar__volume-label');
    if (label) {
      label.textContent = Math.round(this.volume * 100) + '%';
    }
  },

  renderSoundBar() {
    const timerView = document.getElementById('view-timer');
    if (!timerView) return;

    // Don't render twice
    if (timerView.querySelector('.sound-bar')) return;

    const bar = document.createElement('div');
    bar.className = 'sound-bar';

    // Sound buttons
    const btnsWrap = document.createElement('div');
    btnsWrap.className = 'sound-bar__buttons';

    AMBIENT_SOUNDS.forEach(sound => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sound-btn';
      btn.dataset.soundId = sound.id;
      btn.setAttribute('aria-label', sound.name);
      btn.title = sound.name;
      btn.innerHTML = '<span class="sound-btn__icon">' + sound.icon + '</span>' +
                       '<span class="sound-btn__name">' + sound.name + '</span>';
      btn.addEventListener('click', () => this.toggle(sound.id));
      btnsWrap.appendChild(btn);
    });

    bar.appendChild(btnsWrap);

    // Volume control
    const volWrap = document.createElement('div');
    volWrap.className = 'sound-bar__volume';

    const volIcon = document.createElement('span');
    volIcon.className = 'sound-bar__volume-icon';
    volIcon.textContent = '\uD83D\uDD0A';

    const volSlider = document.createElement('input');
    volSlider.type = 'range';
    volSlider.className = 'sound-bar__slider';
    volSlider.min = '0';
    volSlider.max = '100';
    volSlider.value = String(Math.round(this.volume * 100));
    volSlider.setAttribute('aria-label', '\u00C2m l\u01B0\u1EE3ng');

    const volLabel = document.createElement('span');
    volLabel.className = 'sound-bar__volume-label';
    volLabel.textContent = Math.round(this.volume * 100) + '%';

    volSlider.addEventListener('input', (e) => {
      this.setVolume(parseInt(e.target.value, 10) / 100);
    });

    volWrap.appendChild(volIcon);
    volWrap.appendChild(volSlider);
    volWrap.appendChild(volLabel);
    bar.appendChild(volWrap);

    // Insert after timer controls
    const focusPanel = timerView.querySelector('.timer-focus-panel');
    if (focusPanel) {
      focusPanel.appendChild(bar);
    } else {
      timerView.appendChild(bar);
    }
  },

  updateUI() {
    const buttons = document.querySelectorAll('.sound-btn');
    buttons.forEach(btn => {
      const id = btn.dataset.soundId;
      const isActive = this.isPlaying && this.currentSound === id;
      btn.classList.toggle('sound-btn--active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
  },
};


/* ================================================================
   FULLSCREEN MODULE — Immersive Focus Overlay
   ================================================================ */

const FullscreenModule = {
  isFullscreen: false,
  overlay: null,
  _syncInterval: null,

  init() {
    this.createButton();

    document.addEventListener('fullscreenchange', () => {
      this.isFullscreen = !!document.fullscreenElement;
      this.updateButton();
      if (!this.isFullscreen && this.overlay) {
        this.removeOverlay();
      }
    });

    // Webkit prefix support
    document.addEventListener('webkitfullscreenchange', () => {
      this.isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
      this.updateButton();
      if (!this.isFullscreen && this.overlay) {
        this.removeOverlay();
      }
    });
  },

  createButton() {
    const timerView = document.getElementById('view-timer');
    if (!timerView) return;

    const controls = timerView.querySelector('.timer-controls');
    if (!controls) return;

    // Don't render twice
    if (controls.querySelector('.fullscreen-btn')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--ghost fullscreen-btn';
    btn.setAttribute('aria-label', 'To\u00E0n m\u00E0n h\u00ECnh');
    btn.title = 'To\u00E0n m\u00E0n h\u00ECnh';
    btn.innerHTML = '<span class="fullscreen-btn__icon">\u26F6</span> <span class="fullscreen-btn__text">To\u00E0n m\u00E0n h\u00ECnh</span>';
    btn.addEventListener('click', () => {
      if (this.isFullscreen) {
        this.exit();
      } else {
        this.enter();
      }
    });

    controls.appendChild(btn);
  },

  updateButton() {
    const btn = document.querySelector('.fullscreen-btn');
    if (!btn) return;
    const textEl = btn.querySelector('.fullscreen-btn__text');
    const iconEl = btn.querySelector('.fullscreen-btn__icon');
    if (this.isFullscreen) {
      if (textEl) textEl.textContent = 'Tho\u00E1t';
      if (iconEl) iconEl.textContent = '\u2716';
    } else {
      if (textEl) textEl.textContent = 'To\u00E0n m\u00E0n h\u00ECnh';
      if (iconEl) iconEl.textContent = '\u26F6';
    }
  },

  enter() {
    const elem = document.documentElement;
    const requestFS = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.mozRequestFullScreen || elem.msRequestFullscreen;
    if (requestFS) {
      requestFS.call(elem).then(() => {
        this.isFullscreen = true;
        this.createOverlay();
        this.updateButton();
      }).catch(() => {
        if (typeof showToast === 'function') {
          showToast('Kh\u00F4ng th\u1EC3 m\u1EDF to\u00E0n m\u00E0n h\u00ECnh', 'warning');
        }
      });
    }
  },

  exit() {
    const exitFS = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
    if (exitFS && (document.fullscreenElement || document.webkitFullscreenElement)) {
      exitFS.call(document);
    }
    this.removeOverlay();
  },

  createOverlay() {
    if (this.overlay) return;

    const overlay = document.createElement('div');
    overlay.className = 'fullscreen-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Ch\u1EBF \u0111\u1ED9 to\u00E0n m\u00E0n h\u00ECnh');

    // Read current state from the main timer
    const timerDisplayEl = document.getElementById('timer-display');
    const timerText = timerDisplayEl ? timerDisplayEl.textContent : '00:00';

    const contextTaskEl = document.getElementById('timer-context-task');
    const taskName = contextTaskEl ? contextTaskEl.textContent : '';

    const modeChipEl = document.getElementById('mode-chip');
    const modeText = modeChipEl ? modeChipEl.textContent : 'Focus';

    // Build overlay HTML
    overlay.innerHTML =
      '<div class="fullscreen-overlay__bg"></div>' +
      '<div class="fullscreen-overlay__content">' +
        // Mode label
        '<div class="fullscreen-overlay__mode">' +
          '<span class="fullscreen-overlay__mode-chip">' + this._escHtml(modeText) + '</span>' +
        '</div>' +
        // Task name
        (taskName ? '<div class="fullscreen-overlay__task">' + this._escHtml(taskName) + '</div>' : '') +
        // Large timer
        '<div class="fullscreen-timer" id="fullscreen-timer-display">' + this._escHtml(timerText) + '</div>' +
        // Controls
        '<div class="fullscreen-overlay__controls">' +
          '<button type="button" class="fullscreen-overlay__btn fullscreen-overlay__btn--primary" id="fs-toggle-btn">' +
            (typeof isRunning !== 'undefined' && isRunning ? 'T\u1EA1m d\u1EEBng' : 'B\u1EAFt \u0111\u1EA7u') +
          '</button>' +
          '<button type="button" class="fullscreen-overlay__btn" id="fs-skip-btn">B\u1ECF qua</button>' +
          '<button type="button" class="fullscreen-overlay__btn fullscreen-overlay__btn--exit" id="fs-exit-btn">Tho\u00E1t</button>' +
        '</div>' +
        // Sound controls (compact)
        '<div class="fullscreen-overlay__sounds" id="fs-sounds"></div>' +
      '</div>';

    document.body.appendChild(overlay);
    this.overlay = overlay;

    // Force reflow then add visible class for animation
    overlay.offsetHeight; // eslint-disable-line no-unused-expressions
    overlay.classList.add('fullscreen-overlay--visible');

    // Wire up controls
    const toggleBtn = overlay.querySelector('#fs-toggle-btn');
    const skipBtn = overlay.querySelector('#fs-skip-btn');
    const exitBtn = overlay.querySelector('#fs-exit-btn');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        // Use the main app's start button click
        const mainStartBtn = document.getElementById('start-btn');
        if (mainStartBtn) mainStartBtn.click();
        // Update label after a tick
        setTimeout(() => {
          toggleBtn.textContent = (typeof isRunning !== 'undefined' && isRunning)
            ? 'T\u1EA1m d\u1EEBng' : 'B\u1EAFt \u0111\u1EA7u';
        }, 50);
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        const mainSkipBtn = document.getElementById('skip-btn');
        if (mainSkipBtn) mainSkipBtn.click();
      });
    }

    if (exitBtn) {
      exitBtn.addEventListener('click', () => this.exit());
    }

    // Render compact sound controls in fullscreen
    this._renderFSSounds();

    // Start syncing timer display
    this._syncInterval = setInterval(() => this.syncTimer(), 500);
  },

  syncTimer() {
    if (!this.overlay) return;

    const fsTimer = this.overlay.querySelector('#fullscreen-timer-display');
    const mainTimer = document.getElementById('timer-display');
    if (fsTimer && mainTimer) {
      fsTimer.textContent = mainTimer.textContent;
    }

    // Update mode chip
    const fsModeChip = this.overlay.querySelector('.fullscreen-overlay__mode-chip');
    const mainModeChip = document.getElementById('mode-chip');
    if (fsModeChip && mainModeChip) {
      fsModeChip.textContent = mainModeChip.textContent;
    }

    // Update toggle button text
    const toggleBtn = this.overlay.querySelector('#fs-toggle-btn');
    if (toggleBtn) {
      toggleBtn.textContent = (typeof isRunning !== 'undefined' && isRunning)
        ? 'T\u1EA1m d\u1EEBng' : 'B\u1EAFt \u0111\u1EA7u';
    }
  },

  removeOverlay() {
    if (this._syncInterval) {
      clearInterval(this._syncInterval);
      this._syncInterval = null;
    }

    if (this.overlay) {
      this.overlay.classList.remove('fullscreen-overlay--visible');
      const ref = this.overlay;
      setTimeout(() => {
        if (ref.parentNode) ref.parentNode.removeChild(ref);
      }, 350);
      this.overlay = null;
    }

    this.isFullscreen = false;
    this.updateButton();
  },

  _renderFSSounds() {
    if (!this.overlay) return;
    const container = this.overlay.querySelector('#fs-sounds');
    if (!container) return;

    AMBIENT_SOUNDS.forEach(sound => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fullscreen-overlay__sound-btn';
      if (SoundModule.isPlaying && SoundModule.currentSound === sound.id) {
        btn.classList.add('fullscreen-overlay__sound-btn--active');
      }
      btn.dataset.soundId = sound.id;
      btn.title = sound.name;
      btn.innerHTML = '<span>' + sound.icon + '</span>';
      btn.addEventListener('click', () => {
        SoundModule.toggle(sound.id);
        // Update active states
        container.querySelectorAll('.fullscreen-overlay__sound-btn').forEach(b => {
          b.classList.toggle(
            'fullscreen-overlay__sound-btn--active',
            SoundModule.isPlaying && SoundModule.currentSound === b.dataset.soundId
          );
        });
      });
      container.appendChild(btn);
    });
  },

  _escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};


/* ================================================================
   INITIALIZATION
   ================================================================ */

(function initModules() {
  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  function boot() {
    // Small delay to ensure app.js has initialized
    setTimeout(() => {
      SoundModule.init();
      FullscreenModule.init();
    }, 200);
  }
})();
