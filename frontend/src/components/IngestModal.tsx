import React, { useState } from "react";
import { motion } from "motion/react";
import { theme } from "../theme/theme";
import { X, FileJson } from "lucide-react";

export interface IngestModalProps {
  runId: string;
  onClose: () => void;
  onIngestSuccess: (newRun: any) => void;
}

export const IngestModal: React.FC<IngestModalProps> = ({ runId, onClose, onIngestSuccess }) => {
  const [jsonText, setJsonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleIngest = async () => {
    if (!jsonText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // Create a blob from the JSON text to simulate a file upload for the /ingest endpoint
      const blob = new Blob([jsonText], { type: "application/json" });
      const formData = new FormData();
      formData.append("file", blob, "telemetry.json");

      const token = localStorage.getItem("recon_auth_token");

      // 1. Ingest to get parsed events
      const ingestRes = await fetch("http://localhost:8000/ingest", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
      if (!ingestRes.ok) throw new Error("Failed to parse telemetry data");
      const { events } = await ingestRes.json();

      if (!events || events.length === 0) {
        throw new Error("No valid events found in telemetry");
      }

      // 2. Replay the existing run with the new extra_events
      const replayRes = await fetch(`http://localhost:8000/replay/${runId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          extra_events: events,
          injected_now: new Date().toISOString()
        })
      });
      
      if (!replayRes.ok) throw new Error("Failed to integrate telemetry into engine");
      const updatedRun = await replayRes.json();

      onIngestSuccess(updatedRun);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.7)" }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          width: "600px",
          backgroundColor: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radius.md,
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontFamily: theme.font.mono, color: theme.colors.text }}>INGEST TELEMETRY DATA</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: theme.colors.textDim, cursor: "pointer" }}><X size={20} /></button>
        </div>

        <p style={{ margin: 0, fontSize: "13px", color: theme.colors.textDim, fontFamily: theme.font.sans }}>
          Paste raw JSON telemetry (or an array of events) directly into the engine. It will be parsed, validated, and chronologically woven into the existing incident timeline.
        </p>

        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder='[{"source": "snort", "timestamp": "...", "event_type": "ids_alert", "data": {}}]'
          style={{
            width: "100%",
            height: "200px",
            backgroundColor: theme.colors.bg,
            border: `1px solid ${theme.colors.border}`,
            color: theme.colors.text,
            fontFamily: theme.font.mono,
            fontSize: "12px",
            padding: "12px",
            borderRadius: theme.radius.sm,
            resize: "none",
            boxSizing: "border-box"
          }}
        />

        {error && (
          <div style={{ color: theme.colors.sources.snort, fontSize: "12px", fontFamily: theme.font.mono, padding: "8px", backgroundColor: `${theme.colors.sources.snort}12`, borderRadius: theme.radius.sm, border: `1px solid ${theme.colors.sources.snort}30` }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${theme.colors.border}`, color: theme.colors.text, borderRadius: theme.radius.sm, cursor: "pointer", fontFamily: theme.font.mono, fontSize: "12px" }}>
            CANCEL
          </button>
          <button onClick={handleIngest} disabled={loading} style={{ padding: "8px 16px", backgroundColor: theme.colors.yellow, color: theme.colors.bg, border: "none", borderRadius: theme.radius.sm, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: theme.font.mono, fontSize: "12px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}>
            <FileJson size={14} />
            {loading ? "PROCESSING..." : "INGEST & ANALYZE"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
