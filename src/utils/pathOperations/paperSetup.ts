import paper from 'paper';

// Lazy Paper.js initialization — avoids paying setup cost at module load time.
let paperInitialized = false;

export function ensurePaperSetup(): void {
  if (paperInitialized || typeof document === 'undefined') {
    return;
  }

  paperInitialized = true;

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  const originalAddEventListener = canvas.addEventListener.bind(canvas);

  canvas.addEventListener = function (
    this: HTMLCanvasElement,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) {
    const opts = typeof options === 'object' ? { ...options, passive: true } : { passive: true };
    return originalAddEventListener(type, listener, opts);
  };

  paper.setup(canvas);

  if (paper.settings) {
    paper.settings.precision = 6;
    paper.settings.tolerance = 0.1;
  }

  canvas.addEventListener = originalAddEventListener;
}
