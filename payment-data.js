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

  function labeledLine(text, labels) {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const pattern = new RegExp(`^(?:${labels})\\s*[:#-]?\\s*(.*)$`, 'i');
    for (let index = 0; index < lines.length; index++) {
      const match = lines[index].match(pattern);
      if (match) return match[1].trim() || lines[index + 1] || null;
    }
    return null;
  }

  function parseDate(dateValue, timeValue) {
    const isoDate = dateValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    const localDate = dateValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    const dayFirstMonthName = dateValue.match(/^(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})$/);
    const monthFirstName = dateValue.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const namedDate = dayFirstMonthName || monthFirstName;
    if (!isoDate && !localDate && !namedDate) return new Date(NaN);

    let year;
    let month;
    let day;
    if (isoDate) {
      year = Number(isoDate[1]);
      month = Number(isoDate[2]);
      day = Number(isoDate[3]);
    } else if (localDate) {
      year = Number(localDate[3].length === 2 ? `20${localDate[3]}` : localDate[3]);
      month = Number(localDate[2]);
      day = Number(localDate[1]);
    } else {
      const monthName = dayFirstMonthName ? dayFirstMonthName[2] : monthFirstName[1];
      month = monthNames.findIndex(name => name === monthName.slice(0, 3).toLowerCase()) + 1;
      year = Number(dayFirstMonthName ? dayFirstMonthName[3] : monthFirstName[3]);
      day = Number(dayFirstMonthName ? dayFirstMonthName[1] : monthFirstName[2]);
    }
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
      /\b(?:amount|total|paid|received|sent)\b[^\r\n\d₹]{0,20}(?:₹|\bINR\b|\bRs\.?)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i
    ) || capture(
      text,
      /\b(?:amount|total)\b\s*:?\s*\r?\n\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i
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
      /\b(?:UPI\s*)?(?:transaction|txn|reference|ref(?:erence)?|UTR|RRN)\.?\s*(?:ID|No\.?|number)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9/-]{5,29})/i
    );
    const date = capture(
      text,
      /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+[A-Za-z]{3,9},?\s+\d{4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\b/i
    );
    const time = capture(
      text,
      /\b(?:0?[1-9]|1[0-2])[:.][0-5]\d(?:[:.][0-5]\d)?\s?(?:AM|PM)\b|\b(?:[01]?\d|2[0-3]):[0-5]\d(?:[:.][0-5]\d)?\b/i
    );
    const sender = labeledLine(text, 'paid\\s+by|received\\s+from|sent\\s+by|sender|from');
    const recipient = labeledLine(text, 'paid\\s+to|sent\\s+to|received\\s+by|recipient|beneficiary|payee|to');
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
