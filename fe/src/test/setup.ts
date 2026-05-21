import '@testing-library/jest-dom/vitest';

if (typeof window !== 'undefined') {
  window.matchMedia = window.matchMedia ?? (() => ({
    matches: false,
    media: '',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as typeof window.matchMedia);

  window.ResizeObserver = window.ResizeObserver ?? class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}