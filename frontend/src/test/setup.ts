import "@testing-library/jest-dom";

// Polyfill ResizeObserver for recharts ResponsiveContainer in jsdom
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
