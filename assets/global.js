/*
 * GameShop global behaviour. Every feature is a custom element or a delegated listener,
 * so nothing breaks on pages that don't contain it and sections work after theme-editor reloads.
 */

const theme = window.theme || { routes: {}, strings: {} };

/* ---------- Helpers ---------- */

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function announce(message) {
  const region = document.querySelector('[data-live-region]');
  if (!region) return;
  region.textContent = '';
  window.setTimeout(() => {
    region.textContent = message;
  }, 50);
}

/* ---------- Cart ---------- */

const Cart = {
  async fetchCount() {
    const response = await fetch(`${theme.routes.cart}.js`, { headers: { Accept: 'application/json' } });
    const cart = await response.json();
    return cart.item_count;
  },

  setCount(count) {
    document.querySelectorAll('[data-cart-count]').forEach((element) => {
      element.textContent = count;
    });
  },

  async refreshDrawer() {
    const drawer = document.querySelector('cart-drawer');
    if (!drawer) return;
    const response = await fetch(`${theme.routes.root}?sections=cart-drawer`);
    const sections = await response.json();
    const html = new DOMParser().parseFromString(sections['cart-drawer'], 'text/html');
    const incoming = html.querySelector('cart-drawer');
    if (incoming) drawer.replaceContent(incoming);
  },

  async add(form) {
    const body = new FormData(form);
    const response = await fetch(`${theme.routes.cart_add}.js`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.description || data.message || theme.strings.cart_error);
    }
    Cart.setCount(await Cart.fetchCount());
    await Cart.refreshDrawer();
    return data;
  },

  async change(line, quantity) {
    const response = await fetch(`${theme.routes.cart_change}.js`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ line, quantity }),
    });
    const cart = await response.json();
    if (!response.ok) throw new Error(cart.description || theme.strings.cart_error);
    Cart.setCount(cart.item_count);
    return cart;
  },
};

window.GameShopCart = Cart;

document.addEventListener('submit', async (event) => {
  const form = event.target.closest('form[data-cart-form]');
  if (!form || !theme.routes.cart_add) return;
  event.preventDefault();

  const submitter = form.querySelector('[type="submit"]');
  if (submitter && submitter.getAttribute('aria-disabled') === 'true') return;
  submitter?.setAttribute('aria-disabled', 'true');

  const errorElement = form.querySelector('[data-cart-form-error]');
  if (errorElement) {
    errorElement.textContent = '';
    errorElement.hidden = true;
  }

  try {
    await Cart.add(form);
    announce(theme.strings.added_to_cart);
    const drawer = document.querySelector('cart-drawer');
    if (drawer && theme.cartType === 'drawer') {
      drawer.open();
    } else if (theme.cartType === 'page' && form.dataset.redirectToCart !== 'false') {
      window.location.href = theme.routes.cart;
    }
  } catch (error) {
    if (errorElement) {
      errorElement.textContent = error.message;
      errorElement.hidden = false;
    } else {
      announce(error.message);
    }
  } finally {
    submitter?.removeAttribute('aria-disabled');
  }
});

/* Selects that submit their form when changed (country and language selectors) */
document.addEventListener('change', (event) => {
  const select = event.target.closest('select[data-auto-submit]');
  if (select && select.form) select.form.submit();
});

/* ---------- Dialogs (cart drawer, mobile menu, filters) ---------- */

class DialogElement extends HTMLElement {
  connectedCallback() {
    this.dialog = this.querySelector('dialog');
    if (!this.dialog || this.initialized) return;
    this.initialized = true;

    this.dialog.addEventListener('click', (event) => {
      if (event.target === this.dialog) this.close();
    });
    this.addEventListener('click', (event) => {
      if (event.target.closest('[data-dialog-close]')) this.close();
    });
    this.dialog.addEventListener('close', () => document.body.classList.remove('has-open-dialog'));
  }

  open() {
    if (!this.dialog || this.dialog.open) return;
    this.dialog.showModal();
    document.body.classList.add('has-open-dialog');
  }

  close() {
    if (this.dialog?.open) this.dialog.close();
  }
}

class CartDrawer extends DialogElement {
  replaceContent(incoming) {
    const wasOpen = this.dialog?.open;
    const target = this.querySelector('[data-cart-drawer-content]');
    const source = incoming.querySelector('[data-cart-drawer-content]');
    if (target && source) target.innerHTML = source.innerHTML;
    if (wasOpen && this.dialog && !this.dialog.open) this.dialog.showModal();
  }
}

class MenuDrawer extends DialogElement {}
class FilterDrawer extends DialogElement {}

customElements.define('dialog-element', DialogElement);
customElements.define('cart-drawer', CartDrawer);
customElements.define('menu-drawer', MenuDrawer);
customElements.define('filter-drawer', FilterDrawer);

