// SnapWord - Offscreen Document for Tesseract.js OCR
// Worker constructor is patched in worker-patch.js (loaded before tesseract.min.js)

let worker = null;

async function initTesseract() {
  if (worker) return worker;
  worker = await Tesseract.createWorker('eng', 1, {
    workerPath: chrome.runtime.getURL('lib/worker.min.js'),
    corePath: chrome.runtime.getURL('lib/'),
    langPath: chrome.runtime.getURL('traineddata/'),
    gzip: true
  });
  return worker;
}

// Eagerly initialize Tesseract on load
initTesseract().then(() => {
  console.log('SnapWord: Tesseract.js ready');
}).catch((err) => {
  console.error('SnapWord: Tesseract.js init failed:', err);
});

// Listen for OCR requests
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'perform-ocr' && msg.target === 'offscreen') {
    handleOCR(msg.dataUrl, msg.rect)
      .then((text) => sendResponse(text))
      .catch((err) => {
        console.error('SnapWord OCR error:', err);
        sendResponse('');
      });
    return true; // keep channel open for async
  }
});

async function handleOCR(dataUrl, rect) {
  // Load the full screenshot into an image
  const img = new Image();
  img.src = dataUrl;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  // Crop to the selection rectangle
  const canvas = document.getElementById('crop-canvas');
  const dpr = rect.devicePixelRatio || 1;
  const cx = Math.round(rect.x * dpr);
  const cy = Math.round(rect.y * dpr);
  const cw = Math.round(rect.width * dpr);
  const ch = Math.round(rect.height * dpr);

  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);

  const croppedDataUrl = canvas.toDataURL('image/png');

  // Run OCR
  const w = await initTesseract();
  const { data: { text } } = await w.recognize(croppedDataUrl);
  return text.trim();
}
