/**
 * Audit trail as an expandable accordion. Each row is one AuditRecord;
 * clicking expands via AnimatePresence to reveal narrative text,
 * ScoreBreakdownBar, and the inputs_considered as event chips.
 *
 * Staggered list entrance + staggered content on expand.
 */
import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { theme } from "../theme/theme";
import { ScoreBreakdownBar } from "./ScoreBreakdownBar";
import { SourceBadge } from "./SourceBadge";

export interface AuditAccordionProps {
  records: any[];
}

export const AuditAccordion: React.FC<AuditAccordionProps> = ({ records }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Staggered content variants
  const containerVariants = {
    hidden: { opacity: 0, height: 0 },
    show: {
      opacity: 1,
      height: "auto",
      transition: {
        height: { duration: 0.3, ease: "easeOut" },
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      height: 0,
      transition: { duration: 0.2, ease: "easeIn" },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -10 },
    show: { opacity: 1, y: 0, transition: theme.transitions.default },
  };

  // Empty state
  if (!records || records.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          gap: "12px",
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.md,
          border: `1px dashed ${theme.colors.border}`,
        }}
      >
        <div style={{ fontSize: "24px" }}>📋</div>
        <div style={{ fontFamily: theme.font.mono, color: theme.colors.textDim, fontSize: "13px" }}>
          No audit records yet
        </div>
        <div style={{ fontFamily: theme.font.sans, color: theme.colors.textDim, fontSize: "12px", textAlign: "center" }}>
          Reconciliation decisions will generate a full audit trail with narratives and score breakdowns.
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: { staggerChildren: 0.05 },
        },
      }}
      style={{ display: "flex", flexDirection: "column", gap: "8px" }}
    >
      {records.map((record, index) => {
        if (!record?.entity) return null;
        const recordId = `${record.entity.identifier}-${index}`;
        const isExpanded = expandedId === recordId;

        return (
          <motion.div
            key={recordId}
            variants={{
              hidden: { opacity: 0, y: 8 },
              show: { opacity: 1, y: 0 },
            }}
            style={{
              backgroundColor: theme.colors.surface,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radius.md,
              overflow: "hidden",
            }}
          >
            {/* Accordion Header */}
            <div
              onClick={() => setExpandedId(isExpanded ? null : recordId)}
              style={{
                padding: "12px 16px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: isExpanded ? theme.colors.surfaceRaised : "transparent",
                transition: "background-color 0.2s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <motion.span
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    display: "inline-block",
                    fontFamily: theme.font.mono,
                    fontSize: "12px",
                    color: theme.colors.textDim,
                  }}
                >
                  ▶
                </motion.span>
                <span style={{ fontFamily: theme.font.mono, color: theme.colors.text, fontSize: "13px" }}>
                  {record.entity.type?.toUpperCase?.() || "?"}: {record.entity.identifier || "unknown"}
                </span>
              </div>
              <span style={{ color: theme.colors.textDim, fontSize: "11px", fontFamily: theme.font.mono }}>
                {record.reconciled_at
                  ? new Date(record.reconciled_at).toISOString().split("T")[1]?.slice(0, 8)
                  : "—"}
              </span>
            </div>

            {/* Accordion Body */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  style={{ padding: "0 16px" }}
                >
                  <div
                    style={{
                      paddingBottom: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                    }}
                  >
                    {/* 1. Narrative */}
                    <motion.div
                      variants={itemVariants}
                      style={{
                        color: theme.colors.text,
                        fontSize: "14px",
                        lineHeight: 1.6,
                        fontFamily: theme.font.sans,
                        padding: "12px",
                        backgroundColor: theme.colors.bg,
                        borderRadius: theme.radius.sm,
                        borderLeft: `3px solid ${theme.colors.yellowDim}`,
                      }}
                    >
                      {record.narrative || "No narrative generated."}
                    </motion.div>

                    {/* 2. Inputs Considered Chips */}
                    <motion.div
                      variants={itemVariants}
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: "11px", color: theme.colors.textDim, fontFamily: theme.font.mono }}>
                        INPUTS:
                      </span>
                      {(record.inputs_considered || []).map((eventId: string) => {
                        const isWinner = eventId === record.decision?.winning_event_id;
                        // Derive source from event ID hint or use generic label
                        let derivedSource = "unknown";
                        for (const src of ["snort", "nmap", "burp", "powershell"]) {
                          if (eventId.toLowerCase().includes(src)) {
                            derivedSource = src;
                            break;
                          }
                        }
                        return (
                          <span key={eventId} title={eventId}>
                            <SourceBadge
                              source={derivedSource}
                              outcome={isWinner ? "won" : "lost"}
                              size="sm"
                            />
                          </span>
                        );
                      })}
                    </motion.div>

                    {/* 3. Score Breakdown */}
                    <motion.div variants={itemVariants}>
                      <ScoreBreakdownBar breakdown={record.decision?.score_breakdown} />
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
};