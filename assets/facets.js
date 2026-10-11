/*
 * Faceted filtering, sorting and pagination for collection and search pages.
 * Everything works as plain links and GET forms; this element upgrades them to update the
 * results in place by re-fetching the section (Section Rendering API).
 */

(() => {
  const VIEW_STORAGE_KEY = 'gameshop:product-view';

  function announceResults(message) {
    const region = document.querySelector('[data-live-region]');
    if (!region || !message) return;
    region.textContent = '';
    window.setTimeout(() => {
      region.textContent = message;
    }, 50);
  }

  class FacetsContainer extends HTMLElement {
    connectedCallback() {
      this.sectionId = this.dataset.sectionId;
      this.currentSearch = window.location.search;
      this.requestId = 0;
      this.classList.add('is-enhanced');

      if (!this.listening) {
        this.listening = true;
        this.onPopState = this.handlePopState.bind(this);
        this.addEventListener('change', (event) => this.handleChange(event));
        this.addEventListener('submit', (event) => this.handleSubmit(event));
        this.addEventListener('click', (event) => this.handleClick(event));
      }
      window.addEventListener('popstate', this.onPopState);

      this.applyView();
    }

    disconnectedCallback() {
      window.removeEventListener('popstate', this.onPopState);
      this.controller?.abort();
    }

    /* ---------- Events ---------- */

    handleChange(event) {
      const target = event.target;

      if (target.matches('[data-facets-sort]')) {
        // Prevents the generic select[data-auto-submit] handler from reloading the page
        event.stopPropagation();
        this.update(this.formUrl(target.form));
        return;
      }

      const form = target.closest('[data-facets-form]');
      if (form) this.update(this.formUrl(form));
    }

    handleSubmit(event) {
      const form = event.target.closest('[data-facets-form], [data-facets-sort-form]');
      if (!form) return;
      event.preventDefault();
      this.update(this.formUrl(form));
    }

    handleClick(event) {
      const viewButton = event.target.closest('[data-view-toggle]');
      if (viewButton) {
        this.setView(viewButton.dataset.viewToggle);
        return;
      }

      const link = event.target.closest('a[data-facets-link], [data-facets-links] a');
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (link.target === '_blank' || !link.href) return;
      event.preventDefault();
      this.update(link.href);
    }

    handlePopState() {
      if (window.location.search === this.currentSearch) return;
      this.update(window.location.href, false);
    }

    /* ---------- Data ---------- */

    formUrl(form) {
      const params = new URLSearchParams();
      new FormData(form).forEach((value, key) => {
        if (typeof value === 'string' && value !== '') params.append(key, value);
      });
      const base = form.getAttribute('action') || window.location.pathname;
      const query = params.toString();
      return query ? `${base}?${query}` : base;
    }

    async update(url, push = true) {
      this.controller?.abort();
      this.controller = new AbortController();
      const requestId = ++this.requestId;
      this.setBusy(true);

      try {
        const requestUrl = new URL(url, window.location.origin);
        requestUrl.searchParams.set('section_id', this.sectionId);
        const response = await fetch(requestUrl.toString(), { signal: this.controller.signal });
        if (!response.ok) throw new Error(String(response.status));

        const html = new DOMParser().parseFromString(await response.text(), 'text/html');
        const incoming = html.querySelector('facets-container');
        if (!incoming) throw new Error('missing section');

        this.replaceRegions(incoming);
        if (push) window.history.pushState({}, '', url);
        this.currentSearch = window.location.search;

        const count = this.querySelector('[data-facets-count]');
        if (count) announceResults(count.textContent.trim());
      } catch (error) {
        if (error.name === 'AbortError') return;
        window.location.href = url;
      } finally {
        if (requestId === this.requestId) this.setBusy(false);
      }
    }

    setBusy(isBusy) {
      this.classList.toggle('is-loading', isBusy);
      this.setAttribute('aria-busy', String(isBusy));
    }

    replaceRegions(incoming) {
      const focusedId = this.contains(document.activeElement) ? document.activeElement.id : '';
      const openGroups = new Map();
      this.querySelectorAll('details[data-facet-id]').forEach((details) => {
        openGroups.set(`${details.closest('[data-facets-update]')?.id}:${details.dataset.facetId}`, details.open);
      });

      this.querySelectorAll('[data-facets-update]').forEach((region) => {
        const replacement = incoming.querySelector(`#${CSS.escape(region.id)}`);
        if (!replacement) return;

        replacement.querySelectorAll('details[data-facet-id]').forEach((details) => {
          const key = `${region.id}:${details.dataset.facetId}`;
          if (openGroups.has(key)) details.open = openGroups.get(key);
        });
        region.replaceChildren(...replacement.childNodes);
      });

      this.applyView();
      if (focusedId) this.querySelector(`#${CSS.escape(focusedId)}`)?.focus({ preventScroll: true });
    }

    /* ---------- Grid / list view ---------- */

    getView() {
      let stored = null;
      try {
        stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
      } catch (error) {
        stored = null;
      }
      return stored === 'list' || stored === 'grid' ? stored : this.dataset.defaultView || 'grid';
    }

    setView(view) {
      try {
        window.localStorage.setItem(VIEW_STORAGE_KEY, view);
      } catch (error) {
        // Storage can be unavailable (private mode); the view still changes for this page.
      }
      this.applyView(view);
    }

    applyView(view = this.getView()) {
      this.querySelectorAll('[data-facets-grid]').forEach((grid) => {
        grid.classList.toggle('product-grid--list', view === 'list');
      });
      this.querySelectorAll('[data-view-toggle]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.viewToggle === view));
      });
    }
  }

  if (!customElements.get('facets-container')) customElements.define('facets-container', FacetsContainer);
})();
