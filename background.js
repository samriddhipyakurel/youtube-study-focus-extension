/* ==========================================================================
   YouTube Study & Focus Mode - Background Service Worker
   ========================================================================== */

// Initialize extension defaults on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['studyMode', 'timerState'], (res) => {
    if (res.studyMode === undefined) {
      chrome.storage.local.set({ studyMode: true });
    }
    if (!res.timerState) {
      chrome.storage.local.set({
        timerState: 'stopped',
        timerDurationSec: 1500, // 25 minutes default
        timerEndTime: null,
        timerRemainingMs: 1500 * 1000
      });
    }
  });
});

// Listen for Chrome Alarm events (Pomodoro completion)
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'pomodoroAlarm') {
    // Reset timer state in storage
    chrome.storage.local.set({
      timerState: 'stopped',
      timerEndTime: null,
      timerRemainingMs: 1500 * 1000
    });

    // Fire Chrome Desktop Notification
    chrome.notifications.create('pomodoroComplete', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: '🎓 Pomodoro Session Complete!',
      message: 'Great job! You completed 25 minutes of focused study. Time for a 5-minute break!',
      priority: 2
    });
  }
});

// Handle incoming messages from popup if necessary
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startAlarm') {
    const delayMs = request.endTime - Date.now();
    if (delayMs > 0) {
      chrome.alarms.create('pomodoroAlarm', { when: request.endTime });
    }
    sendResponse({ status: 'Alarm scheduled' });
  } else if (request.action === 'cancelAlarm') {
    chrome.alarms.clear('pomodoroAlarm');
    sendResponse({ status: 'Alarm cancelled' });
  }
  return true;
});
