/**
 * Full-viewport, theme.colors.bg, centered content.
 * Restrained motion entrance: staggered fade+rise (0.05s per item).
 * Zero API calls on this route.
 */
import React from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { theme } from "../theme/theme";

export const WelcomeLanding: React.FC = () => {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: theme.colors.bg,
        color: theme.colors.text,
        padding: "24px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle animated background gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 30% 50%, rgba(250, 204, 21, 0.03) 0%, transparent 60%),
                       radial-gradient(ellipse at 70% 50%, rgba(234, 179, 8, 0.02) 0%, transparent 60%)`,
          animation: "gradientShift 8s ease-in-out infinite",
          backgroundSize: "200% 200%",
          pointerEvents: "none",
        }}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{ maxWidth: "640px", position: "relative", zIndex: 1 }}
      >
        {/* Version badge */}
        <motion.div variants={itemVariants} style={{ marginBottom: "24px" }}>
          <span
            style={{
              fontFamily: theme.font.mono,
              fontSize: "11px",
              color: theme.colors.textDim,
              backgroundColor: theme.colors.surfaceRaised,
              padding: "4px 12px",
              borderRadius: "12px",
              border: `1px solid ${theme.colors.border}`,
              letterSpacing: "0.05em",
            }}
          >
            v0.1.0 — ASCEND 2026
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          variants={itemVariants}
          style={{
            fontFamily: theme.font.mono,
            fontSize: "36px",
            color: theme.colors.text,
            marginBottom: "8px",
            letterSpacing: "-0.02em",
            fontWeight: 700,
          }}
        >
          SOC Reconciliation Engine
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          style={{
            fontFamily: theme.font.sans,
            fontSize: "18px",
            color: theme.colors.textDim,
            lineHeight: 1.6,
            marginBottom: "16px",
          }}
        >
          Deterministic state reconstruction and conflict resolution for
          disparate security telemetry.
        </motion.p>

        <motion.p
          variants={itemVariants}
          style={{
            fontFamily: theme.font.mono,
            fontSize: "14px",
            color: theme.colors.yellowDim,
            marginBottom: "48px",
            letterSpacing: "0.02em",
          }}
        >
          Stop guessing the truth — prove it.
        </motion.p>

        {/* Feature highlights */}
        <motion.div
          variants={itemVariants}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "12px",
            marginBottom: "48px",
          }}
        >
          {[
            { icon: "🔍", label: "Conflict Resolution" },
            { icon: "⏱", label: "Time Travel Replay" },
            { icon: "📊", label: "Audit Trail" },
          ].map((feature) => (
            <div
              key={feature.label}
              style={{
                padding: "16px 12px",
                backgroundColor: theme.colors.surfaceRaised,
                borderRadius: theme.radius.md,
                border: `1px solid ${theme.colors.border}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "20px" }}>{feature.icon}</span>
              <span
                style={{
                  fontFamily: theme.font.mono,
                  fontSize: "11px",
                  color: theme.colors.textDim,
                  letterSpacing: "0.03em",
                }}
              >
                {feature.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.div variants={itemVariants}>
          <motion.button
            onClick={() => navigate("/login")}
            style={{
              backgroundColor: theme.colors.yellow,
              color: theme.colors.bg,
              border: "none",
              borderRadius: theme.radius.md,
              padding: "16px 40px",
              fontFamily: theme.font.mono,
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "0.03em",
            }}
            whileHover={{
              scale: 1.02,
              boxShadow: `0 0 24px ${theme.colors.yellowGlow}`,
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            ENTER SYSTEM →
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
};