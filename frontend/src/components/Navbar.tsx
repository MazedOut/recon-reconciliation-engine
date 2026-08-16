/**
 * Navbar — Professional sticky top navigation bar for the SOC Reconciliation Engine.
 *
 * Features:
 * - Branding with live glowing status badge ("Engine: Online")
 * - View switcher tabs with animated active indicator
 * - Global controls: Time Travel indicator, filter reset, Logout
 * - Dark-mode SOC/hazard aesthetic
 */
import React from "react";
import { motion } from "motion/react";
import { theme } from "../theme/theme";

export interface NavbarProps {
  activeView: "main" | "byTool";
  onViewChange: (v: "main" | "byTool") => void;
  isTimeTravelActive: boolean;
  onResetTimeTravel?: () => void;
  onLogout: () => void;
  runId?: string;
}

const TABS = [
  { key: "main" as const, label: "Reconciled Truth" },
  { key: "byTool" as const, label: "Raw By-Tool Audit" },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onViewChange,
  isTimeTravelActive,
  onResetTimeTravel,
  onLogout,
  runId,
}) => {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: "56px",
        backgroundColor: "rgba(10, 10, 10, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: `1px solid ${theme.colors.border}`,
      }}
    >
      {/* ─── Left: Branding & Status ─── */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0 }}>
        <h1
          style={{
            fontFamily: theme.font.mono,
            fontSize: "15px",
            fontWeight: 700,
            color: theme.colors.text,
            margin: 0,
            whiteSpace: "nowrap",
            letterSpacing: "-0.01em",
          }}
        >
          SOC Reconciliation Engine
        </h1>

        {/* Live Status Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "3px 10px",
            borderRadius: "12px",
            backgroundColor: "rgba(74, 222, 128, 0.08)",
            border: "1px solid rgba(74, 222, 128, 0.2)",
          }}
        >
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "#4ade80",
              animation: "statusPulse 2s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontFamily: theme.font.mono,
              fontSize: "10px",
              color: "#4ade80",
              fontWeight: 600,
              letterSpacing: "0.05em",
            }}
          >
            ENGINE: ONLINE
          </span>
        </div>

        {/* Run ID badge (subtle) */}
        {runId && (
          <span
            style={{
              fontFamily: theme.font.mono,
              fontSize: "10px",
              color: theme.colors.textDim,
              display: "none", // Hidden on smaller screens via media query fallback
            }}
            className="run-id-badge"
          >
            {runId.slice(0, 8)}
          </span>
        )}
      </div>

      {/* ─── Center: View Switcher Tabs ─── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "4px",
          backgroundColor: theme.colors.surfaceRaised,
          borderRadius: theme.radius.md,
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeView === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onViewChange(tab.key)}
              style={{
                position: "relative",
                padding: "6px 16px",
                backgroundColor: "transparent",
                color: isActive ? theme.colors.text : theme.colors.textDim,
                border: "none",
                borderRadius: theme.radius.sm,
                fontFamily: theme.font.mono,
                fontSize: "12px",
                fontWeight: isActive ? 600 : 400,
                cursor: "pointer",
                transition: "color 0.2s",
                zIndex: 1,
              }}
            >
              {tab.label}
              {/* Animated active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: theme.colors.surface,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.radius.sm,
                    zIndex: -1,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Right: Controls ─── */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
        {/* Time Travel Indicator */}
        {isTimeTravelActive && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={onResetTimeTravel}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: `${theme.colors.yellow}15`,
              border: `1px solid ${theme.colors.yellowDim}`,
              color: theme.colors.yellow,
              padding: "4px 12px",
              borderRadius: "12px",
              fontFamily: theme.font.mono,
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            whileHover={{ backgroundColor: `${theme.colors.yellow}25` }}
          >
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              ⏳
            </motion.span>
            TIME TRAVEL
            <span style={{ fontSize: "9px", opacity: 0.7 }}>✕ RESET</span>
          </motion.button>
        )}

        {/* Logout */}
        <button
          onClick={onLogout}
          style={{
            backgroundColor: "transparent",
            color: theme.colors.textDim,
            border: `1px solid ${theme.colors.border}`,
            padding: "6px 14px",
            borderRadius: theme.radius.sm,
            fontFamily: theme.font.mono,
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
            letterSpacing: "0.03em",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = theme.colors.text;
            e.currentTarget.style.color = theme.colors.text;
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = theme.colors.border;
            e.currentTarget.style.color = theme.colors.textDim;
          }}
        >
          LOGOUT
        </button>
      </div>
    </nav>
  );
};
