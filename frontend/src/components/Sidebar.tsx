import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { theme } from "../theme/theme";
import { ShieldAlert, Database, BarChart2, Activity, Map, Cpu } from "lucide-react";

export interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const NAV_ITEMS = [
  { id: "main", label: "Reconciled Truth", icon: <ShieldAlert size={18} /> },
  { id: "byTool", label: "Raw Audits", icon: <Database size={18} /> },
  { id: "analytics", label: "Analytics & Graphs", icon: <BarChart2 size={18} /> },
  { id: "network", label: "Network Map", icon: <Map size={18} /> },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  return (
    <nav
      style={{
        width: "260px",
        height: "100vh",
        position: "sticky",
        top: 0,
        display: "flex",
        flexDirection: "column",
        backgroundColor: theme.colors.surface,
        borderRight: `1px solid ${theme.colors.border}`,
        padding: "24px 16px",
        zIndex: 50,
      }}
    >
      {/* Brand Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px", paddingLeft: "8px" }}>
        <div style={{ padding: "8px", backgroundColor: `${theme.colors.yellow}15`, borderRadius: theme.radius.sm, border: `1px solid ${theme.colors.yellowDim}` }}>
          <Cpu size={24} color={theme.colors.yellow} />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: theme.font.mono, fontSize: "14px", fontWeight: 700, color: theme.colors.text }}>SOC RECON</span>
          <span style={{ fontFamily: theme.font.mono, fontSize: "10px", color: theme.colors.textDim, letterSpacing: "0.1em" }}>ENGINE V0.1</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
        <span style={{ fontFamily: theme.font.mono, fontSize: "11px", color: theme.colors.textDim, marginBottom: "8px", paddingLeft: "8px", letterSpacing: "0.05em" }}>VIEWS</span>
        
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                backgroundColor: "transparent",
                border: "none",
                borderRadius: theme.radius.sm,
                color: isActive ? theme.colors.text : theme.colors.textDim,
                fontFamily: theme.font.sans,
                fontSize: "14px",
                fontWeight: isActive ? 600 : 400,
                cursor: "pointer",
                textAlign: "left",
                transition: "color 0.2s",
                zIndex: 1,
              }}
            >
              {item.icon}
              {item.label}
              
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="sidebarActiveIndicator"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundColor: theme.colors.surfaceRaised,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.radius.sm,
                      zIndex: -1,
                    }}
                  >
                    <div style={{ position: "absolute", left: 0, top: "20%", bottom: "20%", width: "3px", backgroundColor: theme.colors.yellow, borderRadius: "0 2px 2px 0" }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>

      {/* System Status Footer */}
      <div style={{ marginTop: "auto", borderTop: `1px solid ${theme.colors.border}`, paddingTop: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px" }}>
          <Activity size={18} color={theme.colors.resolved} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: theme.font.mono, fontSize: "11px", color: theme.colors.text }}>SYSTEM ONLINE</span>
            <span style={{ fontFamily: theme.font.mono, fontSize: "10px", color: theme.colors.resolved }}>99.9% Uptime</span>
          </div>
        </div>
      </div>
    </nav>
  );
};
