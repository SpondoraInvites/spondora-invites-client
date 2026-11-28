import "@testing-library/jest-dom/vitest";

// Node 22+ installs its own `localStorage` global, unavailable without a
// --localstorage-file flag, and it shadows jsdom's working one. jsdom's `sessionStorage`
// is a real Storage instance, so alias it rather than mocking setItem/getItem by hand.
if (!window.localStorage) {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get: () => window.sessionStorage,
  });
}

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
