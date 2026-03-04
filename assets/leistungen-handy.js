/* leistungen-handy.js
   Carousel-Steuerung + mobiler Scroll-Snap + Fortschrittsanzeige.
*/

(function () {
  "use strict";

  const MOBILE_QUERY = "(max-width: 749px)";

  const debounce = (fn, wait = 120) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  };

  function initAll() {
    document
      .querySelectorAll(".leistungen-handy-section")
      .forEach((sectionEl) => initCarousel(sectionEl));
  }

  function initCarousel(root) {
    const viewport = root.querySelector(".carousel-viewport");
    const track = root.querySelector(".carousel-track");
    const slides = Array.from(root.querySelectorAll(".carousel-slide"));
    const prevBtn = root.querySelector(".carousel-arrow--prev");
    const nextBtn = root.querySelector(".carousel-arrow--next");
    const progress = root.querySelector(".carousel-progress");
    const progressBar = root.querySelector(".carousel-progress__bar");

    if (!viewport || !track || slides.length === 0) return;

    let current = 0;
    let slideWidth = 0;
    let isMobile = window.matchMedia(MOBILE_QUERY).matches;

    const getSlideWidth = () => slides[0].offsetWidth;

    const visibleCount = () => {
      const count = Math.max(1, Math.round(viewport.offsetWidth / slideWidth));
      return count;
    };

    const clampIndex = (idx) => {
      const max = Math.max(0, slides.length - visibleCount());
      return Math.min(Math.max(0, idx), max);
    };

    const setTransformToIndex = (idx) => {
      track.style.transform = `translateX(${-idx * slideWidth}px)`;
    };

    const updateButtons = () => {
      if (!prevBtn || !nextBtn) return;
      if (isMobile) {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
      }
      prevBtn.disabled = current <= 0;
      const maxIndex = Math.max(0, slides.length - visibleCount());
      nextBtn.disabled = current >= maxIndex;
    };

    const updateProgress = () => {
      if (!progress || !progressBar) return;
      let ratio = 0;
      if (isMobile) {
        const maxScroll = Math.max(1, track.scrollWidth - viewport.clientWidth);
        ratio = Math.min(1, Math.max(0, viewport.scrollLeft / maxScroll));
      } else {
        const maxIndex = Math.max(1, slides.length - visibleCount());
        ratio = Math.min(1, Math.max(0, current / maxIndex));
      }
      progressBar.style.width = `${ratio * 100}%`;
    };

    const snapToIndex = (idx, smooth = true) => {
      const x = idx * slideWidth;
      viewport.scrollTo({ left: x, behavior: smooth ? "smooth" : "auto" });
      updateProgress();
    };

    const goTo = (idx) => {
      current = clampIndex(idx);
      if (isMobile) {
        snapToIndex(current, true);
      } else {
        setTransformToIndex(current);
        updateButtons();
        updateProgress();
      }
    };

    /* ---- Mode Switches ---- */
    const applyDesktopMode = () => {
      viewport.style.scrollSnapType = "";
      viewport.style.overflowX = "";
      track.style.scrollBehavior = "";
      slides.forEach((s) => {
        s.style.scrollSnapAlign = "";
        s.style.width = ""; // CSS regelt ≥ 750px
      });
      slideWidth = getSlideWidth();
      track.style.transition = "transform 0.6s cubic-bezier(0.86, 0, 0.07, 1)";
      setTransformToIndex(current);
      updateButtons();
      updateProgress();
    };

    const applyMobileMode = () => {
      slides.forEach((s) => {
        s.style.width = "100%"; // exakt 1 Slide pro View
        s.style.scrollSnapAlign = "center";
      });
      viewport.style.scrollSnapType = "x mandatory";
      viewport.style.overflowX = "auto";
      track.style.transition = "none";
      track.style.transform = "";
      slideWidth = getSlideWidth();
      snapToIndex(current, false);
      updateButtons();
      updateProgress();
    };

    /* ---- Events ---- */
    const onPrev = () => goTo(current - 1);
    const onNext = () => goTo(current + 1);

    if (prevBtn) prevBtn.addEventListener("click", onPrev);
    if (nextBtn) nextBtn.addEventListener("click", onNext);

    root.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onNext();
      }
    });

    const onMobileScroll = debounce(() => {
      if (!isMobile) return;
      slideWidth = getSlideWidth();
      const idx = Math.round(viewport.scrollLeft / slideWidth);
      current = clampIndex(idx);
      updateProgress();
    }, 80);

    viewport.addEventListener("scroll", onMobileScroll, { passive: true });

    const onResize = debounce(() => {
      const nowMobile = window.matchMedia(MOBILE_QUERY).matches;
      if (nowMobile !== isMobile) {
        isMobile = nowMobile;
        if (isMobile) applyMobileMode();
        else applyDesktopMode();
        return;
      }
      slideWidth = getSlideWidth();
      if (isMobile) {
        snapToIndex(current, false);
      } else {
        setTransformToIndex(current);
        updateButtons();
        updateProgress();
      }
    }, 120);

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(onResize);
      ro.observe(viewport);
    }

    // Initial
    if (isMobile) applyMobileMode();
    else applyDesktopMode();

    // API optional
    root._leistungenCarousel = {
      next: onNext, prev: onPrev, goTo,
      get index() { return current; }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
