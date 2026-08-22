export const theme = {
  colors: {
    background: "#050816",
    surface: "#0B1023",
    primary: "#3B82F6",
    secondary: "#7C3AED",
    accent: "#8B5CF6",

    text: {
      primary: "#FFFFFF",
      secondary: "#94A3B8",
      muted: "#64748B",
    },

    border: "#1E293B",

    success: "#22C55E",
    warning: "#F59E0B",
    danger: "#EF4444",
  },

  radius: {
    sm: "8px",
    md: "12px",
    lg: "18px",
    xl: "24px",
  },

  shadow: {
    sm: "0 2px 8px rgba(0,0,0,.15)",
    md: "0 8px 24px rgba(0,0,0,.25)",
    lg: "0 20px 40px rgba(0,0,0,.35)",
  },

  transition: {
    fast: ".2s",
    normal: ".3s",
    slow: ".5s",
  },
} as const;