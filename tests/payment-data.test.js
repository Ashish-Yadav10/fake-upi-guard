const test = require('node:test');
const assert = require('node:assert/strict');
const { extractPaymentData, parseDate } = require('../payment-data.js');

test('extracts payment details from OCR text', () => {
  const details = extractPaymentData([
    'Google Pay',
    'Payment successful',
    'Paid to: Ananya Sharma',
    'Paid by: Sample User',
    'Amount: ₹1,250.50',
    'UPI transaction ID: 123456789012',
    'Date: 21/11/2026',
    'Time: 04:32 PM'
  ].join('\n'));

  assert.deepEqual(details, {
    amount: '₹1,250.50',
    transactionId: '123456789012',
    date: '21/11/2026',
    time: '04:32 PM',
    sender: 'Sample User',
    recipient: 'Ananya Sharma',
    status: 'Success wording found (not proof of payment)',
    app: 'Google Pay'
  });
});

test('does not mistake unrelated numbers for a transaction ID', () => {
  const details = extractPaymentData('Paid successfully\nOrder 123456789012');

  assert.equal(details.amount, null);
  assert.equal(details.transactionId, null);
  assert.equal(details.status, 'Success wording found (not proof of payment)');
});

test('does not label pending wording as successful', () => {
  const details = extractPaymentData('Payment pending. Ref: 123456789012');

  assert.equal(details.status, 'Failure or pending wording found (not verified)');
});

test('extracts common UPI receipt labels and written dates', () => {
  const details = extractPaymentData([
    'PhonePe',
    'Paid',
    '₹ 450.00',
    'UPI Ref. No.: ABC123456789',
    'From:',
    'Priya Sharma',
    'To:',
    'Arjun Kumar',
    '21 Nov, 2026',
    '02:52 PM'
  ].join('\n'));

  assert.equal(details.amount, '₹450.00');
  assert.equal(details.transactionId, 'ABC123456789');
  assert.equal(details.date, '21 Nov, 2026');
  assert.equal(details.time, '02:52 PM');
  assert.equal(details.sender, 'Priya Sharma');
  assert.equal(details.recipient, 'Arjun Kumar');
  assert.equal(details.app, 'PhonePe');
});

test('parses Indian date and time formats without treating invalid dates as real', () => {
  const parsed = parseDate('21/11/2026', '04:32 PM');

  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 10);
  assert.equal(parsed.getDate(), 21);
  assert.equal(parsed.getHours(), 16);
  assert.equal(parseDate('Nov 21, 2026', '').getMonth(), 10);
  assert.equal(Number.isNaN(parseDate('31/02/2026', '').getTime()), true);
});
