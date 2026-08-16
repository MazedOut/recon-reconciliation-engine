import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { theme } from "../theme/theme";
import { X, Copy, CheckCircle2 } from "lucide-react";
import { SourceBadge } from "./SourceBadge";

export interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: any | null;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({ isOpen, onClose, event }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (event) {
      navigator.clipboard.writeText(JSON.stringify(event, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && event && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              backdropFilter: "blur(4px)",
            }}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "640px",
              backgroundColor: theme.colors.surface,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: "12px",
              boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              maxHeight: "85vh",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: `1px solid ${theme.colors.border}`, backgroundColor: theme.colors.surfaceRaised }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <SourceBadge source={event.source as any} />
                <h2 style={{ margin: 0, fontFamily: theme.font.mono, fontSize: "14px", color: theme.colors.text }}>Event Detail</h2>
                {event.is_late && (
                  <span style={{ fontSize: "10px", backgroundColor: theme.colors.lateEvent, color: theme.colors.bg, padding: "2px 6px", borderRadius: "4px", fontFamily: theme.font.mono, fontWeight: "bold" }}>
                    LATE ARRIVAL
                  </span>
                )}
              </div>
              <button onClick={onClose} style={{ background: "transparent", border: "none", color: theme.colors.textDim, cursor: "pointer", padding: "4px" }}>
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "24px" }}>
              
              {/* Core Metadata */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontFamily: theme.font.mono, fontSize: "10px", color: theme.colors.textDim, letterSpacing: "0.05em" }}>EVENT ID</span>
                  <span style={{ fontFamily: theme.font.mono, fontSize: "12px", color: theme.colors.text }}>{event.id}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontFamily: theme.font.mono, fontSize: "10px", color: theme.colors.textDim, letterSpacing: "0.05em" }}>TIMESTAMP</span>
                  <span style={{ fontFamily: theme.font.mono, fontSize: "12px", color: theme.colors.text }}>{new Date(event.timestamp).toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontFamily: theme.font.mono, fontSize: "10px", color: theme.colors.textDim, letterSpacing: "0.05em" }}>ENTITY TARGET</span>
                  <span style={{ fontFamily: theme.font.mono, fontSize: "12px", color: theme.colors.yellow }}>{event.entity?.type.toUpperCase()}: {event.entity?.identifier}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontFamily: theme.font.mono, fontSize: "10px", color: theme.colors.textDim, letterSpacing: "0.05em" }}>EVENT TYPE</span>
                  <span style={{ fontFamily: theme.font.mono, fontSize: "12px", color: theme.colors.text }}>{event.event_type}</span>
                </div>
              </div>

              {/* Raw JSON Data */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: theme.font.mono, fontSize: "10px", color: theme.colors.textDim, letterSpacing: "0.05em" }}>RAW PAYLOAD</span>
                  <button
                    onClick={handleCopy}
                    style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", color: theme.colors.yellow, cursor: "pointer", fontFamily: theme.font.sans, fontSize: "11px" }}
                  >
                    {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    {copied ? "COPIED" : "COPY JSON"}
                  </button>
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: "16px",
                    backgroundColor: theme.colors.bg,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.radius.sm,
                    fontFamily: theme.font.mono,
                    fontSize: "12px",
                    color: theme.colors.text,
                    overflowX: "auto",
                    lineHeight: 1.5,
                  }}
                >
                  {JSON.stringify(event.data, null, 2)}
                </pre>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
