import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { theme } from "../theme/theme";
import { Bell, LogOut, Clock, AlertTriangle } from "lucide-react";

export interface TopbarProps {
  runId?: string;
  isTimeTravelActive: boolean;
  onResetTimeTravel: () => void;
  onLogout: () => void;
  onIngestClick: () => void;
  notificationCount?: number;
}

export const Topbar: React.FC<TopbarProps> = ({
  runId,
  isTimeTravelActive,
  onResetTimeTravel,
  onLogout,
  onIngestClick,
  notificationCount = 3,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header
      style={{
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        backgroundColor: theme.colors.bg,
        borderBottom: `1px solid ${theme.colors.border}`,
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Subtle Run ID */}
        {runId && (
          <span style={{ fontFamily: theme.font.mono, fontSize: "11px", color: theme.colors.textDim, backgroundColor: theme.colors.surface, padding: "4px 12px", borderRadius: theme.radius.sm, border: `1px dashed ${theme.colors.border}` }}>
            RUN: {runId}
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        {/* Time Travel Reset */}
        <AnimatePresence>
          {isTimeTravelActive && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 20 }}
              onClick={onResetTimeTravel}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: `${theme.colors.yellow}15`,
                border: `1px solid ${theme.colors.yellowDim}`,
                color: theme.colors.yellow,
                padding: "6px 16px",
                borderRadius: "20px",
                fontFamily: theme.font.mono,
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
              whileHover={{ backgroundColor: `${theme.colors.yellow}25` }}
            >
              <Clock size={14} />
              TIME TRAVEL ACTIVE — CLICK TO RESET
            </motion.button>
          )}
        </AnimatePresence>

        <button
          onClick={onIngestClick}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: theme.colors.surfaceRaised,
            border: `1px solid ${theme.colors.border}`,
            color: theme.colors.text,
            padding: "6px 16px",
            borderRadius: theme.radius.sm,
            fontFamily: theme.font.mono,
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
          onMouseOver={(e) => { e.currentTarget.style.borderColor = theme.colors.yellow; e.currentTarget.style.color = theme.colors.yellow; }}
          onMouseOut={(e) => { e.currentTarget.style.borderColor = theme.colors.border; e.currentTarget.style.color = theme.colors.text; }}
        >
          + INGEST TELEMETRY
        </button>

        {/* Notifications */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              background: "transparent",
              border: "none",
              color: theme.colors.textDim,
              cursor: "pointer",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px",
            }}
          >
            <Bell size={20} />
            {notificationCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "4px",
                  right: "6px",
                  backgroundColor: theme.colors.conflict,
                  color: "#fff",
                  fontSize: "9px",
                  fontWeight: "bold",
                  fontFamily: theme.font.sans,
                  width: "14px",
                  height: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                }}
              >
                {notificationCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "8px",
                  width: "320px",
                  backgroundColor: theme.colors.surfaceRaised,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.md,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${theme.colors.border}`, paddingBottom: "8px" }}>
                  <span style={{ fontFamily: theme.font.sans, fontSize: "14px", fontWeight: 600 }}>System Alerts</span>
                  <span style={{ fontFamily: theme.font.mono, fontSize: "10px", color: theme.colors.yellow, cursor: "pointer" }}>Mark all read</span>
                </div>
                
                {[
                  { msg: "Critical Conflict Detected on 10.0.0.5", time: "2 min ago" },
                  { msg: "Late event received from BURP", time: "5 min ago" },
                  { msg: "Confidence threshold exceeded for Host 10.0.0.5", time: "8 min ago" },
                ].map((notif, i) => (
                  <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "8px", backgroundColor: theme.colors.bg, borderRadius: theme.radius.sm }}>
                    <AlertTriangle size={16} color={theme.colors.conflict} style={{ flexShrink: 0, marginTop: "2px" }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{ fontFamily: theme.font.sans, fontSize: "12px", color: theme.colors.text }}>{notif.msg}</span>
                      <span style={{ fontFamily: theme.font.mono, fontSize: "10px", color: theme.colors.textDim }}>{notif.time}</span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div style={{ width: "1px", height: "24px", backgroundColor: theme.colors.border }} />

        {/* Logout */}
        <button
          onClick={onLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "transparent",
            color: theme.colors.textDim,
            border: "none",
            fontFamily: theme.font.sans,
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
            transition: "color 0.2s",
          }}
          onMouseOver={(e) => e.currentTarget.style.color = theme.colors.text}
          onMouseOut={(e) => e.currentTarget.style.color = theme.colors.textDim}
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  );
};
