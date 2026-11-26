(() => {
  const STORAGE_KEY = 'doomforge_flip_state_v2';
  const EVENT_DEFAULT_ISO = '2026-12-08T09:00:00+05:30';
  const EVENT_DEFAULT_TS = new Date(EVENT_DEFAULT_ISO).getTime();

  const el = {
    body: document.body,
    groupDays: document.getElementById('group-days'),
    colonDays: document.getElementById('colon-days'),
    digitsDays: document.getElementById('digits-days'),
    digitsHours: document.getElementById('digits-hours'),
    digitsMinutes: document.getElementById('digits-minutes'),
    digitsSeconds: document.getElementById('digits-seconds'),
    modeBtns: document.querySelectorAll('.mode-btn'),
    statusText: document.getElementById('status-text'),
    phaseLabel: document.getElementById('phase-label'),
    rulerFill: document.getElementById('ruler-fill'),
    targetMeta: document.getElementById('target-meta'),
    percentMeta: document.getElementById('percent-meta'),
    stageDeck: document.getElementById('stage-deck'),
    startPauseBtn: document.getElementById('start-pause-btn'),
    resetBtn: document.getElementById('reset-btn'),
    plus1mBtn: document.getElementById('plus-1m-btn'),
    plus5mBtn: document.getElementById('plus-5m-btn'),
    presetBtns: document.querySelectorAll('.preset-btn'),
    phaseCards: document.querySelectorAll('.phase-card'),
    themeBtn: document.getElementById('theme-btn'),
    projectorBtn: document.getElementById('projector-btn'),
    exitProjectorBtn: document.getElementById('exit-projector-btn'),
    fullscreenBtn: document.getElementById('fullscreen-btn'),
    configBtn: document.getElementById('config-btn'),
    closeDrawerBtn: document.getElementById('close-drawer-btn'),
    drawer: document.getElementById('config-drawer'),
    scrim: document.getElementById('drawer-scrim'),
    targetInput: document.getElementById('target-input'),
    saveTargetBtn: document.getElementById('save-target-btn'),
    resetDefaultDateBtn: document.getElementById('reset-default-date-btn'),
    inHours: document.getElementById('in-hours'),
    inMins: document.getElementById('in-mins'),
    inSecs: document.getElementById('in-secs'),
    loadStageBtn: document.getElementById('load-stage-btn'),
    alarmToggle: document.getElementById('alarm-toggle'),
    tickToggle: document.getElementById('tick-toggle'),
    testAlarmBtn: document.getElementById('test-alarm-btn')
  };

  function readStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return {};
  }

  const saved = readStorage();

  const state = {
    mode: saved.mode || 'countdown',
    theme: saved.theme || 'paper',
    targetTs: saved.targetTs || EVENT_DEFAULT_TS,
    spanMs: saved.spanMs || Math.max(86400000, EVENT_DEFAULT_TS - Date.now()),
    stageTotalSec: saved.stageTotalSec || 1800,
    stageRemainingSec: saved.stageRemainingSec ?? 1800,
    stageRunning: false,
    stageEndTs: null,
    alarmEnabled: saved.alarmEnabled !== false,
    tickEnabled: saved.tickEnabled === true,
    alarmTriggered: false,
    phaseText: saved.phaseText || 'T-MINUS TO DOOMFORGE KICKOFF',
    initialized: false
  };

  function saveStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        mode: state.mode,
        theme: state.theme,
        targetTs: state.targetTs,
        spanMs: state.spanMs,
        stageTotalSec: state.stageTotalSec,
        stageRemainingSec: Math.ceil(state.stageRemainingSec),
        alarmEnabled: state.alarmEnabled,
        tickEnabled: state.tickEnabled,
        phaseText: state.phaseText
      }));
    } catch (_) {}
  }

  function toInputDatetime(ts) {
    const d = new Date(ts);
    const local = new Date(ts - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function pad2(n) {
    return String(Math.max(0, Math.floor(n))).padStart(2, '0');
  }

  function applyTheme(next) {
    state.theme = next;
    el.body.dataset.theme = next;
    OrbitalScene.setTheme(next);
    saveStorage();
  }

  function applyUrgency(level, label) {
    if (el.body.dataset.urgency !== level) {
      el.body.dataset.urgency = level;
      OrbitalScene.setUrgency(level);
    }
    el.statusText.textContent = label;
  }

  function fireZeroAlarm() {
    if (state.alarmTriggered) return;
    state.alarmTriggered = true;
    if (state.alarmEnabled) {
      DoomAudio.playHorn();
    }
  }

  function setMode(mode) {
    state.mode = mode;
    state.alarmTriggered = false;

    el.modeBtns.forEach((btn) => {
      const on = btn.dataset.mode === mode;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', String(on));
    });

    const isStage = mode === 'stage';
    el.stageDeck.classList.toggle('hidden', !isStage);
    el.groupDays.classList.toggle('hidden', isStage);
    el.colonDays.classList.toggle('hidden', isStage);

    if (!isStage) {
      pauseStage();
    }

    saveStorage();
    tick(false);
  }

  function startStage() {
    if (state.stageRemainingSec <= 0) {
      state.stageRemainingSec = state.stageTotalSec;
    }
    state.stageRunning = true;
    state.alarmTriggered = false;
    state.stageEndTs = Date.now() + state.stageRemainingSec * 1000;
    el.startPauseBtn.textContent = 'PAUSE';
  }

  function pauseStage() {
    if (state.stageRunning && state.stageEndTs) {
      state.stageRemainingSec = Math.max(0, (state.stageEndTs - Date.now()) / 1000);
    }
    state.stageRunning = false;
    state.stageEndTs = null;
    el.startPauseBtn.textContent = 'START';
    saveStorage();
  }

  function resetStage() {
    pauseStage();
    state.stageRemainingSec = state.stageTotalSec;
    state.alarmTriggered = false;
    saveStorage();
    tick(true);
  }

  function adjustStage(deltaSec) {
    if (state.stageRunning && state.stageEndTs) {
      state.stageEndTs += deltaSec * 1000;
      state.stageRemainingSec = Math.max(0, (state.stageEndTs - Date.now()) / 1000);
    } else {
      state.stageRemainingSec = Math.max(0, state.stageRemainingSec + deltaSec);
    }
    state.stageTotalSec = Math.max(state.stageTotalSec, Math.ceil(state.stageRemainingSec));
    state.alarmTriggered = false;
    saveStorage();
    tick(true);
  }

  function loadStage(seconds, label) {
    pauseStage();
    state.stageTotalSec = seconds;
    state.stageRemainingSec = seconds;
    state.alarmTriggered = false;
    if (label) {
      state.phaseText = label;
      el.phaseLabel.textContent = label;
    }
    setMode('stage');
  }

  function tick(animate = true) {
    const shouldAnimate = animate && state.initialized;

    if (state.mode === 'countdown') {
      const diffMs = Math.max(0, state.targetTs - Date.now());
      const totalSec = Math.floor(diffMs / 1000);

      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      FlipClock.update({ days, hours, minutes, seconds }, shouldAnimate);

      const pct = Math.min(100, Math.max(0, (diffMs / state.spanMs) * 100));
      el.rulerFill.style.width = pct.toFixed(2) + '%';
      el.percentMeta.textContent = pct.toFixed(1) + '% REMAINING';

      const targetDate = new Date(state.targetTs);
      el.targetMeta.textContent = 'TARGET: ' + targetDate.toLocaleString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).toUpperCase();

      if (totalSec === 0) {
        applyUrgency('critical', 'EVENT LIVE');
        fireZeroAlarm();
      } else if (totalSec <= 3600) {
        applyUrgency('critical', 'FINAL HOUR');
      } else if (totalSec <= 86400) {
        applyUrgency('warning', 'UNDER 24 HRS');
      } else {
        applyUrgency('normal', 'ARMED');
      }
      state.initialized = true;
      return;
    }

    let rem = state.stageRemainingSec;
    if (state.stageRunning && state.stageEndTs) {
      rem = Math.max(0, (state.stageEndTs - Date.now()) / 1000);
      state.stageRemainingSec = rem;
      if (rem <= 0) {
        pauseStage();
        fireZeroAlarm();
      }
    }

    const whole = Math.ceil(rem);
    const hours = Math.floor(whole / 3600);
    const minutes = Math.floor((whole % 3600) / 60);
    const seconds = whole % 60;

    FlipClock.update({ hours, minutes, seconds }, shouldAnimate);

    const pct = state.stageTotalSec > 0 ? Math.min(100, (rem / state.stageTotalSec) * 100) : 0;
    el.rulerFill.style.width = pct.toFixed(2) + '%';
    el.percentMeta.textContent = pct.toFixed(1) + '% REMAINING';
    el.targetMeta.textContent =
      'ALLOCATED: ' +
      pad2(Math.floor(state.stageTotalSec / 3600)) + ':' +
      pad2(Math.floor((state.stageTotalSec % 3600) / 60)) + ':' +
      pad2(state.stageTotalSec % 60);

    if (whole === 0) {
      applyUrgency('critical', 'TIME EXPIRED');
    } else if (whole <= 60 || pct <= 10) {
      applyUrgency('critical', 'CRITICAL');
    } else if (whole <= 300 || pct <= 25) {
      applyUrgency('warning', 'WRAPPING UP');
    } else {
      applyUrgency('normal', state.stageRunning ? 'RUNNING' : 'STANDBY');
    }
    state.initialized = true;
  }

  function setDrawer(open) {
    el.drawer.classList.toggle('open', open);
    el.drawer.setAttribute('aria-hidden', String(!open));
    el.scrim.classList.toggle('hidden', !open);
  }

  function toggleProjector() {
    el.body.classList.toggle('projector-mode');
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  FlipClock.mount(
    {
      days: el.digitsDays,
      hours: el.digitsHours,
      minutes: el.digitsMinutes,
      seconds: el.digitsSeconds
    },
    () => {
      if (state.tickEnabled) {
        DoomAudio.playClick();
      }
    }
  );

  el.modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  el.startPauseBtn.addEventListener('click', () => {
    if (state.stageRunning) pauseStage();
    else startStage();
    tick(true);
  });

  el.resetBtn.addEventListener('click', resetStage);
  el.plus1mBtn.addEventListener('click', () => adjustStage(60));
  el.plus5mBtn.addEventListener('click', () => adjustStage(300));

  el.presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      loadStage(Number(btn.dataset.seconds), btn.dataset.label);
    });
  });

  el.phaseCards.forEach((card) => {
    card.addEventListener('click', () => {
      el.phaseCards.forEach((c) => c.classList.remove('active'));
      card.classList.add('active');

      const label = card.dataset.label;
      state.phaseText = label;
      el.phaseLabel.textContent = label;

      if (card.dataset.type === 'countdown') {
        setMode('countdown');
      } else {
        loadStage(Number(card.dataset.seconds), label);
      }
    });
  });

  el.phaseLabel.addEventListener('blur', () => {
    const clean = el.phaseLabel.textContent.trim();
    state.phaseText = clean || 'DOOMFORGE EVENT PROTOCOL';
    el.phaseLabel.textContent = state.phaseText;
    saveStorage();
  });

  el.phaseLabel.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      el.phaseLabel.blur();
    }
  });

  el.themeBtn.addEventListener('click', () => {
    applyTheme(state.theme === 'paper' ? 'obsidian' : 'paper');
  });

  el.projectorBtn.addEventListener('click', toggleProjector);
  el.exitProjectorBtn.addEventListener('click', toggleProjector);
  el.fullscreenBtn.addEventListener('click', toggleFullscreen);
  el.configBtn.addEventListener('click', () => setDrawer(true));
  el.closeDrawerBtn.addEventListener('click', () => setDrawer(false));
  el.scrim.addEventListener('click', () => setDrawer(false));

  el.saveTargetBtn.addEventListener('click', () => {
    if (!el.targetInput.value) return;
    const ts = new Date(el.targetInput.value).getTime();
    if (Number.isNaN(ts)) return;
    state.targetTs = ts;
    state.spanMs = Math.max(60000, ts - Date.now());
    state.alarmTriggered = false;
    setMode('countdown');
    setDrawer(false);
  });

  el.resetDefaultDateBtn.addEventListener('click', () => {
    state.targetTs = EVENT_DEFAULT_TS;
    state.spanMs = Math.max(86400000, EVENT_DEFAULT_TS - Date.now());
    state.alarmTriggered = false;
    el.targetInput.value = toInputDatetime(state.targetTs);
    setMode('countdown');
    setDrawer(false);
  });

  el.loadStageBtn.addEventListener('click', () => {
    const h = Math.max(0, parseInt(el.inHours.value, 10) || 0);
    const m = Math.max(0, parseInt(el.inMins.value, 10) || 0);
    const s = Math.max(0, parseInt(el.inSecs.value, 10) || 0);
    const total = h * 3600 + m * 60 + s;
    if (total <= 0) return;
    loadStage(total, 'CUSTOM STAGE PROTOCOL');
    setDrawer(false);
  });

  el.alarmToggle.addEventListener('change', () => {
    state.alarmEnabled = el.alarmToggle.checked;
    saveStorage();
  });

  el.tickToggle.addEventListener('change', () => {
    state.tickEnabled = el.tickToggle.checked;
    saveStorage();
  });

  el.testAlarmBtn.addEventListener('click', () => DoomAudio.playHorn());

  document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.isContentEditable)) return;

    if (e.key === 'f' || e.key === 'F') {
      toggleFullscreen();
    } else if (e.key === 'h' || e.key === 'H') {
      toggleProjector();
    } else if (e.key === 't' || e.key === 'T') {
      applyTheme(state.theme === 'paper' ? 'obsidian' : 'paper');
    } else if (e.code === 'Space' && state.mode === 'stage') {
      e.preventDefault();
      if (state.stageRunning) pauseStage();
      else startStage();
      tick(true);
    } else if (e.key === 'Escape') {
      setDrawer(false);
    }
  });

  el.phaseLabel.textContent = state.phaseText;
  el.targetInput.value = toInputDatetime(state.targetTs);
  el.alarmToggle.checked = state.alarmEnabled;
  el.tickToggle.checked = state.tickEnabled;

  OrbitalScene.init();
  applyTheme(state.theme);
  setMode(state.mode);
  setInterval(() => tick(true), 250);
})();
