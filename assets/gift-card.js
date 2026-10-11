/* Gift card page: renders the QR code with Shopify's hosted qrcode.js and enables the print button. */
document.addEventListener('DOMContentLoaded', () => {
  const qr = document.getElementById('qr-code');
  if (qr && qr.dataset.qrText && typeof window.QRCode === 'function') {
    new window.QRCode(qr, { text: qr.dataset.qrText, width: 120, height: 120 });
  }

  const printButton = document.querySelector('[data-print]');
  if (printButton) {
    printButton.hidden = false;
    printButton.addEventListener('click', () => window.print());
  }
});
