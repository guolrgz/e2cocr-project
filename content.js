// SnapWord - Content Script (Selection Overlay & Floating Bubble)

(() => {
  let isSelecting = false;
  let overlay = null;
  let selectionRect = null;
  let startX = 0;
  let startY = 0;
  let currentBubble = null;
  let bubbleTimeout = null;
  let lastRect = null;

  // === Message Listener ===
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'start-ocr-selection') {
      enterSelectionMode();
    }
    if (msg.action === 'ocr-result') {
      showBubble(msg.data);
    }
  });

  // === Selection Mode ===
  function enterSelectionMode() {
    if (isSelecting) return;
    isSelecting = true;
    removeBubble();

    // Create overlay
    overlay = document.createElement('div');
    overlay.className = 'snapword-overlay';
    document.body.appendChild(overlay);

    // Create selection rectangle
    selectionRect = document.createElement('div');
    selectionRect.className = 'snapword-selection';
    overlay.appendChild(selectionRect);

    overlay.addEventListener('mousedown', onMouseDown);
    overlay.addEventListener('mousemove', onMouseMove);
    overlay.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onEscape);
  }

  function exitSelectionMode() {
    isSelecting = false;
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    selectionRect = null;
    document.removeEventListener('keydown', onEscape);
  }

  function onEscape(e) {
    if (e.key === 'Escape') {
      exitSelectionMode();
    }
  }

  function onMouseDown(e) {
    startX = e.clientX;
    startY = e.clientY;
    selectionRect.style.left = startX + 'px';
    selectionRect.style.top = startY + 'px';
    selectionRect.style.width = '0px';
    selectionRect.style.height = '0px';
    selectionRect.style.display = 'block';
  }

  function onMouseMove(e) {
    if (!selectionRect || selectionRect.style.display === 'none') return;
    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    selectionRect.style.left = x + 'px';
    selectionRect.style.top = y + 'px';
    selectionRect.style.width = w + 'px';
    selectionRect.style.height = h + 'px';
  }

  function onMouseUp(e) {
    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);

    exitSelectionMode();

    // Ignore tiny selections
    if (w < 5 || h < 5) return;

    lastRect = { x, y, width: w, height: h };

    chrome.runtime.sendMessage({
      action: 'capture-and-ocr',
      rect: {
        x,
        y,
        width: w,
        height: h,
        devicePixelRatio: window.devicePixelRatio
      }
    });

    // Show loading bubble immediately
    showBubble({ word: '...', translation: 'Recognizing...', loading: true });
  }

  // === Floating Bubble ===
  function showBubble(data) {
    removeBubble();

    const bubble = document.createElement('div');
    bubble.className = 'snapword-bubble';

    // Position near the selection area
    if (lastRect) {
      bubble.style.left = Math.min(lastRect.x + lastRect.width + 10, window.innerWidth - 320) + 'px';
      bubble.style.top = Math.max(lastRect.y, 10) + 'px';
    } else {
      bubble.style.right = '20px';
      bubble.style.top = '20px';
    }

    const wordEl = document.createElement('div');
    wordEl.className = 'snapword-bubble-word';
    wordEl.textContent = data.word || '';

    const translationEl = document.createElement('div');
    translationEl.className = 'snapword-bubble-translation';
    translationEl.textContent = data.translation || '';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'snapword-bubble-close';
    closeBtn.textContent = '\u00d7';
    closeBtn.addEventListener('click', removeBubble);

    bubble.appendChild(closeBtn);
    bubble.appendChild(wordEl);
    bubble.appendChild(translationEl);

    if (data.loading) {
      const spinner = document.createElement('div');
      spinner.className = 'snapword-bubble-spinner';
      bubble.appendChild(spinner);
    }

    if (!data.loading && !data.error && data.word) {
      const saveBtn = document.createElement('button');
      saveBtn.className = 'snapword-bubble-save';
      saveBtn.textContent = 'Save';
      saveBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({
          action: 'save-word',
          data: {
            word: data.word,
            translation: data.translation,
            pos: data.pos,
            example: data.example,
            exampleCn: data.exampleCn
          }
        });
        saveBtn.textContent = 'Saved!';
        saveBtn.disabled = true;
      });
      bubble.appendChild(saveBtn);
    }

    document.body.appendChild(bubble);
    currentBubble = bubble;

    // Auto-dismiss after 15 seconds (longer if still loading)
    clearTimeout(bubbleTimeout);
    bubbleTimeout = setTimeout(removeBubble, data.loading ? 30000 : 15000);
  }

  function removeBubble() {
    clearTimeout(bubbleTimeout);
    if (currentBubble) {
      currentBubble.remove();
      currentBubble = null;
    }
  }
})();
