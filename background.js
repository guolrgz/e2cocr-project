// SnapWord - Background Service Worker

let offscreenCreated = false;

// === Context Menu Setup ===
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'snapword-ocr',
    title: 'SnapWord: OCR this area',
    contexts: ['page', 'image']
  });
});

// === Keyboard Shortcut ===
chrome.commands.onCommand.addListener((command) => {
  if (command === 'trigger-ocr') {
    sendToActiveTab({ action: 'start-ocr-selection' });
  }
});

// === Context Menu Click ===
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'snapword-ocr') {
    chrome.tabs.sendMessage(tab.id, { action: 'start-ocr-selection' });
  }
});

// === Message Handler ===
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'capture-and-ocr') {
    handleCaptureAndOCR(msg.rect, sender.tab.id);
    return false;
  }
  if (msg.action === 'save-word') {
    saveWord(msg.data).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.action === 'ocr-result-from-offscreen') {
    // Forwarded from offscreen — not used directly here
    return false;
  }
});

// === Screenshot Capture + OCR Flow ===
async function handleCaptureAndOCR(rect, tabId) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    await ensureOffscreenDocument();

    // Send to offscreen for crop + OCR
    const ocrText = await sendToOffscreen({
      action: 'perform-ocr',
      target: 'offscreen',
      dataUrl,
      rect
    });

    const word = (ocrText || '').trim();
    if (!word) {
      chrome.tabs.sendMessage(tabId, {
        action: 'ocr-result',
        data: { word: '', translation: 'No text detected', loading: false, error: true }
      });
      return;
    }

    // Send preliminary result with loading state
    chrome.tabs.sendMessage(tabId, {
      action: 'ocr-result',
      data: { word, translation: 'Translating...', loading: true }
    });

    // Call Claude API
    const details = await callClaudeAPI(word);

    // Send full result
    chrome.tabs.sendMessage(tabId, {
      action: 'ocr-result',
      data: { ...details, loading: false }
    });
  } catch (err) {
    console.error('SnapWord capture error:', err);
    chrome.tabs.sendMessage(tabId, {
      action: 'ocr-result',
      data: { word: '', translation: 'Error: ' + err.message, loading: false, error: true }
    });
  }
}

// === Offscreen Document Management ===
async function ensureOffscreenDocument() {
  if (offscreenCreated) return;
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  if (existingContexts.length > 0) {
    offscreenCreated = true;
    return;
  }
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['WORKERS'],
    justification: 'Run Tesseract.js OCR worker'
  });
  offscreenCreated = true;
}

function sendToOffscreen(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// === Claude API ===
async function callClaudeAPI(englishText) {
  const { apiKey } = await chrome.storage.local.get('apiKey');
  if (!apiKey) {
    return {
      word: englishText,
      translation: '(Please set API key in Settings)',
      pos: '',
      example: '',
      exampleCn: ''
    };
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `For the English word or phrase "${englishText}", provide a JSON response with these fields:
- "word": the English word/phrase (cleaned up if needed)
- "translation": Chinese translation (Simplified Chinese)
- "pos": part of speech in English (e.g. "noun", "verb", "adjective")
- "example": an example sentence in English using this word
- "exampleCn": Simplified Chinese translation of the example sentence
Respond ONLY with valid JSON, no markdown fences or extra text.`
      }]
    })
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 401) throw new Error('Invalid API key');
    if (status === 429) throw new Error('Rate limited, try again later');
    throw new Error(`API error (${status})`);
  }

  const data = await response.json();
  const text = data.content[0].text;
  try {
    return JSON.parse(text);
  } catch {
    return {
      word: englishText,
      translation: text,
      pos: '',
      example: '',
      exampleCn: ''
    };
  }
}

// === Save Word to Storage ===
async function saveWord(wordData) {
  const { words = [] } = await chrome.storage.local.get('words');

  // Check for duplicate (case-insensitive)
  const exists = words.some(
    (w) => w.word.toLowerCase() === wordData.word.toLowerCase()
  );
  if (exists) return;

  const entry = {
    id: Date.now().toString(),
    word: wordData.word,
    translation: wordData.translation,
    pos: wordData.pos || '',
    example: wordData.example || '',
    exampleCn: wordData.exampleCn || '',
    pinned: false,
    createdAt: Date.now()
  };
  words.unshift(entry);
  await chrome.storage.local.set({ words });
}

// === Utility ===
function sendToActiveTab(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab) {
      chrome.tabs.sendMessage(tab.id, message);
    }
  });
}
