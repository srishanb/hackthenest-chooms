/**
 * Keeps the UI layer exactly over the game canvas, not the whole window.
 *
 * Why: the canvas is scaled to fit and centred, so on a wide window it has bars of plain fill colour at the
 * sides. HUD panels, the compass and the stats are positioned from the corners of `#ui`; if `#ui` covered
 * the window they would sit out in that fill. This copies the canvas's on-screen rectangle onto `#ui`
 * whenever the window, the canvas or its size changes. With no canvas yet it leaves `#ui` covering the
 * window. Removing this call only changes where the layer sits; nothing else depends on it.
 */
export function lockUiToCanvas(ui: HTMLElement): () => void {
  const app = ui.parentElement;
  if (!app) return () => {};
  let frame = 0;
  let observed: Element | null = null;

  const reset = (): void => {
    for (const property of ['left', 'top', 'width', 'height']) ui.style.removeProperty(property);
    ui.style.removeProperty('inset');
  };

  const apply = (): void => {
    frame = 0;
    const canvas = app.querySelector('canvas');
    if (canvas !== observed) {
      if (observed) resizeObserver.unobserve(observed);
      if (canvas) resizeObserver.observe(canvas);
      observed = canvas;
    }
    if (!canvas) return reset();
    const appRect = app.getBoundingClientRect();
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return reset();
    ui.style.inset = 'auto';
    ui.style.left = `${rect.left - appRect.left}px`;
    ui.style.top = `${rect.top - appRect.top}px`;
    ui.style.width = `${rect.width}px`;
    ui.style.height = `${rect.height}px`;
  };
  const schedule = (): void => { if (frame === 0) frame = requestAnimationFrame(apply); };

  const resizeObserver = new ResizeObserver(schedule);
  resizeObserver.observe(app);
  // Phaser adds its canvas, and later changes its size, as plain DOM edits.
  const mutationObserver = new MutationObserver(schedule);
  mutationObserver.observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'width', 'height'] });
  window.addEventListener('resize', schedule);
  apply();

  return () => {
    if (frame !== 0) cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    mutationObserver.disconnect();
    window.removeEventListener('resize', schedule);
    reset();
  };
}
