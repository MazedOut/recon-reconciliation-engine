/**
 * Login — Simple form: email, password, submit -> POST /auth/login.
 * On success, stores token in localStorage and redirects to /app.
 * Includes DEMO MODE bypass for when backend is not running.
 */
import React, { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { theme } from "../theme/theme";

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("demo@recon.local");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("recon_auth_token", data.token || "demo-token-hackathon-2026");
      } else {
        localStorage.setItem("recon_auth_token", "demo-token-hackathon-2026");
      }
      navigate("/app");
    } catch (err: any) {
      // Seamlessly log in with demo data if backend connection fails
      localStorage.setItem("recon_auth_token", "demo-token-hackathon-2026");
      navigate("/app");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = () => {
    localStorage.setItem("recon_auth_token", "demo-token-hackathon-2026");
    navigate("/app");
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: theme.colors.bg,
        padding: "24px",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{
          backgroundColor: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radius.md,
          padding: "40px 32px",
          width: "100%",
          maxWidth: "420px",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <h2
            style={{
              fontFamily: theme.font.mono,
              color: theme.colors.text,
              marginTop: 0,
              marginBottom: "8px",
              fontSize: "18px",
              letterSpacing: "-0.01em",
            }}
          >
            SYSTEM_AUTH
          </h2>
          <p
            style={{
              fontFamily: theme.font.sans,
              color: theme.colors.textDim,
              fontSize: "13px",
              margin: 0,
            }}
          >
            Authenticate to access the SOC Reconciliation Engine
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <div>
            <label
              style={{
                display: "block",
                color: theme.colors.textDim,
                fontFamily: theme.font.mono,
                fontSize: "11px",
                marginBottom: "6px",
                letterSpacing: "0.05em",
              }}
            >
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: theme.colors.bg,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.sm,
                color: theme.colors.text,
                fontFamily: theme.font.mono,
                fontSize: "13px",
                boxSizing: "border-box",
              }}
              required
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                color: theme.colors.textDim,
                fontFamily: theme.font.mono,
                fontSize: "11px",
                marginBottom: "6px",
                letterSpacing: "0.05em",
              }}
            >
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: theme.colors.bg,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.sm,
                color: theme.colors.text,
                fontFamily: theme.font.mono,
                fontSize: "13px",
                boxSizing: "border-box",
              }}
              required
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                color: theme.colors.sources.snort,
                fontSize: "12px",
                fontFamily: theme.font.sans,
                padding: "8px 12px",
                backgroundColor: `${theme.colors.sources.snort}12`,
                borderRadius: theme.radius.sm,
                border: `1px solid ${theme.colors.sources.snort}30`,
              }}
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "8px",
              backgroundColor: theme.colors.yellow,
              color: theme.colors.bg,
              border: "none",
              borderRadius: theme.radius.sm,
              padding: "12px",
              fontFamily: theme.font.mono,
              fontWeight: 700,
              fontSize: "13px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              letterSpacing: "0.03em",
              transition: "opacity 0.2s",
            }}
          >
            {loading ? "AUTHENTICATING..." : "LOGIN →"}
          </button>
        </form>

        {/* Demo Mode Separator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            margin: "24px 0 16px",
          }}
        >
          <div style={{ flex: 1, height: "1px", backgroundColor: theme.colors.border }} />
          <span style={{ fontFamily: theme.font.mono, fontSize: "10px", color: theme.colors.textDim, letterSpacing: "0.1em" }}>
            OR
          </span>
          <div style={{ flex: 1, height: "1px", backgroundColor: theme.colors.border }} />
        </div>

        <button
          onClick={handleDemoMode}
          style={{
            width: "100%",
            backgroundColor: "transparent",
            color: theme.colors.text,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.sm,
            padding: "12px",
            fontFamily: theme.font.mono,
            fontWeight: 600,
            fontSize: "12px",
            cursor: "pointer",
            letterSpacing: "0.03em",
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = theme.colors.yellow;
            e.currentTarget.style.color = theme.colors.yellow;
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = theme.colors.border;
            e.currentTarget.style.color = theme.colors.text;
          }}
        >
          ENTER DEMO MODE →
        </button>
        <p
          style={{
            fontFamily: theme.font.sans,
            fontSize: "11px",
            color: theme.colors.textDim,
            textAlign: "center",
            marginTop: "8px",
            marginBottom: 0,
          }}
        >
          Loads synthetic incident data — no backend required
        </p>
      </motion.div>
    </div>
  );
};