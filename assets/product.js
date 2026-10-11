/*
 * Product page behaviour: variant switching, media gallery, tabs, sharing and gift card recipient fields.
 * Every feature is a custom element, so it keeps working after theme-editor section reloads.
 */

(() => {
  if (customElements.get('product-form')) return;

  /* ---------- Variant switching ---------- */

  /*
   * Wraps the product information column. When an option changes it re-fetches the section for the new variant
   * (Section Rendering API) and swaps every [data-update] region, so prices, unit prices, sold-out states,
   * pickup availability and option availability always come from Liquid.
   */
  class ProductForm extends HTMLElement {
    constructor() {
      super();
      this.onChange = this.onChange.bind(this);
    }

    connectedCallback() {
      this.sectionId = this.dataset.sectionId;
      this.addEventListener('change', this.onChange);
      this.initStickyBar();
    }

    disconnectedCallback() {
      this.removeEventListener('change', this.onChange);
      this.controller?.abort();
      this.observer?.disconnect();
    }

    onChange(event) {
      const target = event.target;
      if (!target.closest('[data-variant-picker]')) return;

      const chosen = target.tagName === 'SELECT' ? target.selectedOptions[0] : target;
      const variantId = chosen?.dataset.variantId || '';
      const optionValueIds = [
        ...this.querySelectorAll('[data-variant-picker] input:checked, [data-variant-picker] option:checked'),
      ]
        .map((input) => input.dataset.optionValueId)
        .filter(Boolean);

      if (chosen?.dataset.mediaId) {
        this.dispatchVariantChange(chosen.dataset.mediaId);
      }

      this.update(variantId ? { variant: variantId } : { option_values: optionValueIds.join(',') });
    }

    async update(params) {
      this.controller?.abort();
      this.controller = new AbortController();
      this.setAttribute('aria-busy', 'true');

      const url = new URL(this.dataset.url, window.location.origin);
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
      });
      url.searchParams.set('section_id', this.sectionId);

      try {
        const response = await fetch(url, { signal: this.controller.signal });
        if (!response.ok) throw new Error(response.statusText);
        this.render(await response.text(), params);
      } catch (error) {
        if (error.name !== 'AbortError') console.error(error); // eslint-disable-line no-console
      } finally {
        if (!this.controller.signal.aborted) this.removeAttribute('aria-busy');
      }
    }

    render(html, params) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const source = [...doc.querySelectorAll('product-form')].find(
        (element) => element.dataset.sectionId === this.sectionId,
      );
      if (!source) return;

      const focusedId = this.contains(document.activeElement) ? document.activeElement.id : '';
      const checkedPlan = this.querySelector('input[name="selling_plan"]:checked')?.value;
      const incoming = [...source.querySelectorAll('[data-update]')];

      this.querySelectorAll('[data-update]').forEach((region) => {
        const next = incoming.find((element) => element.dataset.update === region.dataset.update);
        if (next) region.innerHTML = next.innerHTML;
      });

      if (checkedPlan !== undefined) {
        const plan = this.querySelector(`input[name="selling_plan"][value="${CSS.escape(checkedPlan)}"]`);
        if (plan) plan.checked = true;
      }
      if (focusedId) document.getElementById(focusedId)?.focus();

      this.applyState(source.querySelector('[data-variant-state]'), params);
    }

    applyState(state, params) {
      const variantId = state?.dataset.variantId || params.variant || '';
      const available = state?.dataset.available === 'true';

      const idInput = this.querySelector('form input[name="id"]');
      if (idInput) {
        idInput.disabled = !variantId;
        if (variantId && idInput.value !== variantId) {
          idInput.value = variantId;
          idInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      this.querySelectorAll('[data-payment-button], [data-quantity-wrapper]').forEach((element) => {
        element.hidden = !available;
      });

      const quantity = this.querySelector('input[name="quantity"]');
      if (quantity && state) {
        const { quantityMin, quantityMax, quantityStep } = state.dataset;
        quantity.min = quantityMin || 1;
        quantity.step = quantityStep || 1;
        if (quantityMax) quantity.max = quantityMax;
        else quantity.removeAttribute('max');
        const min = Number(quantity.min);
        const max = quantity.max ? Number(quantity.max) : Infinity;
        quantity.value = Math.min(max, Math.max(min, Number(quantity.value) || min));
        this.querySelectorAll('quantity-input button[data-step]').forEach((button) => {
          const sign = Number(button.dataset.step) < 0 ? -1 : 1;
          button.dataset.step = sign * Number(quantity.step);
        });
      }

      if (state?.dataset.mediaId) this.dispatchVariantChange(state.dataset.mediaId);

      if (this.dataset.updateUrl === 'true') {
        const url = new URL(window.location.href);
        if (variantId) url.searchParams.set('variant', variantId);
        else url.searchParams.delete('variant');
        window.history.replaceState({}, '', url);
      }

      if (state?.dataset.announce && typeof announce === 'function') announce(state.dataset.announce);
    }

    dispatchVariantChange(mediaId) {
      document.dispatchEvent(
        new CustomEvent('product:variant-change', { detail: { sectionId: this.sectionId, mediaId } }),
      );
    }

    /* Mobile bar with Add to cart, shown once the main button has scrolled out of view */
    initStickyBar() {
      const bar = this.querySelector('[data-sticky-bar]');
      const target = this.querySelector('[data-buy-buttons-target]');
      if (!bar || !target || !('IntersectionObserver' in window)) return;

      this.observer = new IntersectionObserver(([entry]) => {
        bar.hidden = entry.isIntersecting || entry.boundingClientRect.top > 0;
      });
      this.observer.observe(target);
    }
  }
  customElements.define('product-form', ProductForm);

  /* ---------- Media gallery ---------- */

  class ProductGallery extends HTMLElement {
    constructor() {
      super();
      this.onVariantChange = this.onVariantChange.bind(this);
    }

    connectedCallback() {
      this.items = [...this.querySelectorAll('.product-gallery__item[data-media-id]')];
      this.thumbs = [...this.querySelectorAll('.product-gallery__thumb')];
      this.status = this.querySelector('[data-gallery-status]');
      this.list = this.querySelector('.product-gallery__list');

      this.querySelector('[data-gallery-previous]')?.addEventListener('click', () => this.step(-1));
      this.querySelector('[data-gallery-next]')?.addEventListener('click', () => this.step(1));

      this.thumbs.forEach((thumb) => {
        thumb.addEventListener('click', () => this.show(thumb.dataset.mediaId));
        thumb.addEventListener('keydown', (event) => this.onThumbKeydown(event));
      });

      this.initSwipe();
      document.addEventListener('product:variant-change', this.onVariantChange);

      const current = this.items.find((item) => !item.hidden);
      if (current) this.prepare(current);
    }

    disconnectedCallback() {
      document.removeEventListener('product:variant-change', this.onVariantChange);
    }

    onVariantChange(event) {
      if (event.detail.sectionId !== this.dataset.sectionId) return;
      this.show(event.detail.mediaId, { announce: false });
    }

    get currentIndex() {
      return Math.max(
        0,
        this.items.findIndex((item) => !item.hidden),
      );
    }

    step(direction) {
      const total = this.items.length;
      if (total < 2) return;
      const next = this.items[(this.currentIndex + direction + total) % total];
      this.show(next.dataset.mediaId);
    }

    show(mediaId, { announce: shouldAnnounce = true } = {}) {
      const id = String(mediaId);
      const target = this.items.find((item) => item.dataset.mediaId === id);
      if (!target || !target.hidden) return;

      this.items.forEach((item) => {
        if (item === target) return;
        if (!item.hidden) this.pause(item);
        item.hidden = true;
      });
      target.hidden = false;
      this.prepare(target);

      this.thumbs.forEach((thumb) => {
        if (thumb.dataset.mediaId === id) {
          thumb.setAttribute('aria-current', 'true');
          this.revealThumb(thumb);
        } else {
          thumb.removeAttribute('aria-current');
        }
      });

      if (shouldAnnounce && this.status) {
        this.status.textContent = (this.dataset.positionLabel || '')
          .replace('[position]', this.currentIndex + 1)
          .replace('[total]', this.items.length);
      }
    }

    revealThumb(thumb) {
      const container = thumb.closest('.product-gallery__thumb-list');
      if (!container) return;
      const box = container.getBoundingClientRect();
      const rect = thumb.getBoundingClientRect();
      if (rect.left < box.left) container.scrollLeft -= box.left - rect.left;
      else if (rect.right > box.right) container.scrollLeft += rect.right - box.right;
      if (rect.top < box.top) container.scrollTop -= box.top - rect.top;
      else if (rect.bottom > box.bottom) container.scrollTop += rect.bottom - box.bottom;
    }

    onThumbKeydown(event) {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      let index = this.thumbs.indexOf(event.currentTarget);
      if (event.key in keys) index = (index + keys[event.key] + this.thumbs.length) % this.thumbs.length;
      else if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = this.thumbs.length - 1;
      else return;

      event.preventDefault();
      this.thumbs[index].focus();
      this.show(this.thumbs[index].dataset.mediaId);
    }

    initSwipe() {
      if (!this.list || this.items.length < 2) return;
      let startX = 0;
      let startY = 0;
      this.list.addEventListener(
        'touchstart',
        (event) => {
          startX = event.changedTouches[0].clientX;
          startY = event.changedTouches[0].clientY;
        },
        { passive: true },
      );
      this.list.addEventListener(
        'touchend',
        (event) => {
          if (event.target.closest('model-viewer, iframe, video')) return;
          const deltaX = event.changedTouches[0].clientX - startX;
          const deltaY = event.changedTouches[0].clientY - startY;
          if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return;
          const rtl = getComputedStyle(this).direction === 'rtl';
          this.step(deltaX < 0 !== rtl ? 1 : -1);
        },
        { passive: true },
      );
    }

    pause(item) {
      item.querySelector('video')?.pause();
      const frame = item.querySelector('iframe');
      if (frame && frame.src) frame.src = frame.src; // eslint-disable-line no-self-assign
    }

    /* Starts the Shopify-hosted 3D viewer controls the first time a model is shown */
    prepare(item) {
      if (item.dataset.mediaType !== 'model') return;
      const viewer = item.querySelector('model-viewer');
      if (!viewer || viewer.dataset.uiReady || !window.Shopify?.loadFeatures) return;
      viewer.dataset.uiReady = 'true';
      window.Shopify.loadFeatures([
        {
          name: 'model-viewer-ui',
          version: '1.0',
          onLoad: (errors) => {
            if (!errors && window.Shopify.ModelViewerUI) new window.Shopify.ModelViewerUI(viewer);
          },
        },
      ]);
    }
  }
  customElements.define('product-gallery', ProductGallery);

  /* ---------- Tabs ---------- */

  class ProductTabs extends HTMLElement {
    constructor() {
      super();
      this.onDocumentClick = this.onDocumentClick.bind(this);
    }

    connectedCallback() {
      this.list = this.querySelector('[data-tab-list]');
      if (!this.list) return;
      this.tabs = [...this.list.querySelectorAll('[role="tab"]')];
      this.panels = this.tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));

      this.list.hidden = false;
      this.activate(
        Math.max(
          0,
          this.tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true'),
        ),
      );

      this.tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => this.activate(index));
        tab.addEventListener('keydown', (event) => this.onKeydown(event, index));
      });

      document.addEventListener('click', this.onDocumentClick);
      this.revealHash();
    }

    disconnectedCallback() {
      document.removeEventListener('click', this.onDocumentClick);
    }

    activate(index, { focus = false } = {}) {
      this.tabs.forEach((tab, tabIndex) => {
        const selected = tabIndex === index;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        if (this.panels[tabIndex]) this.panels[tabIndex].hidden = !selected;
      });
      if (focus) this.tabs[index].focus();
    }

    onKeydown(event, index) {
      const last = this.tabs.length - 1;
      const rtl = getComputedStyle(this).direction === 'rtl';
      const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
      const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
      let next = index;
      if (event.key === forward) next = index === last ? 0 : index + 1;
      else if (event.key === backward) next = index === 0 ? last : index - 1;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = last;
      else return;
      event.preventDefault();
      this.activate(next, { focus: true });
    }

    /* In-page links such as the rating's #reviews link open the tab that owns the target panel */
    onDocumentClick(event) {
      const link = event.target.closest('a[href^="#"]');
      if (!link || link.hash.length < 2) return;
      if (this.openPanel(link.hash.slice(1))) event.preventDefault();
    }

    revealHash() {
      if (window.location.hash.length > 1) this.openPanel(window.location.hash.slice(1));
    }

    openPanel(id) {
      const index = this.panels.findIndex((panel) => panel?.id === id);
      if (index < 0) return false;
      this.activate(index);
      this.panels[index].scrollIntoView({ block: 'start' });
      return true;
    }
  }
  customElements.define('product-tabs', ProductTabs);

  /* ---------- Share ---------- */

  class ShareButton extends HTMLElement {
    connectedCallback() {
      const copy = this.querySelector('[data-share-copy]');
      const share = this.querySelector('[data-share-native]');
      this.status = this.querySelector('[data-share-status]');

      const canCopy = Boolean(navigator.clipboard?.writeText);
      const canShare = typeof navigator.share === 'function';
      if (copy) copy.hidden = !canCopy;
      if (share) share.hidden = !canShare;
      this.hidden = !(canCopy || canShare);

      copy?.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          this.setStatus(this.dataset.copied);
        } catch (error) {
          this.setStatus('');
        }
      });

      share?.addEventListener('click', async () => {
        try {
          await navigator.share({ title: this.dataset.title, url: window.location.href });
        } catch (error) {
          // The shopper closed the share sheet.
        }
      });
    }

    setStatus(message) {
      if (!this.status) return;
      this.status.textContent = message;
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(() => {
        this.status.textContent = '';
      }, 3000);
    }
  }
  customElements.define('share-button', ShareButton);

  /* ---------- Gift card recipient fields ---------- */

  class RecipientForm extends HTMLElement {
    connectedCallback() {
      this.toggle = this.querySelector('[data-recipient-toggle]');
      this.fields = this.querySelector('[data-recipient-fields]');
      this.offset = this.querySelector('[data-recipient-offset]');
      if (!this.toggle || !this.fields) return;

      this.toggle.addEventListener('change', () => this.sync());
      this.sync();
    }

    /* Fields are disabled while the checkbox is off, so nothing is sent unless the shopper wants a recipient */
    sync() {
      const enabled = this.toggle.checked;
      this.fields.hidden = !enabled;
      this.fields.querySelectorAll('input, textarea').forEach((field) => {
        field.disabled = !enabled;
      });
      if (this.offset) this.offset.value = enabled ? String(new Date().getTimezoneOffset()) : '';
    }
  }
  customElements.define('recipient-form', RecipientForm);
})();