document.addEventListener('click', (event) => {
  const opener = event.target.closest('[data-dialog-open]');
  if (opener) {
    const target = document.getElementById(opener.dataset.dialogOpen);
    if (target && typeof target.open === 'function') {
      if (opener.dataset.dialogOpen === 'cart-drawer' && theme.cartType !== 'drawer') return;
      event.preventDefault();
      target.open();
    }
  }
});

/* Cart drawer and cart page line item controls */
document.addEventListener('click', async (event) => {
  const control = event.target.closest('[data-cart-change]');
  if (!control) return;
  event.preventDefault();
  const line = Number(control.dataset.line);
  const quantity = Number(control.dataset.quantity);
  // Decide now: the drawer may re-render (detaching this control) while the request is in flight.
  const inDrawer = Boolean(control.closest('cart-drawer'));
  control.setAttribute('aria-disabled', 'true');
  try {
    await Cart.change(line, quantity);
    if (inDrawer) {
      await Cart.refreshDrawer();
    } else {
      window.location.reload();
    }
  } catch (error) {
    announce(error.message);
    control.removeAttribute('aria-disabled');
  }
});

/* Quantity inputs */
class QuantityInput extends HTMLElement {
  connectedCallback() {
    this.input = this.querySelector('input');
    this.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-step]');
      if (!button || !this.input) return;
      const step = Number(button.dataset.step);
      const min = Number(this.input.min || 0);
      const max = this.input.max ? Number(this.input.max) : Infinity;
      const next = Math.min(max, Math.max(min, Number(this.input.value || 0) + step));
      this.input.value = next;
      this.input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
}
customElements.define('quantity-input', QuantityInput);

/* ---------- Scroll carousel (native scroll-snap, buttons are progressive enhancement) ---------- */

class ScrollCarousel extends HTMLElement {
  connectedCallback() {
    this.track = this.querySelector('[data-carousel-track]');
    this.previous = this.querySelector('[data-carousel-previous]');
    this.next = this.querySelector('[data-carousel-next]');
    if (!this.track) return;

    this.previous?.addEventListener('click', () => this.scrollByPage(-1));
    this.next?.addEventListener('click', () => this.scrollByPage(1));
    this.track.addEventListener('scroll', debounce(() => this.update(), 50), { passive: true });
    window.addEventListener('resize', debounce(() => this.update(), 100));
    this.update();
  }

  scrollByPage(direction) {
    const distance = this.track.clientWidth * 0.9 * direction;
    this.track.scrollBy({ left: distance, behavior: 'smooth' });
  }

  update() {
    const maxScroll = this.track.scrollWidth - this.track.clientWidth;
    const isRtl = getComputedStyle(this.track).direction === 'rtl';
    const position = Math.abs(this.track.scrollLeft);
    const atStart = position <= 1;
    const atEnd = position >= maxScroll - 1;
    if (this.previous) this.previous.disabled = isRtl ? atEnd : atStart;
    if (this.next) this.next.disabled = isRtl ? atStart : atEnd;
    this.hidden = false;
    const overflow = maxScroll > 1;
    this.classList.toggle('is-scrollable', overflow);
  }
}
customElements.define('scroll-carousel', ScrollCarousel);

/* ---------- Predictive search ---------- */

class PredictiveSearch extends HTMLElement {
  connectedCallback() {
    this.input = this.querySelector('input[type="search"]');
    this.results = this.querySelector('[data-predictive-results]');
    if (!this.input || !this.results || !theme.routes.predictive_search) return;

    this.controller = null;
    this.input.addEventListener('input', debounce(() => this.search(), 250));
    this.input.addEventListener('focus', () => {
      if (this.results.innerHTML.trim()) this.show();
    });
    this.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.hide();
        this.input.focus();
      }
    });
    document.addEventListener('click', (event) => {
      if (!this.contains(event.target)) this.hide();
    });
  }

  async search() {
    const term = this.input.value.trim();
    if (!term) {
      this.hide();
      this.results.innerHTML = '';
      return;
    }

    this.controller?.abort();
    this.controller = new AbortController();
    const url = `${theme.routes.predictive_search}?q=${encodeURIComponent(term)}&section_id=predictive-search`;

    try {
      const response = await fetch(url, { signal: this.controller.signal });
      if (!response.ok) throw new Error(String(response.status));
      const text = await response.text();
      const markup = new DOMParser().parseFromString(text, 'text/html').querySelector('#shopify-section-predictive-search');
      this.results.innerHTML = markup ? markup.innerHTML : '';
      this.show();
      const status = this.results.querySelector('[data-predictive-status]');
      if (status) announce(status.textContent);
    } catch (error) {
      if (error.name !== 'AbortError') this.hide();
    }
  }

  show() {
    this.results.hidden = false;
  }

  hide() {
    this.results.hidden = true;
  }
}
customElements.define('predictive-search', PredictiveSearch);
