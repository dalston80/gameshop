(() => {
  if (customElements.get('recently-viewed')) return;

  const STORAGE_KEY = 'gameshop:recently-viewed';
  const MAX_STORED = 20;

  const read = () => {
    try {
      const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      return Array.isArray(value) ? value.filter((handle) => typeof handle === 'string') : [];
    } catch (error) {
      return [];
    }
  };

  const write = (handles) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(handles.slice(0, MAX_STORED)));
    } catch (error) {
      // Storage can be unavailable (private browsing, blocked cookies); the list simply stays empty.
    }
  };

  /* Records the product being viewed. Handles only: no personal data is stored. */
  class RecentlyViewedTracker extends HTMLElement {
    connectedCallback() {
      const handle = this.dataset.handle;
      if (!handle) return;
      write([handle, ...read().filter((stored) => stored !== handle)]);
    }
  }

  /*
   * Renders product cards for the stored handles. Each card comes from the product.card alternate template
   * (/products/{handle}?view=card), requested through the Section Rendering API so no theme layout is returned.
   */
  class RecentlyViewed extends HTMLElement {
    connectedCallback() {
      this.list = this.querySelector('[data-recently-viewed-list]');
      this.placeholder = this.querySelector('[data-recently-viewed-placeholder]');
      if (!this.list) return;
      this.load();
    }

    disconnectedCallback() {
      this.controller?.abort();
    }

    async load() {
      const current = this.dataset.currentHandle;
      const limit = Number(this.dataset.limit) || 4;
      const handles = read()
        .filter((handle) => handle !== current)
        .slice(0, limit);

      if (!handles.length) {
        this.showPlaceholder();
        return;
      }

      this.controller = new AbortController();
      const root = this.dataset.root || '/';
      const results = await Promise.all(handles.map((handle) => this.fetchCard(root, handle)));

      const missing = handles.filter((handle, index) => results[index] === null);
      if (missing.length) write(read().filter((handle) => !missing.includes(handle)));

      const cards = results.filter(Boolean);
      if (!cards.length) {
        this.showPlaceholder();
        return;
      }

      this.list.replaceChildren(
        ...cards.map((card) => {
          const item = document.createElement('li');
          item.append(card);
          return item;
        }),
      );
      this.hidden = false;
    }

    async fetchCard(root, handle) {
      try {
        const url = `${root}products/${encodeURIComponent(handle)}?view=card&section_id=card`;
        const response = await fetch(url, { signal: this.controller.signal });
        if (response.status === 404) return null;
        if (!response.ok) return undefined;
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        return doc.querySelector('.product-card') || null;
      } catch (error) {
        return undefined;
      }
    }

    /* The empty state is only visible in the theme editor so shoppers never see an empty heading */
    showPlaceholder() {
      this.hidden = !this.placeholder;
      if (this.placeholder) this.placeholder.hidden = false;
    }
  }

  customElements.define('recently-viewed-tracker', RecentlyViewedTracker);
  customElements.define('recently-viewed', RecentlyViewed);
})();
