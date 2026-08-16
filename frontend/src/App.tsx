import React, { useState, useEffect, useMemo } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { theme } from "./theme/theme";

// Components
import { WelcomeLanding } from "./components/WelcomeLanding";
import { Login } from "./components/Login";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { FilterBar, FilterState } from "./components/FilterBar";
import { ByToolView } from "./components/ByToolView";
import { Timeline } from "./components/Timeline";
import { ReplayScrubber } from "./components/ReplayScrubber";
import { DiffPanel } from "./components/DiffPanel";
import { AuditAccordion } from "./components/AuditAccordion";
import { ConflictCard } from "./components/ConflictCard";
import { AnalyticsView } from "./components/AnalyticsView";
import { NetworkMapView } from "./components/NetworkMapView";
import { EventDetailModal } from "./components/EventDetailModal";
import { IngestModal } from "./components/IngestModal";

import { buildSyntheticData } from "./data/synthetic";

// ─── Reusable Section Panel ──────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.md, overflow: "hidden" }}>
    <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${theme.colors.border}`, backgroundColor: theme.colors.surfaceRaised }}>
      <h3 style={{ margin: 0, fontFamily: theme.font.mono, fontSize: "12px", fontWeight: 600, color: theme.colors.text, letterSpacing: "0.05em", textTransform: "uppercase" }}>{title}</h3>
    </div>
    <div style={{ padding: "16px" }}>{children}</div>
  </section>
);

// ─────────────────────────────────────────────────────────────
// Dashboard (Protected Route)
// ─────────────────────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("recon_auth_token");
    if (!token) navigate("/login");
  }, [navigate]);

  const [run, setRun] = useState<any>(null);
  const [diffs, setDiffs] = useState<any[]>([]);
  const [currentSnapshotTime, setCurrentSnapshotTime] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    entityTypeFilter: "all",
    conflictOnly: false,
    lateOnly: false,
    sourceFilter: "all",
  });
  const [showIngestModal, setShowIngestModal] = useState(false);

  // Determine active view based on path
  let activeView = "main";
  if (location.pathname.includes("/by-tool")) activeView = "byTool";
  if (location.pathname.includes("/analytics")) activeView = "analytics";
  if (location.pathname.includes("/network")) activeView = "network";

  const handleViewChange = (v: string) => {
    if (v === "main") navigate("/app");
    else if (v === "byTool") navigate("/app/by-tool");
    else if (v === "analytics") navigate("/app/analytics");
    else if (v === "network") navigate("/app/network");
  };

  const handleFilterPatch = (patch: Partial<FilterState>) => setFilters((prev) => ({ ...prev, ...patch }));
  const handleLogout = () => { localStorage.removeItem("recon_auth_token"); navigate("/login"); };

  useEffect(() => {
    if (!run) {
      const token = localStorage.getItem("recon_auth_token");
      const localData = buildSyntheticData();
      
      if (token === "demo-token-hackathon-2026") {
        setRun(localData);
        setDiffs(localData.diffs);
      } else {
        // Call the real backend engine
        fetch("http://localhost:8000/reconcile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            events: localData.events,
            injected_now: localData.injected_now
          })
        })
        .then(res => {
          if (!res.ok) throw new Error("Failed to reconcile");
          return res.json();
        })
        .then(realRun => {
          setRun(realRun);
          // initial baseline has no diffs, diffs happen on replay
          setDiffs([]);
        })
        .catch(err => {
          console.error("Backend error, falling back to demo mode", err);
          setRun(localData);
          setDiffs(localData.diffs);
        });
      }
    }
  }, [run]);

  const availableSources = useMemo(() => {
    if (!run?.events) return [];
    return [...new Set(run.events.map((e: any) => e.source))].sort() as string[];
  }, [run]);

  const conflictingEventIds = useMemo(() => {
    const ids = new Set<string>();
    if (!run?.decisions) return ids;
    for (const dec of run.decisions) {
      if (dec.losing_event_ids?.length > 0) {
        ids.add(dec.winning_event_id);
        for (const lid of dec.losing_event_ids) ids.add(lid);
      }
    }
    return ids;
  }, [run]);

  // Global Time Slicing logic
  const displayEvents = useMemo(() => {
    if (!run?.events) return [];
    if (!currentSnapshotTime) return run.events;
    const snapTime = new Date(currentSnapshotTime).getTime();
    return run.events.filter((e: any) => new Date(e.timestamp).getTime() <= snapTime);
  }, [run, currentSnapshotTime]);

  const displayDecisions = useMemo(() => {
    if (!run?.decisions) return [];
    
    let baseDecisions = run.decisions;
    if (currentSnapshotTime && run.state_snapshots) {
      const snap = run.state_snapshots.find((s: any) => s.at === currentSnapshotTime);
      if (snap) {
        baseDecisions = snap.entity_states.map((state: any) => {
          const finalDec = run.decisions.find((d: any) => d.entity.identifier === state.entity.identifier);
          return {
            entity: state.entity,
            value: state.value,
            winning_event_id: state.last_updated_by,
            losing_event_ids: finalDec?.losing_event_ids || [],
            rule_applied: finalDec?.rule_applied || "Temporal Override",
            score_breakdown: {
              source_reliability: 1,
              recency_decay: 1,
              corroboration_count: 0,
              corroboration_bonus: 0,
              final_score: state.confidence
            }
          };
        });
      }
    }

    return baseDecisions.filter((dec: any) => {
      if (filters.entityTypeFilter !== "all" && dec.entity.type !== filters.entityTypeFilter) return false;
      if (filters.conflictOnly && (!dec.losing_event_ids || dec.losing_event_ids.length === 0)) return false;
      if (filters.sourceFilter !== "all") {
        const winEvt = displayEvents.find((e: any) => e.id === dec.winning_event_id);
        if (winEvt && winEvt.source !== filters.sourceFilter) return false;
      }
      return true;
    });
  }, [run, filters, currentSnapshotTime, displayEvents]);

  const selectedEvent = useMemo(() => {
    return run?.events?.find((e: any) => e.id === selectedEventId) || null;
  }, [run, selectedEventId]);

  if (!run) return <div style={{ color: theme.colors.textDim, padding: "24px" }}>Loading engine...</div>;

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: theme.colors.bg, color: theme.colors.text }}>
      
      {/* ─── Sidebar (Left Navigation) ─── */}
      <Sidebar activeView={activeView} onViewChange={handleViewChange} />

      {/* ─── Main Content Area ─── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        
        {/* ─── Topbar (Header & Notifications) ─── */}
        <Topbar
          runId={run.run_id}
          isTimeTravelActive={!!currentSnapshotTime}
          onResetTimeTravel={() => setCurrentSnapshotTime(null)}
          onLogout={handleLogout}
          onIngestClick={() => setShowIngestModal(true)}
          notificationCount={3}
        />

        <AnimatePresence>
          {showIngestModal && (
            <IngestModal 
              runId={run.run_id} 
              onClose={() => setShowIngestModal(false)} 
              onIngestSuccess={(newRun) => {
                setRun(newRun);
                setShowIngestModal(false);
              }} 
            />
          )}
        </AnimatePresence>

        {/* ─── View Content ─── */}
        <div style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "24px", maxWidth: "1600px", margin: "0 auto", width: "100%" }}>
          
          {/* Global Time Travel Scrubber */}
          <Section title="Temporal Analysis Scrubber">
            <ReplayScrubber run={run} onReplayComplete={(nr) => setRun(nr)} onDropEvidence={() => {}} onScrubFrame={(s) => setCurrentSnapshotTime(s.at)} />
          </Section>

          <AnimatePresence mode="wait">
            
            {/* VIEW: MAIN DASHBOARD */}
            {activeView === "main" && (
              <motion.div key="main" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div style={{ display: "grid", gridTemplateColumns: diffs.length > 0 ? "1fr 1fr" : "1fr", gap: "24px" }}>
                  <Section title="Event Timeline">
                    <Timeline events={displayEvents} conflictingEventIds={conflictingEventIds} onSelectEvent={setSelectedEventId} />
                  </Section>
                  {diffs.length > 0 && (
                    <Section title="Replay Impact">
                      <DiffPanel diffs={diffs} />
                    </Section>
                  )}
                </div>
                <FilterBar activeView="main" onViewChange={() => {}} {...filters} onFilterChange={handleFilterPatch} availableSources={availableSources} />
                <Section title="Reconciled Decisions">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "16px" }}>
                    {displayDecisions.map((dec: any, i: number) => (
                      <ConflictCard key={`${dec.entity?.identifier || i}-${currentSnapshotTime || "latest"}`} decision={dec} events={displayEvents} onExpand={() => {}} />
                    ))}
                  </div>
                </Section>
                <Section title="Full Audit Trail">
                  <AuditAccordion records={run.audit_trail || []} />
                </Section>
              </motion.div>
            )}

            {/* VIEW: BY-TOOL AUDIT */}
            {activeView === "byTool" && (
              <motion.div key="byTool" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <FilterBar activeView="byTool" onViewChange={() => {}} {...filters} onFilterChange={handleFilterPatch} availableSources={availableSources} />
                <Section title="Raw Claims By Tool">
                  <ByToolView events={displayEvents} decisions={displayDecisions} sourceFilter={filters.sourceFilter} onSelectEvent={setSelectedEventId} />
                </Section>
              </motion.div>
            )}

            {/* VIEW: ANALYTICS */}
            {activeView === "analytics" && (
              <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <AnalyticsView events={displayEvents} decisions={displayDecisions} />
              </motion.div>
            )}

            {/* VIEW: NETWORK MAP */}
            {activeView === "network" && (
              <motion.div key="network" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <NetworkMapView events={displayEvents} />
              </motion.div>
            )}
            
          </AnimatePresence>
        </div>
      </div>

      {/* ─── Global Event Detail Modal ─── */}
      <EventDetailModal
        isOpen={!!selectedEventId}
        onClose={() => setSelectedEventId(null)}
        event={selectedEvent}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Root Router
// ─────────────────────────────────────────────────────────────
export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomeLanding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/app/*" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;