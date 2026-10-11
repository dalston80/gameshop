/* GameShop slideshow: scroll-snap track with arrows, dots and optional autoplay. */

if (!customElements.get('slide-show')) {
  class SlideShow extends HTMLElement {
    connectedCallback() {
      this.track = this.querySelector('[data-slideshow-track]');
      if (!this.track) return;

      this.slides = Array.from(this.track.querySelectorAll('[data-slide]'));
      this.dots = Array.from(this.querySelectorAll('[data-slideshow-dot]'));
      this.toggle = this.querySelector('[data-slideshow-toggle]');
      this.current = 0;
      this.userPaused = false;
      this.hovered = false;
      this.focused = false;
      this.inView = true;
      this.timer = null;
      this.abort = new AbortController();
      const signal = this.abort.signal;

      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.wantsAutoplay =
        this.dataset.autoplay === 'true' &&
        this.slides.length > 1 &&
        !(window.Shopify && window.Shopify.designMode);

      this.querySelector('[data-slideshow-previous]')?.addEventListener('click', () => this.step(-1), { signal });
      this.querySelector('[data-slideshow-next]')?.addEventListener('click', () => this.step(1), { signal });
      this.dots.forEach((dot, index) => dot.addEventListener('click', () => this.goTo(index), { signal }));
      this.toggle?.addEventListener('click', () => this.setUserPaused(!this.userPaused), { signal });

      this.addEventListener('keydown', (event) => this.onKeydown(event), { signal });
      this.addEventListener('mouseenter', () => this.setFlag('hovered', true), { signal });
      this.addEventListener('mouseleave', () => this.setFlag('hovered', false), { signal });
      this.addEventListener('focusin', () => this.setFlag('focused', true), { signal });
      this.addEventListener('focusout', () => this.setFlag('focused', false), { signal });
      this.addEventListener('shopify:block:select', (event) => this.onBlockSelect(event), { signal });
      document.addEventListener('visibilitychange', () => this.syncAutoplay(), { signal });
      this.reducedMotion.addEventListener('change', () => this.syncAutoplay(), { signal });

      if ('IntersectionObserver' in window) {
        this.slideObserver = new IntersectionObserver((entries) => this.onSlideIntersect(entries), {
          root: this.track,
          threshold: 0.6,
        });
        this.slides.forEach((slide) => this.slideObserver.observe(slide));

        this.viewObserver = new IntersectionObserver(
          ([entry]) => {
            this.inView = entry.isIntersecting;
            this.syncAutoplay();
          },
          { threshold: 0.1 }
        );
        this.viewObserver.observe(this);
      }

      this.render();
      this.syncAutoplay();
    }

    disconnectedCallback() {
      this.abort?.abort();
      this.slideObserver?.disconnect();
      this.viewObserver?.disconnect();
      this.stopTimer();
    }

    get canAutoplay() {
      return this.wantsAutoplay && !this.reducedMotion.matches;
    }

    get smooth() {
      return this.reducedMotion.matches ? 'auto' : 'smooth';
    }

    step(direction) {
      const count = this.slides.length;
      if (!count) return;
      this.goTo((this.current + direction + count) % count);
    }

    goTo(index) {
      const slide = this.slides[index];
      if (!slide) return;
      const delta = slide.getBoundingClientRect().left - this.track.getBoundingClientRect().left;
      this.track.scrollBy({ left: delta, behavior: this.smooth });
      this.current = index;
      this.render();
    }

    onSlideIntersect(entries) {
      const visible = entries.find((entry) => entry.isIntersecting);
      if (!visible) return;
      const index = this.slides.indexOf(visible.target);
      if (index === -1 || index === this.current) return;
      this.current = index;
      this.render();
    }

    onBlockSelect(event) {
      const index = this.slides.indexOf(event.target.closest('[data-slide]'));
      if (index !== -1) this.goTo(index);
    }

    onKeydown(event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (!event.target.closest('[data-slideshow-dot], [data-slideshow-previous], [data-slideshow-next]')) return;
      const rtl = getComputedStyle(this).direction === 'rtl';
      const forward = (event.key === 'ArrowRight') !== rtl;
      this.step(forward ? 1 : -1);
      event.preventDefault();
    }

    render() {
      this.slides.forEach((slide, index) => {
        slide.inert = index !== this.current;
      });
      this.dots.forEach((dot, index) => {
        if (index === this.current) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
    }

    setFlag(name, value) {
      this[name] = value;
      this.syncAutoplay();
    }

    setUserPaused(value) {
      this.userPaused = value;
      this.syncAutoplay();
    }

    get running() {
      return (
        this.canAutoplay &&
        !this.userPaused &&
        !this.hovered &&
        !this.focused &&
        this.inView &&
        !document.hidden
      );
    }

    syncAutoplay() {
      if (this.toggle) {
        this.toggle.hidden = !this.canAutoplay;
        const label = this.userPaused ? this.dataset.labelPlay : this.dataset.labelPause;
        if (label) this.toggle.setAttribute('aria-label', label);
        this.toggle.dataset.state = this.userPaused ? 'paused' : 'playing';
      }
      this.track.setAttribute('aria-live', this.canAutoplay && !this.userPaused ? 'off' : 'polite');

      this.stopTimer();
      if (this.running) this.scheduleNext();
    }

    scheduleNext() {
      const speed = Math.max(Number(this.dataset.speed) || 6000, 3000);
      this.timer = window.setTimeout(() => {
        this.step(1);
        this.syncAutoplay();
      }, speed);
    }

    stopTimer() {
      if (this.timer) window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  customElements.define('slide-show', SlideShow);
}
