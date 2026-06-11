import '@testing-library/jest-dom/vitest';

if (typeof window !== 'undefined') {
  const originalGetComputedStyle = window.getComputedStyle.bind(window);
  window.getComputedStyle = ((element: Element) => originalGetComputedStyle(element)) as typeof window.getComputedStyle;

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
