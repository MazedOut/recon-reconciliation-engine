/**
 * Time-travel scrubber with draggable playhead.
 * Scrubs across state_snapshots for point-in-time incident reconstruction.
 */
import React, { useRef, useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, useMotionValueEvent } from "motion/react";
import { theme } from "../theme/theme";

import { Info } from "lucide-react";

export interface ReplayScrubberProps {
  run: any;
  onReplayComplete: (newRun: any) => void;
  onDropEvidence: (rawEvent: unknown) => void;
  onScrubFrame: (snapshot: any) => void;
}

export const ReplayScrubber: React.FC<ReplayScrubberProps> = ({
  run,
  onReplayComplete: _onReplayComplete,
  onDropEvidence,
  onScrubFrame,
}) => {
  void _onReplayComplete;

  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);

  const snapshots = run?.state_snapshots || [];
  const totalFrames = Math.max(snapshots.length - 1, 1);
  const dragX = useMotionValue(0);
  const isInitial = useRef(true);

  useEffect(() => {
    const updateWidth = () => {
      if (trackRef.current) {
        const w = trackRef.current.offsetWidth - 32;
        setTrackWidth(w);
        if (dragX.get() === 0) {
          dragX.set(w);
          setTimeout(() => { isInitial.current = false; }, 50);
        }
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [run, dragX]);

  const frameIndex = useTransform(dragX, [0, Math.max(trackWidth, 1)], [0, totalFrames]);

  useMotionValueEvent(frameIndex, "change", (latest) => {
    if (isInitial.current) return;
    const idx = Math.round(latest);
    if (idx !== activeIndex && snapshots[idx]) {
      setActiveIndex(idx);
      onScrubFrame(snapshots[idx]);
    }
  });

  const [isDragOver, setIsDragOver] = useState(false);
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      onDropEvidence(data);
    } catch { console.error("Invalid evidence dropped"); }
  };

  // Active snapshot details
  const activeSnap = activeIndex >= 0 && snapshots[activeIndex] ? snapshots[activeIndex] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Scrubber Track */}
      <div
        ref={trackRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          position: "relative",
          height: "52px",
          backgroundColor: theme.colors.bg,
          border: `1px ${isDragOver ? "solid" : "dashed"} ${isDragOver ? theme.colors.yellowDim : theme.colors.border}`,
          borderRadius: theme.radius.sm,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          transition: "border-color 0.2s",
        }}
      >
        {/* Track Line */}
        <div style={{ position: "absolute", left: "16px", right: "16px", height: "3px", backgroundColor: theme.colors.border, borderRadius: "2px" }} />

        {/* Snapshot Tick Marks */}
        {snapshots.map((_: any, i: number) => {
          const pos = totalFrames > 0 ? (i / totalFrames) * 100 : 0;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${16 + (pos / 100) * trackWidth}px`,
                width: "2px",
                height: i === activeIndex ? "20px" : "10px",
                backgroundColor: i === activeIndex ? theme.colors.yellow : `${theme.colors.textDim}60`,
                borderRadius: "1px",
                transition: "height 0.15s, background-color 0.15s",
                transform: "translateX(-1px)",
              }}
            />
          );
        })}

        {/* Draggable Playhead */}
        <motion.div
          drag="x"
          dragConstraints={trackRef}
          dragElastic={0}
          dragMomentum={false}
          dragTransition={{ bounceStiffness: 600, bounceDamping: 30 }}
          style={{
            x: dragX,
            position: "absolute",
            width: "14px",
            height: "34px",
            backgroundColor: theme.colors.yellow,
            borderRadius: "3px",
            cursor: "grab",
            zIndex: 10,
            boxShadow: `0 0 8px ${theme.colors.yellowGlow}`,
          }}
          whileDrag={{ cursor: "grabbing", scale: 1.1, boxShadow: `0 0 16px ${theme.colors.yellowGlow}` }}
        />

        {/* Helper text with Info Tooltip */}
        <div style={{ width: "100%", position: "absolute", bottom: "4px", left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }}>
          <span style={{ color: theme.colors.textDim, fontSize: "10px", fontFamily: theme.font.mono, opacity: 0.5 }}>
            ← DRAG TO SCRUB • DROP JSON TO BRANCH →
          </span>
          <div style={{ position: "relative", display: "inline-block", cursor: "help" }} 
               onMouseEnter={() => setIsDragOver(true)} 
               onMouseLeave={() => setIsDragOver(false)}>
            <Info size={12} color={theme.colors.textDim} style={{ opacity: 0.5 }} />
            {isDragOver && (
              <div style={{
                position: "absolute",
                bottom: "100%",
                left: "50%",
                transform: "translateX(-50%)",
                marginBottom: "8px",
                width: "200px",
                padding: "8px",
                backgroundColor: theme.colors.surfaceRaised,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.sm,
                color: theme.colors.text,
                fontSize: "10px",
                fontFamily: theme.font.sans,
                textAlign: "center",
                zIndex: 50,
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
              }}>
                Drag to reconstruct the timeline. Shows how the SOC engine resolved conflicts at specific points in time before late evidence arrived.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active snapshot info */}
      {activeSnap && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          style={{
            display: "flex",
            gap: "16px",
            padding: "8px 12px",
            backgroundColor: theme.colors.bg,
            borderRadius: theme.radius.sm,
            border: `1px solid ${theme.colors.border}`,
            fontFamily: theme.font.mono,
            fontSize: "11px",
            color: theme.colors.textDim,
            flexWrap: "wrap",
          }}
        >
          <span>Frame <strong style={{ color: theme.colors.text }}>{activeIndex + 1}</strong> / {snapshots.length}</span>
          <span>Time: <strong style={{ color: theme.colors.text }}>{new Date(activeSnap.at).toISOString().split("T")[1]?.slice(0, 8)}</strong></span>
          <span>Entities: <strong style={{ color: theme.colors.yellow }}>{activeSnap.entity_states?.length || 0}</strong></span>
          {activeSnap.triggered_by_event_id && (
            <span>Trigger: <strong style={{ color: theme.colors.text }}>{activeSnap.triggered_by_event_id.replace("evt-", "")}</strong></span>
          )}
        </motion.div>
      )}
    </div>
  );
};