// Must load BEFORE tesseract.min.js to intercept Worker constructor.
// Tesseract.js creates workers via blob URLs with importScripts(),
// which fails in Chrome extension context. We redirect to our own
// worker file that runs in the chrome-extension:// origin.
(function () {
  const NativeWorker = window.Worker;
  window.Worker = function (scriptURL, options) {
    const url = (scriptURL || '').toString();
    if (url.startsWith('blob:')) {
      try { URL.revokeObjectURL(url); } catch (e) {}
      return new NativeWorker('ocr-worker.js', options);
    }
    return new NativeWorker(scriptURL, options);
  };
  // Preserve prototype chain
  window.Worker.prototype = NativeWorker.prototype;
})();
