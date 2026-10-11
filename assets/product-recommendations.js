(() => {
  if (customElements.get('product-recommendations')) return;

  /* Loads recommendations from the Section Rendering API once the section nears the viewport */
  class ProductRecommendations extends HTMLElement {
    connectedCallback() {
      if (!this.dataset.url || this.querySelector('.product-grid')) return;

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

    disconnectedCallback() {
      this.observer?.disconnect();
      this.controller?.abort();
    }

    async load() {
      this.controller = new AbortController();
      try {
        const response = await fetch(this.dataset.url, { signal: this.controller.signal });
        if (!response.ok) return;
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        const incoming = doc.querySelector('product-recommendations');
        // An empty response (for example no complementary products configured) leaves the section hidden.
        if (incoming && incoming.innerHTML.trim()) this.innerHTML = incoming.innerHTML;
      } catch (error) {
        if (error.name !== 'AbortError') this.replaceChildren();
      }
    }
  }

  customElements.define('product-recommendations', ProductRecommendations);
})();
