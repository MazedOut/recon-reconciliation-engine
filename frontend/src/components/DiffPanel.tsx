/**
 * Shows the output of api.diff() after a what-if replay.
 * Changed entities get a yellow "flip" animation (rotateX).
 * Blast-radius entities get an infinite boxShadow pulse.
 */
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { theme } from "../theme/theme";

export interface DiffPanelProps {
  diffs: any[];
}

export const DiffPanel: React.FC<DiffPanelProps> = ({ diffs }) => {
  if (!diffs || diffs.length === 0) return null;

  const meaningfulDiffs = diffs.filter(
    (d) => d.changed || (d.blast_radius && d.blast_radius.length > 0)
  );

  if (meaningfulDiffs.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", perspective: "1000px" }}>
      <AnimatePresence mode="popLayout">
        {meaningfulDiffs.map((diff, i) => {
          const hasDirectChange = diff.changed;
          const inBlastRadius = diff.blast_radius && diff.blast_radius.length > 0;

          return (
            <motion.div
              key={`${diff.entity?.identifier || i}-${i}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {/* Direct Change: 3D Flip */}
              {hasDirectChange && (
                <motion.div
                  initial={{ rotateX: -90, opacity: 0 }}
                  animate={{ rotateX: 0, opacity: 1 }}
                  transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
                  style={{
                    backgroundColor: theme.colors.bg,
                    border: `1px solid ${theme.colors.yellowDim}`,
                    borderRadius: theme.radius.sm,
                    padding: "14px 16px",
                    transformStyle: "preserve-3d",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", alignItems: "center" }}>
                    <span style={{ fontFamily: theme.font.mono, color: theme.colors.yellow, fontSize: "12px", fontWeight: 600 }}>
                      ⚠ {diff.entity?.type?.toUpperCase?.() || "?"}: {diff.entity?.identifier || "unknown"}
                    </span>
                  </div>
                  <div style={{ color: theme.colors.textDim, fontSize: "12px", marginBottom: "10px", fontFamily: theme.font.sans, lineHeight: 1.5 }}>
                    {diff.reason}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", fontFamily: theme.font.mono, fontSize: "12px", padding: "6px 10px", backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.radius.sm }}>
                    <span style={{ color: theme.colors.losing, textDecoration: "line-through" }}>
                      {JSON.stringify(diff.previous_value)}
                    </span>
                    <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ color: theme.colors.yellow, fontSize: "14px" }}>→</motion.span>
                    <span style={{ color: theme.colors.yellow, fontWeight: 600 }}>
                      {JSON.stringify(diff.new_value)}
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Blast Radius: Pulse */}
              {inBlastRadius && diff.blast_radius.map((brEntity: any, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, boxShadow: [`0 0 0px ${theme.colors.yellowGlow}`, `0 0 10px ${theme.colors.yellowGlow}`, `0 0 0px ${theme.colors.yellowGlow}`] }}
                  transition={{ opacity: { duration: 0.3 }, boxShadow: { repeat: Infinity, duration: 2, ease: "easeInOut" } }}
                  style={{
                    backgroundColor: theme.colors.bg,
                    border: `1px dashed ${theme.colors.border}`,
                    borderRadius: theme.radius.sm,
                    padding: "8px 14px",
                    marginLeft: "20px",
                  }}
                >
                  <span style={{ fontFamily: theme.font.mono, fontSize: "11px", color: theme.colors.textDim }}>
                    ↳ BLAST RADIUS: {brEntity?.type?.toUpperCase?.() || "?"}: {brEntity?.identifier || "unknown"} — corroboration shifted
                  </span>
                </motion.div>
              ))}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};