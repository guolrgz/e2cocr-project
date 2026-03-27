# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SnapWord** is a Chrome extension (Manifest V3) that lets users draw a selection rectangle over any webpage area, runs OCR on it via Tesseract.js, and returns a Simplified Chinese translation with part-of-speech and example sentences powered by the Claude API.

## Loading the Extension

There is no build step. Load directly in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select this project folder
4. After any code change, click the **Reload** button on the extension card

Keyboard shortcut to trigger OCR: `Cmd+Shift+O` (Mac) / `Ctrl+Shift+O` (Windows/Linux)

## Architecture

### Message flow

```
content.js  ──(capture-and-ocr)──►  background.js
                                         │
                              captureVisibleTab()
                                         │
                              ──(perform-ocr)──►  offscreen.js
                                         │         (Tesseract.js crops
                                         │          & recognizes image)
                              ◄──(OCR text)──────
                                         │
                              callClaudeAPI()
                              (Anthropic /v1/messages)
                                         │
                              ──(ocr-result)──►  content.js
                                                  showBubble()
```

### Key files and responsibilities

| File | Role |
|------|------|
| `background.js` | Service worker. Orchestrates the full flow: screenshot → OCR → Claude API → reply to tab. Contains `callClaudeAPI()` with the translation prompt. |
| `content.js` | Injected into every page. Draws the selection overlay, sends `capture-and-ocr`, and renders the floating result bubble. |
| `offscreen.js` | Runs in a hidden offscreen document (`WORKERS` reason). Initializes Tesseract.js eagerly and exposes the `perform-ocr` handler that crops the screenshot and returns text. |
| `worker-patch.js` | Must load **before** `tesseract.min.js`. Intercepts `new Worker(blobUrl)` calls and redirects them to `ocr-worker.js` because blob-URL workers are blocked in MV3 extensions. |
| `ocr-worker.js` | Actual Tesseract worker entry point. Patches `importScripts` to convert absolute `chrome-extension://` URLs to relative paths, then imports `lib/worker.min.js`. |
| `popup.js/html` | Toolbar popup — just opens the Settings or Word List pages. |
| `settings.js/html` | Stores the Anthropic API key into `chrome.storage.local` under the key `apiKey`. |
| `wordlist.js/html` | Reads/writes the `words` array from `chrome.storage.local`. Supports pinning and deletion. |

### Claude API call

`callClaudeAPI()` in `background.js` sends a single prompt requesting a JSON object with fields: `word`, `translation` (Simplified Chinese), `pos`, `example`, `exampleCn`. Model: `claude-sonnet-4-20250514`, `max_tokens: 300`.

### Chrome Extension constraints

- **No `eval` or dynamic code** — `content_security_policy` allows only `'self'` and `'wasm-unsafe-eval'`.
- **Offscreen document** is required because Tesseract.js spawns Workers and uses a `<canvas>` — neither is available in a MV3 service worker.
- The `worker-patch.js` + `ocr-worker.js` pair is the workaround for Tesseract's internal blob-URL worker creation.
- `anthropic-dangerous-direct-browser-access: true` header is required for direct browser → Anthropic API calls.
