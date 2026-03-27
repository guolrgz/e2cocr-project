// Direct worker entry point for Chrome extension context.
// Tesseract.js's blob URL approach doesn't work in MV3 extensions.
//
// Also patch importScripts: full chrome-extension:// URLs fail in workers
// but relative paths work. Convert any chrome-extension:// URL to relative.
(function () {
  const nativeImportScripts = self.importScripts;
  const extOrigin = self.location.origin + '/';
  self.importScripts = function (...urls) {
    const fixed = urls.map(function (url) {
      url = String(url);
      if (url.startsWith(extOrigin)) {
        return url.slice(extOrigin.length);
      }
      return url;
    });
    return nativeImportScripts.apply(self, fixed);
  };
})();

importScripts('lib/worker.min.js');
