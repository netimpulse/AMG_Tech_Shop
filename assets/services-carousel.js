/* Services – Endless Carousel
   Works with the existing markup:
   .svc-wrap[data-svc-carousel] > .svc-inner > .svc-scroller > .svc-row > .svc-card
   - Infinite loop by cloning items before and after
   - Arrows step the carousel
   - Mouse drag (desktop) & touch scroll (mobile)
   - Snap scrolling kept via CSS
*/

(function () {
  const ATTR_SELECTOR = '[data-svc-carousel]';

  const px = (v) => (typeof v === 'number' ? v : parseInt(String(v || '0'), 10) || 0);

  function initCarousel(root) {
    const scroller = root.querySelector('.svc-scroller');
    const row = root.querySelector('.svc-row');
    const arrows = root.querySelectorAll('.svc-arrow');
    if (!scroller || !row) return;

    // cleanup (Shopify editor can re-render)
    row.querySelectorAll('.is-clone').forEach((n) => n.remove());

    const originals = Array.from(row.children);
    if (!originals.length) return;

    // clone left & right
    const before = originals.map((el) => { const c = el.cloneNode(true); c.classList.add('is-clone'); return c; });
    const after  = originals.map((el) => { const c = el.cloneNode(true); c.classList.add('is-clone'); return c; });

    before.slice().reverse().forEach((c) => row.insertBefore(c, row.firstChild));
    after.forEach((c) => row.appendChild(c));

    // metrics
    let gap = 0, step = 0, startOffset = 0, loopWidth = 0;

    function computeMetrics() {
      const style = getComputedStyle(row);
      gap = px(style.gap);
      const firstCard = row.querySelector('.svc-card:not(.is-clone)');
      step = firstCard ? Math.round(firstCard.getBoundingClientRect().width) + gap : 300;

      const reals = row.querySelectorAll('.svc-card:not(.is-clone)');
      const firstReal = reals[0];
      const lastReal  = reals[reals.length - 1];

      startOffset = firstReal.offsetLeft - row.offsetLeft;
      loopWidth   = (lastReal.offsetLeft + lastReal.offsetWidth) - firstReal.offsetLeft;
    }

    computeMetrics();

    // start in the real set
    function jumpToRealStart(){ scroller.scrollLeft = startOffset; }
    requestAnimationFrame(jumpToRealStart);

    // infinite wrap
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const x = scroller.scrollLeft;
        if (x < startOffset - step) {
          scroller.scrollLeft = x + loopWidth;
        } else if (x > startOffset + loopWidth + step) {
          scroller.scrollLeft = x - loopWidth;
        }
        ticking = false;
      });
    }
    scroller.addEventListener('scroll', onScroll, { passive: true });

    // mouse drag (desktop)
    let isDown=false, startX=0, scrollStart=0;
    scroller.addEventListener('mousedown', (e)=>{ isDown=true; scroller.classList.add('is-drag'); startX=e.pageX - scroller.offsetLeft; scrollStart=scroller.scrollLeft; });
    window.addEventListener('mouseup', ()=>{ isDown=false; scroller.classList.remove('is-drag'); });
    scroller.addEventListener('mouseleave', ()=>{ isDown=false; scroller.classList.remove('is-drag'); });
    scroller.addEventListener('mousemove', (e)=>{ if(!isDown) return; e.preventDefault(); const x=e.pageX - scroller.offsetLeft; const walk=(x - startX)*1.2; scroller.scrollLeft = scrollStart - walk; });

    // arrows
    function visibleCount(){ return Math.max(1, Math.round(scroller.clientWidth / step)); }
    function scrollByCards(dir,count){ scroller.scrollBy({ left: dir * step * (count||1), behavior: 'smooth' }); }

    arrows.forEach((btn)=>{
      btn.addEventListener('click', ()=>{
        const dir = parseInt(btn.dataset.dir || '1', 10);
        scrollByCards(dir, visibleCount()); // one "page"
      });
    });

    // resize
    let resizeTO;
    function onResize(){
      clearTimeout(resizeTO);
      resizeTO = setTimeout(()=>{
        const posInLoop = (scroller.scrollLeft - startOffset + loopWidth) % loopWidth;
        computeMetrics();
        scroller.scrollLeft = startOffset + posInLoop;
      }, 100);
    }
    window.addEventListener('resize', onResize);

    // expose destroy for theme editor
    root.__svcDestroy = () => {
      window.removeEventListener('resize', onResize);
      scroller.removeEventListener('scroll', onScroll);
      row.querySelectorAll('.is-clone').forEach((n)=>n.remove());
    };
  }

  function initAll(){ document.querySelectorAll(ATTR_SELECTOR).forEach(initCarousel); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', initAll);
  document.addEventListener('shopify:section:unload', (e)=>{
    const root = e.target.querySelector(ATTR_SELECTOR);
    if (root && root.__svcDestroy) root.__svcDestroy();
  });
})();
