/**
 * Shows a single entity's conflicting events and the resolution outcome.
 * Animation sequence on mount/update (motion.dev):
 *   1. Losing events shake briefly (x: [0,-4,4,0]) then fade to
 *      theme.colors.losing and scale down slightly.
 *   2. Winning event snaps forward (scale 1 -> 1.05 -> 1) with a
 *      boxShadow glow using theme.colors.yellowGlow.
 *   3. decision.rule_applied text types in character-by-character
 *      (staggered children, ~15ms per char).
 */
import React from "react";
import { motion } from "motion/react";
import { theme } from "../theme/theme";
import { SourceBadge } from "./SourceBadge";
import { ScoreBreakdownBar } from "./ScoreBreakdownBar";

export interface ConflictCardProps {
  decision: any;
  events: any[];
  onExpand: () => void;
}

export const ConflictCard: React.FC<ConflictCardProps> = ({ decision, events, onExpand }) => {
  // Null safety: bail early if decision is malformed
  if (!decision?.entity) return null;

  // 1. Separate winner and losers for rendering
  const winningEvent = events.find((e) => e.id === decision.winning_event_id);
  const losingEvents = events.filter(
    (e) => decision.losing_event_ids && decision.losing_event_ids.includes(e.id)
  );

  // 2. Typing effect variants
  const ruleContainerVariant = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.015 },
    },
  };

  const charVariant = {
    hidden: { opacity: 0 },
    show: { opacity: 1 },
  };

  const ruleText = decision.rule_applied || "no_rule";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onClick={onExpand}
      style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.radius.md,
        padding: "16px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        transition: "border-color 0.2s",
      }}
      whileHover={{
        borderColor: theme.colors.yellowDim,
      }}
    >
      {/* Header: Entity Key & Reconciled Value */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: theme.font.mono, color: theme.colors.text, fontSize: "13px" }}>
          {decision.entity.type?.toUpperCase?.() || "?"}: {decision.entity.identifier || "unknown"}
        </span>
        <span style={{ fontWeight: "bold", color: theme.colors.yellow, fontFamily: theme.font.mono, fontSize: "12px" }}>
          {JSON.stringify(decision.value)}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Winning Event Animation */}
        {winningEvent && (
          <motion.div
            initial={{ scale: 1, boxShadow: "none" }}
            animate={{
              scale: [1, 1.02, 1],
              boxShadow: ["none", `0 0 12px ${theme.colors.yellowGlow}`, "none"],
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 8px",
              borderRadius: theme.radius.sm,
              backgroundColor: `${theme.colors.yellow}08`,
            }}
          >
            <SourceBadge source={winningEvent.source} outcome="won" />
            <span style={{ fontFamily: theme.font.mono, fontSize: "12px", color: theme.colors.text }}>
              {new Date(winningEvent.timestamp).toISOString().split("T")[1]?.slice(0, 8) || "—"}
            </span>
          </motion.div>
        )}

        {/* Losing Events Animation */}
        {losingEvents.map((loser: any) => (
          <motion.div
            key={loser.id}
            initial={{ x: 0, opacity: 1, scale: 1 }}
            animate={{
              x: [0, -4, 4, -2, 2, 0],
              opacity: 0.5,
              scale: 0.95,
            }}
            transition={{ duration: 0.5 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 8px",
              borderRadius: theme.radius.sm,
            }}
          >
            <SourceBadge source={loser.source} outcome="lost" />
            <span style={{ fontFamily: theme.font.mono, fontSize: "12px", color: theme.colors.losing }}>
              {new Date(loser.timestamp).toISOString().split("T")[1]?.slice(0, 8) || "—"}
            </span>
          </motion.div>
        ))}

        {/* No events found at all — empty state */}
        {!winningEvent && losingEvents.length === 0 && (
          <div style={{ fontSize: "12px", color: theme.colors.textDim, fontFamily: theme.font.mono }}>
            No matching events found in dataset
          </div>
        )}
      </div>

      {/* Rule Applied Typing Animation */}
      <motion.div
        variants={ruleContainerVariant}
        initial="hidden"
        animate="show"
        style={{
          fontFamily: theme.font.mono,
          fontSize: "12px",
          color: theme.colors.textDim,
          marginTop: "8px",
          paddingTop: "8px",
          borderTop: `1px solid ${theme.colors.border}`,
        }}
      >
        <span>RULE_APPLIED: </span>
        {ruleText.split("").map((char: string, index: number) => (
          <motion.span key={index} variants={charVariant}>
            {char}
          </motion.span>
        ))}
      </motion.div>

      {/* Score Breakdown Bar — uses 'score' alias */}
      <ScoreBreakdownBar score={decision.score_breakdown} />
    </motion.div>
  );
};