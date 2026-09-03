/* ==========================================================================
   YouTube Study & Focus Mode - Popup Logic & Pomodoro Timer
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const studyModeToggle = document.getElementById('study-mode-toggle');
  const statusPill = document.getElementById('status-pill');
  const statusText = document.getElementById('status-text');

  const timerDisplay = document.getElementById('timer-display');
  const timerStateLabel = document.getElementById('timer-state-label');
  const startPauseBtn = document.getElementById('start-pause-btn');
  const btnIcon = document.getElementById('btn-icon');
  const btnText = document.getElementById('btn-text');
  const resetBtn = document.getElementById('reset-btn');
  const progressRingCircle = document.getElementById('timer-progress-ring');

  // Pomodoro Constants
  const TOTAL_DURATION_SEC = 25 * 60; // 25 Minutes
  const CIRCUMFERENCE = 2 * Math.PI * 65; // SVG Circle radius = 65

  progressRingCircle.style.strokeDasharray = `${CIRCUMFERENCE}`;

  let timerInterval = null;

  // --------------------------------------------------------------------------
  // 1. Study Mode Switch Initialization & Storage Listener
  // --------------------------------------------------------------------------
  chrome.storage.local.get(['studyMode'], (res) => {
    const isEnabled = res.studyMode !== undefined ? res.studyMode : true;
    studyModeToggle.checked = isEnabled;
    updateStatusPill(isEnabled);
  });

  studyModeToggle.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    chrome.storage.local.set({ studyMode: enabled });
    updateStatusPill(enabled);
  });

  function updateStatusPill(enabled) {
    if (enabled) {
      statusPill.classList.add('active');
      statusText.textContent = 'Active';
    } else {
      statusPill.classList.remove('active');
      statusText.textContent = 'Paused';
    }
  }

  // --------------------------------------------------------------------------
  // 2. Pomodoro Timer Logic
  // --------------------------------------------------------------------------
  function initTimer() {
    updateTimerUI();
    timerInterval = setInterval(updateTimerUI, 250);
  }

  function updateTimerUI() {
    chrome.storage.local.get(['timerState', 'timerEndTime', 'timerRemainingMs'], (res) => {
      const state = res.timerState || 'stopped';
      const endTime = res.timerEndTime || null;
      const remainingMs = res.timerRemainingMs !== undefined ? res.timerRemainingMs : TOTAL_DURATION_SEC * 1000;

      let currentRemainingSec = TOTAL_DURATION_SEC;

      if (state === 'running' && endTime) {
        const msLeft = endTime - Date.now();
        if (msLeft <= 0) {
          // Timer finished
          currentRemainingSec = 0;
          setTimerStoppedState();
        } else {
          currentRemainingSec = Math.ceil(msLeft / 1000);
        }
      } else if (state === 'paused') {
        currentRemainingSec = Math.ceil(remainingMs / 1000);
      } else {
        currentRemainingSec = TOTAL_DURATION_SEC;
      }

      // Update Digital Display
      const minutes = Math.floor(currentRemainingSec / 60);
      const seconds = currentRemainingSec % 60;
      timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      // Update SVG Progress Ring
      const progressFraction = currentRemainingSec / TOTAL_DURATION_SEC;
      const offset = CIRCUMFERENCE * (1 - progressFraction);
      progressRingCircle.style.strokeDashoffset = offset;

      // Update Button state & Labels
      if (state === 'running') {
        timerStateLabel.textContent = 'Focusing...';
        btnIcon.textContent = '⏸';
        btnText.textContent = 'Pause';
        startPauseBtn.classList.add('paused');
      } else if (state === 'paused') {
        timerStateLabel.textContent = 'Timer Paused';
        btnIcon.textContent = '▶';
        btnText.textContent = 'Resume';
        startPauseBtn.classList.remove('paused');
      } else {
        timerStateLabel.textContent = 'Ready to Focus';
        btnIcon.textContent = '▶';
        btnText.textContent = 'Start Focus';
        startPauseBtn.classList.remove('paused');
      }
    });
  }

  // Start / Pause Button Event Handler
  startPauseBtn.addEventListener('click', () => {
    chrome.storage.local.get(['timerState', 'timerEndTime', 'timerRemainingMs'], (res) => {
      const state = res.timerState || 'stopped';

      if (state === 'stopped') {
        // Start fresh timer
        const endTime = Date.now() + TOTAL_DURATION_SEC * 1000;
        chrome.storage.local.set({
          timerState: 'running',
          timerEndTime: endTime,
          timerRemainingMs: TOTAL_DURATION_SEC * 1000
        });

        // Notify background service worker to create Chrome Alarm
        chrome.runtime.sendMessage({ action: 'startAlarm', endTime: endTime });
      } else if (state === 'running') {
        // Pause timer
        const endTime = res.timerEndTime;
        const remaining = Math.max(0, endTime - Date.now());

        chrome.storage.local.set({
          timerState: 'paused',
          timerEndTime: null,
          timerRemainingMs: remaining
        });

        chrome.runtime.sendMessage({ action: 'cancelAlarm' });
      } else if (state === 'paused') {
        // Resume timer
        const remaining = res.timerRemainingMs || TOTAL_DURATION_SEC * 1000;
        const endTime = Date.now() + remaining;

        chrome.storage.local.set({
          timerState: 'running',
          timerEndTime: endTime
        });

        chrome.runtime.sendMessage({ action: 'startAlarm', endTime: endTime });
      }
    });
  });

  // Reset Button Event Handler
  resetBtn.addEventListener('click', () => {
    setTimerStoppedState();
  });

  function setTimerStoppedState() {
    chrome.storage.local.set({
      timerState: 'stopped',
      timerEndTime: null,
      timerRemainingMs: TOTAL_DURATION_SEC * 1000
    });
    chrome.runtime.sendMessage({ action: 'cancelAlarm' });
  }

  initTimer();
});
