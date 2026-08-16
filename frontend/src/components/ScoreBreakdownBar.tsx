/**
 * Horizontal stacked bar visualizing ScoreBreakdown: source_reliability,
 * recency_decay (as a multiplier effect), corroboration_bonus, summing
 * to final_score. This is what makes confidence scoring *visible*, not
 * just a number in the audit JSON.
 *
 * Segments animate their width in on mount (motion initial/animate
 * width 0 -> value). Hover tooltips explain each scoring component.
 */
import React, { useState } from "react";
import { motion } from "motion/react";
import { theme } from "../theme/theme";
import type { ScoreBreakdown } from "../api/client";

export interface ScoreBreakdownBarProps {
  breakdown?: ScoreBreakdown;
  score?: ScoreBreakdown; // Alias accepted for convenience
}

const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
  const [show, setShow] = useState(false);
  return (
    <div
      style={{ position: "relative", display: "inline-flex", width: "100%" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: theme.colors.surfaceRaised,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.sm,
            padding: "8px 12px",
            fontSize: "11px",
            fontFamily: theme.font.sans,
            color: theme.colors.text,
            zIndex: 100,
            pointerEvents: "none",
            maxWidth: "320px",
            whiteSpace: "normal" as const,
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
};

export const ScoreBreakdownBar: React.FC<ScoreBreakdownBarProps> = (props) => {
  // Accept both prop names
  const breakdown = props.breakdown || props.score;

  // Null-safe: if no breakdown data, render a placeholder
  if (!breakdown) {
    return (
      <div style={{ fontSize: "11px", fontFamily: theme.font.mono, color: theme.colors.textDim }}>
        SCORE: —
      </div>
    );
  }

  const maxScale = 1.2;
  const reliability = breakdown.source_reliability || 0;
  const decay = breakdown.recency_decay ?? 1; // Default to 1 (no decay) if missing
  const bonus = breakdown.corroboration_bonus || 0;
  const finalScore = breakdown.final_score || 0;

  const baseScore = reliability * decay;
  const baseWidthPercent = Math.min((baseScore / maxScale) * 100, 100);
  const bonusWidthPercent = Math.min(
    (bonus / maxScale) * 100,
    100 - baseWidthPercent
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
      {/* Metrics Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "11px",
          fontFamily: theme.font.mono,
          color: theme.colors.textDim,
          flexWrap: "wrap",
          gap: "4px",
        }}
      >
        <span style={{ color: theme.colors.text, fontWeight: 600 }}>
          SCORE: {finalScore.toFixed(2)}
        </span>
        <span>
          Rel ({reliability.toFixed(2)}) × Decay ({decay.toFixed(2)}) + Bonus ({bonus.toFixed(2)})
        </span>
      </div>

      {/* Stacked Bar Container with Tooltips */}
      <Tooltip
        text={`Source Reliability (${reliability.toFixed(2)}): Fixed weight based on tool trustworthiness. Recency Decay (${decay.toFixed(2)}): Exponential decay with 6-hour half-life. Corroboration (+${bonus.toFixed(2)}): Bonus for independent agreeing sources.`}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "8px",
            backgroundColor: theme.colors.surfaceRaised,
            borderRadius: theme.radius.sm,
            overflow: "hidden",
            display: "flex",
            cursor: "help",
          }}
        >
          {/* Base Reliability × Recency Decay Segment */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${baseWidthPercent}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              height: "100%",
              backgroundColor: theme.colors.yellow,
            }}
          />

          {/* Corroboration Bonus Segment */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${bonusWidthPercent}%` }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            style={{
              height: "100%",
              backgroundColor: theme.colors.yellowDim,
              opacity: 0.85,
            }}
          />
        </div>
      </Tooltip>
    </div>
  );
};