/* Customer addresses: country/province selects (Shopify-hosted shopify_common.js), delete confirmation, and reopening forms with errors. */
document.addEventListener('DOMContentLoaded', () => {
  if (window.Shopify && window.Shopify.CountryProvinceSelector) {
    document.querySelectorAll('[data-country-select]').forEach((country) => {
      const suffix = country.id.replace('address-country-', '');
      new window.Shopify.CountryProvinceSelector(country.id, `address-province-${suffix}`, {
        hideElement: `address-province-container-${suffix}`,
      });
    });
  }

  document.querySelectorAll('details:has(.form-message--error)').forEach((details) => {
    details.open = true;
  });

  document.addEventListener('submit', (event) => {
    const message = event.target.dataset ? event.target.dataset.confirm : null;
    if (message && !window.confirm(message)) event.preventDefault();
  });
});
