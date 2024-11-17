class PredictiveSearch extends HTMLElement {
    constructor() {
      super();
      this.input = this.querySelector('input[type="search"]');
      this.predictiveSearchResults = this.querySelector('[data-predictive-search-results]');
      this.setupEventListeners();
    }
  
    setupEventListeners() {
      this.input.addEventListener('input', this.debounce((event) => {
        this.onChange(event);
      }, 300).bind(this));
  
      this.input.addEventListener('focus', this.onFocus.bind(this));
  
      document.body.addEventListener('click', this.onBodyClick.bind(this));
    }
  
    getQuery() {
      return this.input.value.trim();
    }
  
    onChange() {
      const searchTerm = this.getQuery();
  
      if (!searchTerm.length) {
        this.close();
        return;
      }
  
      this.getSearchResults(searchTerm);
    }
  
    onFocus() {
      const searchTerm = this.getQuery();
      if (!searchTerm.length) return;
  
      this.getSearchResults(searchTerm);
    }
  
    onBodyClick(event) {
      if (this.contains(event.target)) return;
      this.close();
    }
  
    getSearchResults(searchTerm) {
      fetch(`/search/suggest?q=${encodeURIComponent(searchTerm)}&resources[type]=product&resources[limit]=4&section_id=predictive-search`)
        .then((response) => response.text())
        .then((text) => {
          const resultsMarkup = new DOMParser().parseFromString(text, 'text/html').querySelector('#shopify-section-predictive-search').innerHTML;
          this.predictiveSearchResults.innerHTML = resultsMarkup;
          this.open();
        });
    }
  
    open() {
      this.predictiveSearchResults.style.display = 'block';
      this.input.setAttribute('aria-expanded', true);
    }
  
    close() {
      this.predictiveSearchResults.style.display = 'none';
      this.input.setAttribute('aria-expanded', false);
    }
  
    debounce(fn, wait) {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
      };
    }
  }
  
  customElements.define('predictive-search', PredictiveSearch);