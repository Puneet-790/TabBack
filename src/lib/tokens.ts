export const COLORS = {
  background: "#f6f7f5",
  surface: "#ffffff",
  surfaceMuted: "#f1f3ef",
  foreground: "#1c211d",
  muted: "#5b665e",
  border: "#e3e7e1",
  accent: "#0f766e",
  accentDeep: "#115e59",
  accentSoft: "#e1f3ef",
  accentInk: "#ffffff",
  success: "#15803d",
  warning: "#b45309",
  danger: "#be123c",
  info: "#0369a1",
} as const;

export const FONTS = {
  sans: "Geist, ui-sans-serif, system-ui, -apple-system, sans-serif",
  mono: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

export const RADII = {
  sm: "0.5rem",
  md: "0.625rem",
  lg: "0.75rem",
  xl: "1rem",
  "2xl": "1.25rem",
} as const;

export const SPACING = {
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
} as const;

export const TEXT = {
  xs: "0.75rem / 1.25",
  sm: "0.875rem / 1.5",
  base: "1rem / 1.5",
  lg: "1.125rem / 1.6",
  xl: "1.25rem / 1.6",
  "2xl": "1.5rem / 1.4",
  "3xl": "1.875rem / 1.3",
} as const;

export const SHADOWS = {
  xs: "0 1px 2px rgb(28 33 29 / 0.04)",
  sm: "0 1px 2px rgb(28 33 29 / 0.05), 0 1px 3px rgb(28 33 29 / 0.06)",
  md: "0 4px 8px rgb(28 33 29 / 0.06), 0 8px 24px rgb(28 33 29 / 0.08)",
  lg: "0 12px 24px rgb(28 33 29 / 0.1), 0 24px 48px rgb(28 33 29 / 0.12)",
  card: "0 1px 2px rgb(28 33 29 / 0.04), 0 2px 8px rgb(28 33 29 / 0.04)",
  nav: "0 -1px 0 rgb(28 33 29 / 0.06), 0 -8px 24px rgb(28 33 29 / 0.08)",
  fab: "0 4px 14px rgb(15 118 110 / 0.35), 0 2px 6px rgb(28 33 29 / 0.08)",
  modal: "0 24px 64px rgb(28 33 29 / 0.2)",
} as const;

export const Z_INDEX = {
  header: 30,
  sidebar: 40,
  tabbar: 40,
  fab: 50,
  modal: 100,
  toast: 110,
} as const;

export const RING = "rgb(15 118 110 / 0.18)";