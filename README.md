# UPI Guard — Payment Screenshot Forensics (Demo)

A responsive, installable PWA prototype for merchant-side screening of UPI payment screenshots. Includes an animated dashboard, upload/drag-and-drop, app-family selector (Google Pay, PhonePe, Paytm), optional pasted OCR text, local heuristic checks, risk score, result explanations, and local scan history.

## Run locally

Because the app uses a service worker for PWA installation/offline caching, serve it from localhost rather than opening `index.html` directly.

```bash
cd upi-guard
python -m http.server 8080
```

Open http://localhost:8080 in Chrome. On Android, open the same local/deployed HTTPS URL in Chrome and choose **Install app** / **Add to Home screen**.

### Windows

Open the app in Microsoft Edge or Google Chrome, then use the browser install control (**App available** or **Install UPI Guard**). It will open as a standalone desktop app. The layout also scales for common Windows window widths and high-DPI displays.

## Included files

- `index.html` — app structure and dashboard
- `styles.css` — responsive visual design, hover states, transitions, light theme
- `app.js` — upload handling, image sampling, heuristic checks, risk score, local history
- `manifest.webmanifest` — PWA metadata
- `sw.js` — basic offline asset cache

## Current capabilities and important limitations

This is a front-end proof-of-concept, not a bank-grade fraud detector. It does **not** authenticate screenshots against official app templates, inspect font glyphs at forensic depth, perform OCR automatically, query NPCI/banks, or prove that funds were credited. The app-family selector is currently used as a text-hint check when text is pasted; it is not a verified layout classifier. The pixel profile and dimensions are weak signals only. The optional text field accepts OCR output copied from another OCR tool.

The app flags transaction IDs repeated in this browser's local scan history and checks pasted date strings for obviously future/old timestamps. Browser history is local to the device and can be cleared.

## Recommended production architecture

1. Android client: Kotlin + CameraX; resize/crop locally and return a result within a strict latency budget.
2. OCR: on-device ML Kit Text Recognition; normalize text, amount, UTR/reference ID and timestamp.
3. Template corpus: collect consented genuine screenshots across app versions, Android versions, display densities and languages; store provenance and hashes. Do not use scraped or edited samples as ground truth.
4. Forensics: app-specific layout anchors, OCR bounding-box alignment, font/rendering feature checks, compression/noise analysis, image-region inconsistency, and calibrated out-of-distribution detection.
5. Transaction checks: merchant-side bank/PSP confirmation or a legitimate payment-provider integration. Never treat screenshot text as proof of settlement.
6. Evaluation: test on unseen devices/app versions; report false-positive and false-negative rates; keep a human-review outcome; avoid automatic rejection based only on model score.

## Privacy

The demo processes image pixels in the browser and does not upload the screenshot. Pasted text and scan history remain in browser memory/localStorage. Do not deploy with real customer data until privacy, retention and security requirements are reviewed.
