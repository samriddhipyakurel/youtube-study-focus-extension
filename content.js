/* ==========================================================================
   YouTube & Web Study Focus Mode - Hyper-Strict Content Script
   Only Allows: Math, DSA, Python/Programming, IT Problem Solving, Study Motivation, Music
   ========================================================================== */

(function () {
  'use strict';

  // Collection of motivational study quotes
  const STUDY_QUOTES = [
    { quote: "Focus is a muscle. The more you practice staying present, the stronger you become.", author: "Cal Newport" },
    { quote: "Don't wish it were easier; wish you were better.", author: "Jim Rohn" },
    { quote: "Success isn't always about greatness. It's about consistency. Consistent hard work leads to success.", author: "Dwayne Johnson" },
    { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { quote: "It always seems impossible until it's done.", author: "Nelson Mandela" },
    { quote: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki" },
    { quote: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
    { quote: "Action is the foundational key to all success.", author: "Pablo Picasso" },
    { quote: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
    { quote: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" }
  ];

  // STRICT WHITELIST KEYWORDS (ONLY Math, DSA, Python/Programming, Problem Solving, Study Motivation, Music)
  const STRICT_ALLOWED_KEYWORDS = [
    // 1. Math
    'math', 'mathematics', 'calculus', 'algebra', 'geometry', 'trigonometry', 'statistic', 'statistics', 
    'linear algebra', 'differential equation', 'discrete math', 'probability', 'number theory',

    // 2. DSA (Data Structures & Algorithms) & Competitive Programming
    'dsa', 'data structure', 'data structures', 'algorithm', 'algorithms', 'leetcode', 'codeforces', 
    'hackerrank', 'codechef', 'competitive programming', 'tree', 'graph', 'dynamic programming', 
    'recursion', 'sorting', 'binary search', 'array', 'linked list', 'stack', 'queue', 'heap', 'hashmap',

    // 3. Python, Programming, Coding & IT
    'python', 'programming', 'coding', 'coder', 'developer', 'software', 'software engineering', 
    'computer science', 'comp sci', 'it ', 'it:', 'information technology', 'backend', 
    'frontend', 'web dev', 'web development', 'java', 'c++', 'javascript', 'sql', 'database', 'system design',

    // 4. IT / Math Problem Solving
    'problem solving', 'problem-solving', 'problem solver', 'problem solved', 'solve problems', 
    'puzzle', 'aptitude', 'logic puzzle', 'brain teaser',

    // 5. Study Motivation
    'study motivation', 'study motivational', 'study focus', 'study with me', 'deep work', 
    'studying motivation', 'focus motivation', 'study hard', 'motivation for students', 'exam motivation',

    // 6. Music & Songs
    'music', 'song', 'songs', 'lofi', 'instrumental', 'soundtrack', 'classical', 'piano', 
    'violin', 'chill beats', 'ambient', 'study beats', 'lo-fi', 'playlist', 'bgm'
  ];

  // Distracting Social Media Domains
  const BLOCKED_SOCIAL_DOMAINS = [
    'instagram.com', 'tiktok.com', 'twitter.com', 'x.com', 'facebook.com', 'reddit.com'
  ];

  let currentStudyMode = true;
  let currentQuoteIndex = 0;
  let filterInterval = null;
  let domObserver = null;

  // Initialize Extension State
  function init() {
    chrome.storage.local.get(['studyMode'], (result) => {
      currentStudyMode = result.studyMode !== undefined ? result.studyMode : true;
      applyStudyModeState(currentStudyMode);
    });

    // Listen for storage changes from Popup toggle
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.studyMode) {
        currentStudyMode = changes.studyMode.newValue;
        applyStudyModeState(currentStudyMode);
      }
    });

    // Navigation Listeners
    window.addEventListener('yt-navigate-finish', handlePageNavigation);
    window.addEventListener('popstate', handlePageNavigation);
    
    handlePageNavigation();
  }

  // Apply or remove Study Mode state
  function applyStudyModeState(isEnabled) {
    const hostname = window.location.hostname;

    // Check if on distracting social media site
    if (isSocialMediaDomain(hostname)) {
      if (isEnabled) {
        showSocialMediaBlocker();
      } else {
        removeSocialMediaBlocker();
      }
      return;
    }

    // YouTube specific state
    if (isEnabled) {
      document.documentElement.classList.add('yt-study-mode-active');
      startYouTubeTopicFilter();
      handlePageNavigation();
    } else {
      document.documentElement.classList.remove('yt-study-mode-active');
      stopYouTubeTopicFilter();
      removeMotivationalBanner();
      removeShortsBlocker();
      removeNonStudyVideoBlocker();
    }
  }

  function isSocialMediaDomain(host) {
    return BLOCKED_SOCIAL_DOMAINS.some(domain => host.includes(domain));
  }

  // --------------------------------------------------------------------------
  // 1. Social Media Site Blocker (Instagram, TikTok, Twitter, Facebook, Reddit)
  // --------------------------------------------------------------------------
  function showSocialMediaBlocker() {
    if (document.getElementById('yt-social-blocked-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'yt-social-blocked-overlay';
    overlay.innerHTML = `
      <div class="yt-focus-card">
        <div class="yt-focus-icon">🚫</div>
        <h2>Social Media Blocked in Study Mode</h2>
        <p>Instagram, TikTok, and Twitter are paused to keep your attention on studying.</p>
        <div class="yt-focus-allowed-list">
          <strong>Allowed Topics on YouTube:</strong>
          <ul>
            <li>Math & Problem Solving</li>
            <li>DSA & Python / Programming</li>
            <li>Study Motivation & Music</li>
          </ul>
        </div>
        <button class="yt-focus-primary-btn" id="yt-social-to-yt-btn">
          🎓 Go to YouTube Study Session
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    const btn = overlay.querySelector('#yt-social-to-yt-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        window.location.href = 'https://www.youtube.com/';
      });
    }
  }

  function removeSocialMediaBlocker() {
    const existing = document.getElementById('yt-social-blocked-overlay');
    if (existing) existing.remove();
  }

  // --------------------------------------------------------------------------
  // 2. YouTube Router & Distraction Filter
  // --------------------------------------------------------------------------
  function handlePageNavigation() {
    if (!currentStudyMode) return;

    const currentUrl = window.location.href;

    // Check if directly on Shorts URL
    if (currentUrl.includes('/shorts/')) {
      showShortsBlocker();
      removeMotivationalBanner();
      removeNonStudyVideoBlocker();
      return;
    } else {
      removeShortsBlocker();
    }

    // Check if on YouTube Watch page (/watch?v=...)
    if (window.location.pathname.includes('/watch')) {
      removeMotivationalBanner();
      checkWatchPageVideoTopic();
    } else {
      removeNonStudyVideoBlocker();
    }

    // Inject Motivational Banner on Homepage or Search Results
    const isHomePage = window.location.pathname === '/' || window.location.pathname === '';
    const isSearchPage = window.location.pathname.includes('/results');

    if (isHomePage || isSearchPage) {
      injectMotivationalBanner();
    } else if (!window.location.pathname.includes('/watch')) {
      removeMotivationalBanner();
    }

    // Run topic filter on feeds
    filterYouTubeVideoCards();
  }

  // Hyper-Strict Filter: Only Math, DSA, Python, Problem Solving, Motivation, Music allowed
  function filterYouTubeVideoCards() {
    if (!currentStudyMode) return;

    // Target all video cards on YouTube
    const videoCards = document.querySelectorAll(
      'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, ytd-rich-grid-media, ytd-playlist-renderer'
    );

    videoCards.forEach(card => {
      // Find title specifically or full text
      const titleElem = card.querySelector('#video-title, #video-title-link, a#video-title, yt-formatted-string#video-title') || card;
      const text = (titleElem.textContent || '').toLowerCase().trim();

      if (!text) return;

      // Check if text matches strictly allowed topics
      const isAllowed = STRICT_ALLOWED_KEYWORDS.some(kw => text.includes(kw));

      if (!isAllowed) {
        card.classList.add('yt-study-hidden-video');
        card.style.setProperty('display', 'none', 'important');
      } else {
        card.classList.remove('yt-study-hidden-video');
        card.style.removeProperty('display');
      }
    });

    // Also filter category chip pills at top of YouTube home (e.g. "Gaming", "Podcasts", etc.)
    const categoryChips = document.querySelectorAll('yt-chip-cloud-chip-renderer');
    categoryChips.forEach(chip => {
      const chipText = (chip.textContent || '').toLowerCase().trim();
      if (!chipText || chipText === 'all') return;

      const isChipAllowed = STRICT_ALLOWED_KEYWORDS.some(kw => chipText.includes(kw));
      if (!isChipAllowed) {
        chip.style.setProperty('display', 'none', 'important');
      } else {
        chip.style.removeProperty('display');
      }
    });
  }

  // Check if current watch video title is strictly allowed
  function checkWatchPageVideoTopic() {
    if (!currentStudyMode) return;

    const titleElem = document.querySelector('h1.ytd-watch-metadata, ytd-watch-flexy h1, #info-contents h1, #title h1');
    const fullText = (document.title + ' ' + (titleElem ? titleElem.textContent : '')).toLowerCase().trim();

    if (!fullText) return;

    const isAllowed = STRICT_ALLOWED_KEYWORDS.some(kw => fullText.includes(kw));

    if (!isAllowed) {
      // Pause video
      const videoElem = document.querySelector('video');
      if (videoElem) videoElem.pause();

      showNonStudyVideoBlocker();
    } else {
      removeNonStudyVideoBlocker();
    }
  }

  function showNonStudyVideoBlocker() {
    if (document.getElementById('yt-nonstudy-blocked-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'yt-nonstudy-blocked-overlay';
    overlay.innerHTML = `
      <div class="yt-focus-card">
        <div class="yt-focus-icon">🔒</div>
        <h2>Video Blocked by Strict Focus Filter</h2>
        <p>This video does not match your strict study criteria. Only Math, DSA, Python/Programming, Problem Solving, Motivation, and Music are allowed.</p>
        <div class="yt-focus-allowed-list">
          <strong>Strictly Permitted Topics:</strong>
          <ul>
            <li>Math, Calculus, Algebra & Science</li>
            <li>DSA (Data Structures & Algorithms) & LeetCode</li>
            <li>Python, Coding, Programming & Tech</li>
            <li>IT / Math Problem Solving</li>
            <li>Study Motivation & Music / Lofi</li>
          </ul>
        </div>
        <button class="yt-focus-primary-btn" id="yt-nonstudy-home-btn">
          🏠 Return to Study Feed
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    const btn = overlay.querySelector('#yt-nonstudy-home-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        window.location.href = 'https://www.youtube.com/';
      });
    }
  }

  function removeNonStudyVideoBlocker() {
    const existing = document.getElementById('yt-nonstudy-blocked-overlay');
    if (existing) existing.remove();
  }

  function startYouTubeTopicFilter() {
    filterYouTubeVideoCards();

    // Use MutationObserver for real-time dynamic infinite scrolling hiding
    if (!domObserver) {
      domObserver = new MutationObserver(() => {
        filterYouTubeVideoCards();
      });

      const targetNode = document.querySelector('ytd-page-manager') || document.body;
      if (targetNode) {
        domObserver.observe(targetNode, { childList: true, subtree: true });
      }
    }

    if (!filterInterval) {
      filterInterval = setInterval(filterYouTubeVideoCards, 250); // Ultra-fast 250ms check
    }
  }

  function stopYouTubeTopicFilter() {
    if (domObserver) {
      domObserver.disconnect();
      domObserver = null;
    }
    if (filterInterval) {
      clearInterval(filterInterval);
      filterInterval = null;
    }
    document.querySelectorAll('.yt-study-hidden-video').forEach(el => {
      el.classList.remove('yt-study-hidden-video');
      el.style.removeProperty('display');
    });
  }

  // --------------------------------------------------------------------------
  // 3. Motivational Banner Injection
  // --------------------------------------------------------------------------
  function injectMotivationalBanner() {
    if (document.getElementById('yt-study-banner')) return;

    const primaryContainer = document.querySelector('ytd-page-manager') || 
                             document.querySelector('#primary') || 
                             document.querySelector('#contents');

    if (!primaryContainer) return;

    const bannerElem = document.createElement('div');
    bannerElem.id = 'yt-study-banner';

    currentQuoteIndex = Math.floor(Math.random() * STUDY_QUOTES.length);
    const item = STUDY_QUOTES[currentQuoteIndex];

    bannerElem.innerHTML = `
      <div class="yt-study-banner-left">
        <div class="yt-study-banner-badge">🎓</div>
        <div class="yt-study-banner-text">
          <span class="yt-study-banner-label">Strict Study Mode • Math, DSA, Python, Motivation & Music ONLY</span>
          <div class="yt-study-quote-text">"${item.quote}"</div>
          <span class="yt-study-quote-author">— ${item.author}</span>
        </div>
      </div>
      <button class="yt-study-refresh-btn" id="yt-study-refresh-quote-btn" title="Get another quote">
        🔄 New Quote
      </button>
    `;

    primaryContainer.prepend(bannerElem);

    const refreshBtn = bannerElem.querySelector('#yt-study-refresh-quote-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', rotateQuote);
    }
  }

  function rotateQuote() {
    currentQuoteIndex = (currentQuoteIndex + 1) % STUDY_QUOTES.length;
    const item = STUDY_QUOTES[currentQuoteIndex];
    const bannerElem = document.getElementById('yt-study-banner');
    
    if (bannerElem) {
      const quoteText = bannerElem.querySelector('.yt-study-quote-text');
      const quoteAuthor = bannerElem.querySelector('.yt-study-quote-author');
      if (quoteText && quoteAuthor) {
        quoteText.textContent = `"${item.quote}"`;
        quoteAuthor.textContent = `— ${item.author}`;
      }
    }
  }

  function removeMotivationalBanner() {
    const existingBanner = document.getElementById('yt-study-banner');
    if (existingBanner) existingBanner.remove();
  }

  // Fullscreen Shorts Block Overlay
  function showShortsBlocker() {
    if (document.getElementById('yt-shorts-blocked-overlay')) return;

    const videoElem = document.querySelector('video');
    if (videoElem) videoElem.pause();

    const overlay = document.createElement('div');
    overlay.id = 'yt-shorts-blocked-overlay';
    overlay.innerHTML = `
      <div class="yt-focus-card">
        <div class="yt-focus-icon">🚫</div>
        <h2>Shorts Are Blocked</h2>
        <p>Shorts are hidden during Study Mode to keep you focused on your educational goals.</p>
        <button class="yt-focus-primary-btn" id="yt-shorts-go-home-btn">
          🏠 Return to YouTube Home
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    const homeBtn = overlay.querySelector('#yt-shorts-go-home-btn');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        window.location.href = 'https://www.youtube.com/';
      });
    }
  }

  function removeShortsBlocker() {
    const existingOverlay = document.getElementById('yt-shorts-blocked-overlay');
    if (existingOverlay) existingOverlay.remove();
  }

  // Start script
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
