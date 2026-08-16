import React from "react";
import { motion } from "motion/react";
import { theme } from "../theme/theme";
import { Network } from "lucide-react";

export const NetworkMapPlaceholder: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "400px",
        backgroundColor: theme.colors.surface,
        border: `1px dashed ${theme.colors.border}`,
        borderRadius: theme.radius.md,
        gap: "16px",
      }}
    >
      <div style={{ padding: "16px", backgroundColor: `${theme.colors.yellow}15`, borderRadius: "50%" }}>
        <Network size={32} color={theme.colors.yellow} />
      </div>
      <h3 style={{ fontFamily: theme.font.mono, color: theme.colors.text, margin: 0 }}>Network Topology Map</h3>
      <p style={{ fontFamily: theme.font.sans, color: theme.colors.textDim, fontSize: "14px", margin: 0, textAlign: "center", maxWidth: "400px" }}>
        Visualizing lateral movement and asset connections. This module is scheduled for Phase 2 deployment.
      </p>
    </motion.div>
  );
};
