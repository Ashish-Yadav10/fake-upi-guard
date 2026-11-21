# UPI Guard — Payment Screenshot Forensics (Demo)

A responsive, installable PWA prototype for merchant-side screening of UPI payment screenshots. Includes an animated dashboard, upload/drag-and-drop, app-family selector (Google Pay, PhonePe, Paytm), on-device English OCR, extracted payment fields, local heuristic checks, risk score, result explanations, and local scan history.

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
- `ocr.js` — on-device OCR flow and extracted-field display
- `payment-data.js` — amount, transaction ID, date/time, party, status, and app text parsing
- `manifest.webmanifest` — PWA metadata
- `sw.js` — basic offline asset cache

## Current capabilities and important limitations

This is a front-end proof-of-concept, not a bank-grade fraud detector. English OCR runs in the browser with Tesseract.js after its library and language data are loaded; the screenshot itself is not uploaded. The app shows recognized text and attempts to extract amount, transaction/UTR ID, date/time, sender, recipient, payment wording, and app name. OCR and field extraction can be incomplete or incorrect, especially for blurry, cropped, or non-English screenshots.

The app does **not** authenticate screenshots against official app templates, inspect font glyphs at forensic depth, query NPCI/banks, or prove that funds were credited. Risk scores are weak demo heuristics, not a determination that a payment is genuine or fraudulent. The app-family selector is currently used as a text-hint check; it is not a verified layout classifier. The pixel profile and dimensions are weak signals only.

The app flags transaction IDs repeated in this browser's local scan history and checks pasted date strings for obviously future/old timestamps. Browser history is local to the device and can be cleared.

## Recommended production architecture

1. Android client: Kotlin + CameraX; resize/crop locally and return a result within a strict latency budget.
2. OCR: on-device ML Kit Text Recognition; normalize text, amount, UTR/reference ID and timestamp.
3. Template corpus: collect consented genuine screenshots across app versions, Android versions, display densities and languages; store provenance and hashes. Do not use scraped or edited samples as ground truth.
4. Forensics: app-specific layout anchors, OCR bounding-box alignment, font/rendering feature checks, compression/noise analysis, image-region inconsistency, and calibrated out-of-distribution detection.
5. Transaction checks: merchant-side bank/PSP confirmation or a legitimate payment-provider integration. Never treat screenshot text as proof of settlement.
6. Evaluation: test on unseen devices/app versions; report false-positive and false-negative rates; keep a human-review outcome; avoid automatic rejection based only on model score.

## Privacy

The demo processes image pixels and OCR in the browser and does not upload the screenshot. The first OCR use requires an internet connection to load the OCR library and English language data from their CDN; that provider receives normal asset requests, not the screenshot. Pasted text and scan history remain in browser memory/localStorage. Do not deploy with real customer data until privacy, retention and security requirements are reviewed.
