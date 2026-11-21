(() => {
  const input = document.getElementById('fileInput');
  const dropzone = document.getElementById('dropzone');
  const scanButton = document.getElementById('scanBtn');
  const ocrText = document.getElementById('ocrText');
  const ocrStatus = document.createElement('div');
  ocrStatus.id = 'ocrStatus';
  ocrStatus.className = 'ocr-status hidden';
  ocrStatus.setAttribute('role', 'status');
  ocrStatus.setAttribute('aria-live', 'polite');
  document.getElementById('previewWrap').after(ocrStatus);

  const detailsPanel = document.createElement('div');
  detailsPanel.className = 'extracted-panel';
  const detailsHeading = document.createElement('div');
  detailsHeading.className = 'extracted-heading';
  const detailsTitle = document.createElement('h3');
  detailsTitle.textContent = 'Extracted payment details';
  const confidenceLabel = document.createElement('span');
  confidenceLabel.id = 'ocrConfidence';
  detailsHeading.append(detailsTitle, confidenceLabel);
  const fieldsContainer = document.createElement('div');
  fieldsContainer.id = 'extractedFields';
  fieldsContainer.className = 'extracted-fields';
  detailsPanel.append(detailsHeading, fieldsContainer);
  const results = document.getElementById('results');
  results.insertBefore(detailsPanel, results.querySelector('.result-grid'));

  document.querySelector('label[for="ocrText"]').textContent = 'OCR TEXT (EDITABLE)';
  document.querySelector('.field-hint').textContent =
    'English OCR runs in your browser. Review or correct the extracted text before scanning; images are not uploaded.';
  ocrText.placeholder = 'Recognized text appears here. Review or edit it before running the checks.';
  let uploadId = 0;
  let ocrLibraryPromise;
  let lastConfidence = null;

  function setStatus(message, state) {
    ocrStatus.textContent = message;
    ocrStatus.dataset.state = state;
    ocrStatus.classList.remove('hidden');
  }

  function renderFields(text) {
    const data = PaymentData.extractPaymentData(text);
    const fields = [
      ['Amount', data.amount],
      ['Transaction / UTR ID', data.transactionId],
      ['Date', data.date],
      ['Time', data.time],
      ['Paid by', data.sender],
      ['Paid to', data.recipient],
      ['Payment wording', data.status],
      ['Detected app', data.app]
    ];

    fieldsContainer.replaceChildren();
    for (const [label, value] of fields) {
      const field = document.createElement('div');
      field.className = 'extracted-field';
      const fieldLabel = document.createElement('span');
      fieldLabel.textContent = label;
      const fieldValue = document.createElement('strong');
      fieldValue.textContent = value || 'Not detected';
      field.append(fieldLabel, fieldValue);
      fieldsContainer.append(field);
    }

    confidenceLabel.textContent = lastConfidence === null
      ? 'OCR confidence unavailable'
      : `OCR confidence: ${lastConfidence}%`;
  }

  function loadOcrLibrary() {
    if (window.Tesseract) {
      return Promise.resolve(window.Tesseract);
    }
    if (!ocrLibraryPromise) {
      ocrLibraryPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
        script.onload = () => {
          if (window.Tesseract) {
            resolve(window.Tesseract);
          } else {
            reject(new Error('The OCR library loaded without its browser API.'));
          }
        };
        script.onerror = () => reject(new Error('Could not load the OCR library. Check your internet connection.'));
        document.head.append(script);
      });
    }
    return ocrLibraryPromise;
  }

  function isSupportedImage(file) {
    return file && /^image\/(png|jpeg|webp)$/.test(file.type) && file.size <= 12 * 1024 * 1024;
  }

  async function recognizeImage(file, id) {
    const tesseract = await loadOcrLibrary();
    if (id !== uploadId) return;

    setStatus('Loading English OCR data on this device…', 'loading');
    const result = await tesseract.recognize(file, 'eng', {
      logger(message) {
        if (id !== uploadId) return;
        if (message.status === 'recognizing text') {
          const progress = Math.round((message.progress || 0) * 100);
          setStatus(`Reading screenshot on this device… ${progress}%`, 'loading');
        }
      }
    });
    if (id !== uploadId) return;

    const text = result.data.text.trim();
    lastConfidence = Number.isFinite(result.data.confidence)
      ? Math.round(result.data.confidence)
      : null;
    ocrText.value = text;
    renderFields(text);
    setStatus(
      text ? 'Text extracted locally. Review it before relying on any result.' : 'No readable text found; image checks will still run.',
      text ? 'success' : 'warning'
    );
    scanButton.disabled = false;
    scanButton.click();
  }

  function startUpload(file) {
    if (!isSupportedImage(file)) return;
    const id = ++uploadId;
    lastConfidence = null;
    ocrText.value = '';
    document.getElementById('results').classList.add('hidden');
    renderFields('');
    scanButton.disabled = true;
    scanButton.querySelector('span').textContent = 'Reading screenshot…';
    setStatus('Starting on-device OCR… Your image is not uploaded.', 'loading');
    recognizeImage(file, id).catch(error => {
      if (id !== uploadId) return;
      ocrLibraryPromise = null;
      scanButton.disabled = false;
      scanButton.querySelector('span').textContent = 'Run forensic scan';
      setStatus(`${error.message} You can paste text below and run the scan manually.`, 'error');
    });
  }

  input.addEventListener('change', event => startUpload(event.target.files[0]));
  dropzone.addEventListener('drop', event => startUpload(event.dataTransfer.files[0]));
  ocrText.addEventListener('input', () => renderFields(ocrText.value));
  document.getElementById('removeFile').addEventListener('click', () => {
    uploadId++;
    lastConfidence = null;
    ocrStatus.classList.add('hidden');
    scanButton.querySelector('span').textContent = 'Run forensic scan';
    fieldsContainer.replaceChildren();
    confidenceLabel.textContent = '';
    document.getElementById('results').classList.add('hidden');
  });
})();
