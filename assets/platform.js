/*
 * "My Platform": remembers the shopper's chosen platform in localStorage and exposes it as
 * data-my-platform on <html>. CSS does the rest (chips, tile ordering), so no per-card scripting.
 */
(() => {
  const STORAGE_KEY = 'gs-platform';

  const read = () => {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch (error) {
      return '';
    }
  };

  const write = (value) => {
    try {
      if (value) localStorage.setItem(STORAGE_KEY, value);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      /* Private mode: the choice just won't persist. */
    }
  };

  const apply = (value) => {
    if (value) document.documentElement.setAttribute('data-my-platform', value);
    else document.documentElement.removeAttribute('data-my-platform');
  };

  class PlatformPicker extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;

      this.radios = [...this.querySelectorAll('input[name="my-platform"]')];
      this.label = this.querySelector('[data-platform-label]');

      const saved = read();
      const match = this.radios.find((radio) => radio.value === saved) || this.radios.find((radio) => radio.value === '');
      if (match) match.checked = true;
      this.sync(match, false);

      this.addEventListener('change', (event) => {
        const radio = event.target.closest('input[name="my-platform"]');
        if (!radio) return;
        write(radio.value);
        this.sync(radio, true);
        window.setTimeout(() => this.querySelector('dialog-element')?.close(), 200);
      });
    }

    sync(radio, announceChange) {
      if (!radio) return;
      apply(radio.value);
      if (this.label) this.label.textContent = radio.dataset.platformName;
      if (announceChange) {
        const region = document.querySelector('[data-live-region]');
        if (region) {
          region.textContent = '';
          window.setTimeout(() => {
            region.textContent = radio.value
              ? (window.theme?.strings?.platform_selected || '').replace('__PLATFORM__', radio.dataset.platformName)
              : window.theme?.strings?.platform_cleared || '';
          }, 50);
        }
      }
    }
  }

  if (!customElements.get('platform-picker')) customElements.define('platform-picker', PlatformPicker);
})();
