(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.PaymentData = api;
  }
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  function capture(text, pattern) {
    const match = text.match(pattern);
    return match ? (match[1] || match[0]).trim().replace(/[.,;:]+$/, '') : null;
  }

  function parseDate(dateValue, timeValue) {
    const isoDate = dateValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    const localDate = dateValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (!isoDate && !localDate) return new Date(NaN);

    const year = isoDate
      ? Number(isoDate[1])
      : Number(localDate[3].length === 2 ? `20${localDate[3]}` : localDate[3]);
    const month = Number(isoDate ? isoDate[2] : localDate[2]);
    const day = Number(isoDate ? isoDate[3] : localDate[1]);
    const time = String(timeValue || '').match(/^(\d{1,2})[:.](\d{2})(?:[:.]\d{2})?\s*(AM|PM)?$/i);
    let hour = time ? Number(time[1]) : 0;
    const minute = time ? Number(time[2]) : 0;

    if (time && time[3]) {
      hour = (hour % 12) + (time[3].toUpperCase() === 'PM' ? 12 : 0);
    }

    const parsed = new Date(year, month - 1, day, hour, minute);
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day ||
      hour > 23 ||
      minute > 59
    ) {
      return new Date(NaN);
    }
    return parsed;
  }

  function extractPaymentData(value) {
    const text = String(value || '');
    const labeledAmount = capture(
      text,
      /\b(?:amount|total)\b[^\d₹]{0,20}(?:₹|INR|Rs\.?)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i
    );
    const currencyAmount = capture(
      text,
      /(?:₹|\bINR\b|\bRs\.?)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i
    );
    const amountValue = labeledAmount || currencyAmount;
    const normalizedAmount = amountValue ? amountValue.replace(/,/g, '') : '';
    const amountParts = normalizedAmount.split('.');
    const amountNumber = amountValue ? Number(amountParts[0]) : NaN;
    const transactionId = capture(
      text,
      /\b(?:UPI\s*)?(?:transaction|txn|reference|ref(?:erence)?|UTR)\s*(?:ID|No\.?|number)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9/-]{5,29})/i
    );
    const date = capture(
      text,
      /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b/
    );
    const time = capture(
      text,
      /\b(?:0?[1-9]|1[0-2])[:.][0-5]\d(?:[:.][0-5]\d)?\s?(?:AM|PM)\b|\b(?:[01]?\d|2[0-3]):[0-5]\d(?:[:.][0-5]\d)?\b/i
    );
    const sender = capture(
      text,
      /\b(?:paid\s+by|received\s+from|sent\s+by|sender)\b\s*[:#-]?\s*([^\r\n]+)/i
    );
    const recipient = capture(
      text,
      /\b(?:paid\s+to|sent\s+to|received\s+by|recipient)\b\s*[:#-]?\s*([^\r\n]+)/i
    );
    const status = /\b(failed|declined|pending|processing)\b/i.test(text)
      ? 'Failure or pending wording found (not verified)'
      : /\b(successful|success|paid|completed|credited)\b/i.test(text)
        ? 'Success wording found (not proof of payment)'
        : 'Not detected';
    const app = /google\s*pay|gpay/i.test(text)
      ? 'Google Pay'
      : /phone\s*pe/i.test(text)
        ? 'PhonePe'
        : /\bpaytm\b/i.test(text)
          ? 'Paytm'
          : null;

    return {
      amount: Number.isFinite(amountNumber)
        ? `₹${amountNumber.toLocaleString('en-IN')}${amountParts.length > 1 ? `.${amountParts[1]}` : ''}`
        : null,
      transactionId: transactionId ? transactionId.toUpperCase() : null,
      date,
      time,
      sender,
      recipient,
      status,
      app
    };
  }

  return { extractPaymentData, parseDate };
});
