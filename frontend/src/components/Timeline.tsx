import React, { useRef, useEffect } from "react";
import { motion } from "motion/react";
import { theme } from "../theme/theme";
import { SourceBadge } from "./SourceBadge";

export interface TimelineProps {
  events: Array<{
    id: string;
    source: string;
    timestamp: string;
    is_late: boolean;
  }>;
  conflictingEventIds?: Set<string>;
  onSelectEvent: (eventId: string) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  events,
  conflictingEventIds = new Set(),
  onSelectEvent,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to end (most recent) when events change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [events]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        display: "flex",
        alignItems: "center",
        padding: "64px 32px",
        overflowX: "auto",
        gap: "48px", // Increased gap to prevent overlap
        backgroundColor: theme.colors.bg,
        minHeight: "180px",
      }}
    >
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "48px", minWidth: "max-content", paddingRight: "32px" }}>
        {/* Horizontal Connector Line */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "0",
            right: "0",
            height: "2px",
            backgroundColor: theme.colors.border,
            transform: "translateY(-50%)",
            zIndex: 0,
          }}
        />

        {events.map((event, index) => {
        const isConflict = conflictingEventIds.has(event.id);
        const nodeColor = event.is_late
          ? theme.colors.lateEvent
          : isConflict
          ? theme.colors.conflict
          : theme.colors.resolved;

        // Alternate label positioning (top / bottom) to completely eliminate overlap
        const isTop = index % 2 === 0;

        return (
          <motion.div
            key={event.id}
            layoutId={event.id}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={() => onSelectEvent(event.id)}
            whileHover={{ scale: 1.15 }}
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              zIndex: 1,
              cursor: "pointer",
              minWidth: "24px",
            }}
          >
            {/* Metadata Label: Alternate Top/Bottom */}
            <motion.div
              initial={{ opacity: 0, y: isTop ? 10 : -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              style={{
                position: "absolute",
                [isTop ? "bottom" : "top"]: "28px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
                backgroundColor: theme.colors.surfaceRaised,
                padding: "6px 10px",
                borderRadius: theme.radius.sm,
                border: `1px solid ${theme.colors.border}`,
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              <SourceBadge source={event.source as any} size="sm" />
              <span
                style={{
                  fontFamily: theme.font.mono,
                  fontSize: "11px",
                  color: theme.colors.text,
                  fontWeight: 600,
                }}
              >
                {new Date(event.timestamp).toISOString().split("T")[1].slice(0, 8)}
              </span>
              
              {/* Connector from label to node */}
              <div
                style={{
                  position: "absolute",
                  [isTop ? "bottom" : "top"]: "-12px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "1px",
                  height: "12px",
                  backgroundColor: theme.colors.border,
                }}
              />
            </motion.div>

            {/* The Timeline Node */}
            <motion.div
              animate={
                isConflict
                  ? { boxShadow: [`0 0 0px ${nodeColor}`, `0 0 12px ${nodeColor}`, `0 0 0px ${nodeColor}`] }
                  : {}
              }
              transition={
                isConflict ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" } : {}
              }
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: nodeColor,
                border: `3px solid ${theme.colors.surface}`,
                position: "relative",
              }}
            >
              {/* Inner dot for late events */}
              {event.is_late && (
                <div style={{
                  position: "absolute",
                  inset: "4px",
                  backgroundColor: theme.colors.bg,
                  borderRadius: "50%"
                }} />
              )}
            </motion.div>
          </motion.div>
        );
        })}
      </div>
    </div>
  );
};