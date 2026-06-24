/**
 * ==========================================================================
 * КОМПОНЕНТ КАРУСЕЛИ
 * ==========================================================================
 * Использование:
 *   const c = new Carousel(element, ['/uploads/a.jpg', '/uploads/b.jpg'], {
 *     autoplay: true, interval: 4000, pauseOnHover: true
 *   });
 *   c.init();
 *
 * Настройка дизайна: CSS-классы .carousel, .carousel-track, .carousel-slide
 * Скорость: опция interval (мс), анимация — transition в CSS
 * ==========================================================================
 */

class Carousel {
  /**
   * @param {HTMLElement} container
   * @param {string[]} imageUrls — массив URL изображений
   * @param {{ autoplay?: boolean, interval?: number, pauseOnHover?: boolean, captions?: string[] }} options
   */
  constructor(container, imageUrls, options = {}) {
    this.container = container;
    this.urls = (imageUrls || []).filter(Boolean);
    this.options = {
      autoplay: true,
      interval: 4000,
      pauseOnHover: true,
      captions: [],
      ...options
    };
    this.current = 0;
    this.timer = null;
    this.paused = false;
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onMouseEnter = () => { this.paused = true; this.stopAutoplay(); };
    this.onMouseLeave = () => { this.paused = false; if (this.options.autoplay) this.startAutoplay(); };
    this.touchStartX = 0;
    this.onTouchStart = (e) => { this.touchStartX = e.changedTouches[0].screenX; };
    this.onTouchEnd = (e) => {
      const d = e.changedTouches[0].screenX - this.touchStartX;
      if (Math.abs(d) < 40) return;
      d > 0 ? this.prev() : this.next();
    };
  }

  init() {
    if (!this.container || this.urls.length === 0) {
      this.container.innerHTML = '<p class="carousel-empty">Нет изображений</p>';
      return;
    }

    this.container.innerHTML = "";
    this.container.classList.add("carousel");

    const track = document.createElement("div");
    track.className = "carousel-track";

    this.urls.forEach((url, i) => {
      const slide = document.createElement("div");
      slide.className = "carousel-slide";
      slide.setAttribute("aria-hidden", i === 0 ? "false" : "true");

      const img = document.createElement("img");
      img.src = url;
      img.alt = this.options.captions[i] || `Слайд ${i + 1}`;
      img.loading = i === 0 ? "eager" : "lazy";
      slide.appendChild(img);

      if (this.options.captions[i]) {
        const cap = document.createElement("p");
        cap.className = "carousel-caption";
        cap.textContent = this.options.captions[i];
        slide.appendChild(cap);
      }

      track.appendChild(slide);
    });

    this.container.appendChild(track);
    this.track = track;

    if (this.urls.length > 1) {
      const prev = document.createElement("button");
      prev.type = "button";
      prev.className = "carousel-btn carousel-btn--prev";
      prev.setAttribute("aria-label", "Предыдущий слайд");
      prev.innerHTML = "&#10094;";

      const next = document.createElement("button");
      next.type = "button";
      next.className = "carousel-btn carousel-btn--next";
      next.setAttribute("aria-label", "Следующий слайд");
      next.innerHTML = "&#10095;";

      const dots = document.createElement("div");
      dots.className = "carousel-dots";
      dots.setAttribute("role", "tablist");

      this.dots = [];
      this.urls.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel-dot";
        dot.setAttribute("role", "tab");
        dot.setAttribute("aria-label", `Слайд ${i + 1}`);
        dot.addEventListener("click", () => this.goTo(i));
        dots.appendChild(dot);
        this.dots.push(dot);
      });

      prev.addEventListener("click", () => this.prev());
      next.addEventListener("click", () => this.next());

      this.container.append(prev, next, dots);

      document.addEventListener("keydown", this.onKeyDown);
      this.container.addEventListener("touchstart", this.onTouchStart, { passive: true });
      this.container.addEventListener("touchend", this.onTouchEnd);

      if (this.options.pauseOnHover) {
        this.container.addEventListener("mouseenter", this.onMouseEnter);
        this.container.addEventListener("mouseleave", this.onMouseLeave);
      }
    }

    this.goTo(0, false);
    if (this.options.autoplay && this.urls.length > 1) this.startAutoplay();
  }

  goTo(index, animate = true) {
    if (!this.track) return;
    this.current = ((index % this.urls.length) + this.urls.length) % this.urls.length;

    if (!animate) this.track.style.transition = "none";
    this.track.style.transform = `translateX(-${this.current * 100}%)`;
    if (!animate) {
      requestAnimationFrame(() => { this.track.style.transition = ""; });
    }

    this.track.querySelectorAll(".carousel-slide").forEach((el, i) => {
      el.setAttribute("aria-hidden", i !== this.current ? "true" : "false");
    });

    this.dots?.forEach((dot, i) => {
      dot.classList.toggle("is-active", i === this.current);
      dot.setAttribute("aria-selected", i === this.current ? "true" : "false");
    });
  }

  next() {
    this.goTo(this.current + 1);
    if (this.options.autoplay && !this.paused) this.resetAutoplay();
  }

  prev() {
    this.goTo(this.current - 1);
    if (this.options.autoplay && !this.paused) this.resetAutoplay();
  }

  onKeyDown(e) {
    if (!this.container?.isConnected) return;
    if (e.key === "ArrowLeft") this.prev();
    if (e.key === "ArrowRight") this.next();
  }

  startAutoplay() {
    this.stopAutoplay();
    this.timer = setInterval(() => {
      if (!this.paused) this.goTo(this.current + 1);
    }, this.options.interval);
  }

  resetAutoplay() {
    if (this.options.autoplay) this.startAutoplay();
  }

  stopAutoplay() {
    clearInterval(this.timer);
    this.timer = null;
  }

  destroy() {
    this.stopAutoplay();
    document.removeEventListener("keydown", this.onKeyDown);
    this.container?.removeEventListener("mouseenter", this.onMouseEnter);
    this.container?.removeEventListener("mouseleave", this.onMouseLeave);
    this.container?.removeEventListener("touchstart", this.onTouchStart);
    this.container?.removeEventListener("touchend", this.onTouchEnd);
    if (this.container) {
      this.container.innerHTML = "";
      this.container.classList.remove("carousel");
    }
  }
}

window.Carousel = Carousel;
