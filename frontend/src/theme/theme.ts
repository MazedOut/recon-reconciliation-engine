/**
 * Yellow/black theme — treated as a hazard/SOC signal palette, not
 * decoration. Yellow is reserved for things that matter: conflicts,
 * active timeline nodes, primary CTAs. Don't apply it broadly or it
 * stops carrying meaning.
 */
export const theme = {
  colors: {
    bg: "#0a0a0a",
    surface: "#121212",
    surfaceRaised: "#1a1a1a",
    border: "#2a2a2a",
    text: "#e5e5e5",
    textDim: "#8a8a8a",

    yellow: "#facc15",
    yellowDim: "#eab308",
    yellowGlow: "rgba(250, 204, 21, 0.35)",

    resolved: "#facc15",        // solid yellow-on-black
    conflict: "#eab308",         // pulsing outline
    lateEvent: "#a16207",        // dimmer amber
    losing: "#4a4a4a",           // grayed-out overruled event

    // Per-source muted tints (low saturation, reads clearly on bg)
    sources: {
      snort: "#9c5a4d",      // muted red
      nmap: "#5b7b91",       // muted blue
      burp: "#7b6b8c",       // muted purple
      powershell: "#4a827e", // muted teal
      crowdstrike: "#a13333",// dark red
    }
  },
  font: {
    mono: "'JetBrains Mono', 'Fira Code', monospace",  // event ids, timestamps, scores
    sans: "'Inter', system-ui, sans-serif",              // UI chrome
  },
  radius: {
    sm: "4px",
    md: "8px",
  },
  // Added shared transition constants to keep timing/easing uniform across the app
  transitions: {
    default: { type: "spring", stiffness: 350, damping: 30 },
    fade: { duration: 0.2, ease: "easeInOut" },
    stagger: 0.05
  }
} as const;

export type Theme = typeof theme;