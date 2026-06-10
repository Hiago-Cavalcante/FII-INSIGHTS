import "@testing-library/jest-dom";

// Polyfill ResizeObserver for recharts ResponsiveContainer in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
