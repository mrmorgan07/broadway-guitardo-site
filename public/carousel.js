/**
 * ==========================================================================
 * КАРУСЕЛЬ — нативный JavaScript (без библиотек)
 * ==========================================================================
 * Использование:
 *   const carousel = new Carousel(containerElement, images, { captions: [...] });
 *   carousel.init();
 *   carousel.destroy(); // при закрытии модалки
 * ==========================================================================
 */

class Carousel {
  /**
   * @param {HTMLElement} container
   * @param {Array<{src: string, webp?: string, alt?: string, caption?: string}>} slides
   * @param {{ autoplay?: boolean, interval?: number, showCaptions?: boolean }} options
   */
  constructor(container, slides, options = {}) {
    this.container = container;
    this.slides = slides || [];
    this.options = {
      autoplay: false,
      interval: 5000,
      showCaptions: true,
      ...options
    };
    this.current = 0;
    this.autoplayTimer = null;
    this.touchStartX = 0;
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
  }

  init() {
    if (!this.container || this.slides.length === 0) return;

    this.container.innerHTML = "";
    this.container.classList.add("carousel");

    const track = document.createElement("div");
    track.className = "carousel-track";
    track.setAttribute("role", "list");

    this.slides.forEach((slide, i) => {
      const item = document.createElement("div");
      item.className = "carousel-slide";
      item.setAttribute("role", "listitem");
      item.setAttribute("aria-hidden", i === 0 ? "false" : "true");

      const picture = document.createElement("picture");
      if (slide.webp) {
        const source = document.createElement("source");
        source.srcset = slide.webp;
        source.type = "image/webp";
        picture.appendChild(source);
      }
      const img = document.createElement("img");
      img.src = slide.src;
      img.alt = slide.alt || "";
      img.loading = i === 0 ? "eager" : "lazy";
      picture.appendChild(img);
      item.appendChild(picture);

      if (this.options.showCaptions && slide.caption) {
        const cap = document.createElement("p");
        cap.className = "carousel-caption";
        cap.textContent = slide.caption;
        item.appendChild(cap);
      }

      track.appendChild(item);
    });

    this.container.appendChild(track);

    if (this.slides.length > 1) {
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

      this.slides.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel-dot";
        dot.setAttribute("role", "tab");
        dot.setAttribute("aria-label", `Слайд ${i + 1}`);
        dot.setAttribute("aria-selected", i === 0 ? "true" : "false");
        dot.addEventListener("click", () => this.goTo(i));
        dots.appendChild(dot);
      });

      prev.addEventListener("click", () => this.prev());
      next.addEventListener("click", () => this.next());

      this.container.append(prev, next, dots);

      this.track = track;
      this.dots = dots.querySelectorAll(".carousel-dot");

      document.addEventListener("keydown", this.onKeyDown);
      this.container.addEventListener("touchstart", this.onTouchStart, { passive: true });
      this.container.addEventListener("touchend", this.onTouchEnd);

      if (this.options.autoplay) this.startAutoplay();
    }

    this.goTo(0, false);
  }

  goTo(index, animate = true) {
    if (!this.track || this.slides.length === 0) return;

    this.current = ((index % this.slides.length) + this.slides.length) % this.slides.length;

    if (!animate) this.track.style.transition = "none";
    this.track.style.transform = `translateX(-${this.current * 100}%)`;
    if (!animate) {
      requestAnimationFrame(() => {
        this.track.style.transition = "";
      });
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
    if (this.options.autoplay) this.resetAutoplay();
  }

  prev() {
    this.goTo(this.current - 1);
    if (this.options.autoplay) this.resetAutoplay();
  }

  onKeyDown(e) {
    if (!this.container?.isConnected) return;
    if (e.key === "ArrowLeft") this.prev();
    if (e.key === "ArrowRight") this.next();
  }

  onTouchStart(e) {
    this.touchStartX = e.changedTouches[0].screenX;
  }

  onTouchEnd(e) {
    const diff = e.changedTouches[0].screenX - this.touchStartX;
    if (Math.abs(diff) < 40) return;
    if (diff > 0) this.prev();
    else this.next();
  }

  startAutoplay() {
    this.autoplayTimer = setInterval(() => this.next(), this.options.interval);
  }

  resetAutoplay() {
    clearInterval(this.autoplayTimer);
    this.startAutoplay();
  }

  destroy() {
    clearInterval(this.autoplayTimer);
    document.removeEventListener("keydown", this.onKeyDown);
    this.container?.removeEventListener("touchstart", this.onTouchStart);
    this.container?.removeEventListener("touchend", this.onTouchEnd);
    if (this.container) {
      this.container.innerHTML = "";
      this.container.classList.remove("carousel");
    }
  }
}

// Экспорт для модулей и глобальный доступ
if (typeof window !== "undefined") {
  window.Carousel = Carousel;
}
