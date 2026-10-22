(() => {
  if (customElements.get('product-setup')) return;

  /* "Complete your setup" bundle box: adds the product and its checked companions in one cart request */
  class ProductSetup extends HTMLElement {
    connectedCallback() {
      this.onChange = this.onChange.bind(this);
      this.onClick = this.onClick.bind(this);
      this.onVariantChange = this.onVariantChange.bind(this);
      this.addEventListener('change', this.onChange);
      this.addEventListener('click', this.onClick);
      document.addEventListener('change', this.onVariantChange);

      if (this.dataset.url && !this.querySelector('.section')) {
        this.observeAndLoad();
      } else {
        this.refresh();
      }
    }

    disconnectedCallback() {
      this.removeEventListener('change', this.onChange);
      this.removeEventListener('click', this.onClick);
      document.removeEventListener('change', this.onVariantChange);
      this.observer?.disconnect();
      this.controller?.abort();
    }

    observeAndLoad() {
      if ('IntersectionObserver' in window) {
        this.observer = new IntersectionObserver(
          ([entry]) => {
            if (!entry.isIntersecting) return;
            this.observer.disconnect();
            this.load();
          },
          { rootMargin: '300px' },
        );
        this.observer.observe(this);
      } else {
        this.load();
      }
    }

    async load() {
      this.controller = new AbortController();
      try {
        const response = await fetch(this.dataset.url, { signal: this.controller.signal });
        if (!response.ok) return;
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        const incoming = doc.querySelector('product-setup');
        // An empty response (no complementary products) leaves the section hidden.
        if (incoming && incoming.innerHTML.trim()) {
          this.innerHTML = incoming.innerHTML;
          this.refresh();
        }
      } catch (error) {
        if (error.name !== 'AbortError') this.replaceChildren();
      }
    }

    get items() {
      return Array.from(this.querySelectorAll('[data-setup-item]'));
    }

    /* The current product row follows the variant chosen in the main product form */
    currentVariant(item) {
      const variants = item.dataset.variants ? JSON.parse(item.dataset.variants) : null;
      if (!variants) return { id: item.dataset.variantId, cents: Number(item.dataset.priceCents), available: true };

      const input = document.querySelector('product-form input[name="id"]');
      const id = input && input.value && variants[input.value] ? input.value : item.dataset.variantId;
      const variant = variants[id] || {};
      return { id, cents: Number(variant.cents), money: variant.money, available: variant.available !== false };
    }

    selectedItems() {
      const selected = [];
      let currentAvailable = true;
      this.items.forEach((item) => {
        if (!item.dataset.variantId) return;
        const checkbox = item.querySelector('[data-setup-checkbox]');
        if (!checkbox || !checkbox.checked) return;
        if (item.dataset.state === 'current') {
          const current = this.currentVariant(item);
          currentAvailable = current.available;
          selected.push(current);
        } else {
          selected.push({ id: item.dataset.variantId, cents: Number(item.dataset.priceCents) });
        }
      });
      return { selected, currentAvailable };
    }

    formatMoney(cents) {
      const currency = this.dataset.currency;
      const locale = document.documentElement.lang || undefined;
      try {
        return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
      } catch (error) {
        return (cents / 100).toFixed(2);
      }
    }

    refresh() {
      const currentItem = this.querySelector('[data-state="current"]');
      const priceElement = currentItem?.querySelector('[data-setup-current-price]');
      if (currentItem && priceElement) {
        const current = this.currentVariant(currentItem);
        if (current.money) priceElement.textContent = current.money;
      }

      const { selected, currentAvailable } = this.selectedItems();
      const total = selected.reduce((sum, item) => sum + (item.cents || 0), 0);
      const totalElement = this.querySelector('[data-setup-total]');
      if (totalElement) totalElement.textContent = this.formatMoney(total);

      const button = this.querySelector('[data-setup-add]');
      if (button) {
        if (currentAvailable) button.removeAttribute('aria-disabled');
        else button.setAttribute('aria-disabled', 'true');
      }
    }

    onChange(event) {
      if (event.target.closest('[data-setup-checkbox]')) this.refresh();
    }

    onVariantChange(event) {
      if (event.target.matches?.('product-form input[name="id"]')) this.refresh();
    }

    onClick(event) {
      const button = event.target.closest('[data-setup-add]');
      if (button) this.addAll(button);
    }

    showStatus(message, state) {
      const status = this.querySelector('[data-setup-status]');
      if (!status) return;
      status.hidden = !message;
      status.dataset.state = state || '';
      status.textContent = '';
      // Clearing first makes screen readers announce repeated identical messages
      window.setTimeout(() => {
        status.textContent = message;
      }, 50);
    }

    async addAll(button) {
      const siteTheme = window.theme || { routes: {}, strings: {} };
      if (button.getAttribute('aria-disabled') === 'true' || !siteTheme.routes.cart_add) return;

      const { selected } = this.selectedItems();
      if (!selected.length) return;

      button.setAttribute('aria-disabled', 'true');
      this.showStatus('');

      try {
        const response = await fetch(`${siteTheme.routes.cart_add}.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ items: selected.map((item) => ({ id: Number(item.id), quantity: 1 })) }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.description || data.message || siteTheme.strings.cart_error);

        const cart = window.GameShopCart;
        if (cart) {
          cart.setCount(await cart.fetchCount());
          await cart.refreshDrawer();
        }
        this.showStatus(siteTheme.strings.added_to_cart, 'success');

        const drawer = document.querySelector('cart-drawer');
        if (siteTheme.cartType === 'drawer' && drawer && typeof drawer.open === 'function') {
          drawer.open();
        } else if (siteTheme.cartType !== 'drawer') {
          window.location.href = siteTheme.routes.cart;
          return;
        }
      } catch (error) {
        this.showStatus(error.message || siteTheme.strings.cart_error, 'error');
      }
      this.refresh();
    }
  }

  customElements.define('product-setup', ProductSetup);
})();
