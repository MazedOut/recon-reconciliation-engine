/**
 * By-Tool view = raw per-source claims, unreconciled, for auditing a tool's track record.
 * DYNAMICALLY discovers all sources from the event data — no hardcoded tool list.
 * Sort within each tool column by timestamp descending.
 */
import React, { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { theme } from "../theme/theme";
import { SourceBadge } from "./SourceBadge";

export interface ByToolViewProps {
  events: any[];
  decisions: any[];
  sourceFilter: string; // Dynamic string, not hardcoded union
  onSelectEvent: (eventId: string) => void;
}

export const ByToolView: React.FC<ByToolViewProps> = ({ events, decisions, sourceFilter, onSelectEvent }) => {

  // DYNAMIC: Discover all unique sources from the actual data
  const sources = useMemo(() => {
    const unique = [...new Set(events.map((e: any) => e.source))].sort();
    return unique;
  }, [events]);

  // Memoize the event-to-outcome mapping
  const outcomeMap = useMemo(() => {
    const map = new Map<string, "won" | "lost" | "unanimous">();

    for (const dec of decisions) {
      const hasConflict = dec.losing_event_ids && dec.losing_event_ids.length > 0;

      if (dec.winning_event_id) {
        map.set(dec.winning_event_id, hasConflict ? "won" : "unanimous");
      }

      if (hasConflict) {
        for (const loserId of dec.losing_event_ids) {
          map.set(loserId, "lost");
        }
      }
    }
    return map;
  }, [decisions]);

  // Empty state
  if (events.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "64px 24px",
          gap: "16px",
        }}
      >
        <div style={{ fontSize: "32px" }}>📡</div>
        <div style={{ fontFamily: theme.font.mono, color: theme.colors.textDim, fontSize: "14px" }}>
          No tool data ingested yet
        </div>
        <div style={{ fontFamily: theme.font.sans, color: theme.colors.textDim, fontSize: "13px", textAlign: "center", maxWidth: "400px" }}>
          Ingest security events to see per-tool raw claims and audit each scanner's track record.
        </div>
      </motion.div>
    );
  }

  const visibleSources = sourceFilter === "all" ? sources : sources.filter((s) => s === sourceFilter);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(280px, 1fr))`,
        gap: "16px",
        alignItems: "start",
      }}
    >
      <AnimatePresence mode="popLayout">
        {visibleSources.map((source, colIndex) => {
          // Filter and sort events for this column
          const columnEvents = events
            .filter((e: any) => e.source === source)
            .sort(
              (a: any, b: any) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

          // Tally outcomes
          let won = 0, lost = 0, unanimous = 0;
          for (const e of columnEvents) {
            const out = outcomeMap.get(e.id);
            if (out === "won") won++;
            if (out === "lost") lost++;
            if (out === "unanimous") unanimous++;
          }

          return (
            <motion.div
              key={source}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, delay: colIndex * 0.05 }}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                backgroundColor: theme.colors.surface,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.md,
                padding: "16px",
              }}
            >
              {/* Header / Summary Strip */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  borderBottom: `1px solid ${theme.colors.border}`,
                  paddingBottom: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <SourceBadge source={source} />
                  <span style={{ fontFamily: theme.font.mono, fontSize: "11px", color: theme.colors.textDim }}>
                    {columnEvents.length} events
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    fontFamily: theme.font.mono,
                    fontSize: "11px",
                    color: theme.colors.textDim,
                  }}
                >
                  <span style={{ color: theme.colors.yellow }}>{won} RESOLVED</span> /
                  <span style={{ color: theme.colors.textDim }}>{lost} OVERRIDDEN</span> /
                  <span style={{ color: theme.colors.resolved }}>{unanimous} CORROBORATED</span>
                </div>
              </div>

              {/* Event List */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  maxHeight: "60vh",
                  overflowY: "auto",
                }}
              >
                {columnEvents.length === 0 && (
                  <div style={{ color: theme.colors.textDim, fontSize: "12px", fontFamily: theme.font.mono, padding: "12px 0", textAlign: "center" }}>
                    No events from this source
                  </div>
                )}
                {columnEvents.map((evt: any, evtIndex: number) => {
                  const outcome = outcomeMap.get(evt.id);

                  return (
                    <motion.div
                      key={evt.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: evtIndex * 0.03 }}
                      onClick={() => onSelectEvent(evt.id)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        cursor: "pointer",
                        padding: "8px",
                        backgroundColor: theme.colors.bg,
                        borderRadius: theme.radius.sm,
                        border: `1px solid ${outcome === "won" ? theme.colors.yellowDim : theme.colors.border}`,
                        opacity: outcome === "lost" ? 0.6 : 1,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontFamily: theme.font.mono, fontSize: "11px", color: theme.colors.textDim }}>
                          {new Date(evt.timestamp).toISOString().split("T")[1]?.slice(0, 8) || "—"}
                        </span>
                        {outcome && <SourceBadge source={source} outcome={outcome} size="sm" />}
                      </div>

                      <span
                        style={{
                          fontFamily: theme.font.mono,
                          fontSize: "12px",
                          color: theme.colors.text,
                          wordBreak: "break-all",
                        }}
                      >
                        {evt.entity?.type || "?"}: {evt.entity?.identifier || "unknown"}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          color: theme.colors.textDim,
                          marginTop: "4px",
                          fontFamily: theme.font.mono,
                          wordBreak: "break-all",
                        }}
                      >
                        {JSON.stringify(evt.data)}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
};