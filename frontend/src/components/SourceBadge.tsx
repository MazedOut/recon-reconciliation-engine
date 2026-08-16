/**
 * SourceBadge — visual provenance indicator for each security tool.
 * Supports dynamic/unknown sources with fallback colors.
 * Outcome states: won (yellow check), lost (desaturated), unanimous (neutral).
 */
import React from "react";
import { motion } from "motion/react";
import { theme } from "../theme/theme";

const SOURCE_COLORS: Record<string, string> = {
  snort: theme.colors.sources.snort,
  nmap: theme.colors.sources.nmap,
  burp: theme.colors.sources.burp,
  powershell: theme.colors.sources.powershell,
};

// Deterministic color generation for unknown/custom sources
function getSourceColor(source: string): string {
  if (SOURCE_COLORS[source]) return SOURCE_COLORS[source];
  // Hash-based fallback: pick a muted hue from the source name
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = source.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 35%, 55%)`;
}

export interface SourceBadgeProps {
  source: string;
  outcome?: "won" | "lost" | "unanimous";
  size?: "sm" | "md";
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({ source, outcome, size = "md" }) => {
  const baseColor = getSourceColor(source);

  const isLost = outcome === "lost";
  const isWon = outcome === "won";

  const badgeStyle: React.CSSProperties = {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: theme.font.mono,
    fontSize: size === "sm" ? "10px" : "12px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: size === "sm" ? "2px 6px" : "4px 8px",
    borderRadius: theme.radius.sm,
    backgroundColor: isLost ? "transparent" : `${baseColor}20`,
    border: `1px solid ${isLost ? theme.colors.losing : baseColor}`,
    color: isLost ? theme.colors.losing : baseColor,
    filter: isLost ? "saturate(0.5)" : "none",
    transition: "all 0.2s ease-in-out",
  };

  return (
    <motion.div
      layout
      transition={theme.transitions.default}
      style={badgeStyle}
      title={`Source: ${source.toUpperCase()}${outcome ? ` (${outcome})` : ""}`}
    >
      {source}

      {/* Won Outcome: Small yellow check-tick corner */}
      {isWon && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={theme.transitions.default}
          style={{
            position: "absolute",
            top: "-4px",
            right: "-4px",
            backgroundColor: theme.colors.yellow,
            color: theme.colors.bg,
            borderRadius: "50%",
            width: "12px",
            height: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </motion.div>
      )}
    </motion.div>
  );
};