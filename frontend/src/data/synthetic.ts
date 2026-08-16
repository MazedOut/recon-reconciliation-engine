export function buildSyntheticData() {
  const now = new Date();
  const t = (minutesAgo: number) =>
    new Date(now.getTime() - minutesAgo * 60 * 1000).toISOString();

  const events: any[] = [];
  const decisions: any[] = [];
  const auditTrail: any[] = [];
  const snapshots: any[] = [];
  const diffs: any[] = [];

  const sources = ["nmap", "snort", "burp", "powershell", "crowdstrike"];

  // ─── 1. Baseline Phase (120 - 100 mins ago) ───
  // Generate 20 baseline events across 10 hosts
  for (let i = 1; i <= 10; i++) {
    const ip = `10.0.0.${i}`;
    events.push({
      id: `evt-nmap-base-${i}`,
      source: "nmap",
      timestamp: t(120 - i),
      event_type: "port_scan",
      entity: { type: "port", identifier: `${ip}:445` },
      data: { status: "closed", protocol: "tcp" },
      is_late: false,
    });
    events.push({
      id: `evt-crowdstrike-base-${i}`,
      source: "crowdstrike",
      timestamp: t(115 - i),
      event_type: "agent_heartbeat",
      entity: { type: "host", identifier: ip },
      data: { status: "healthy", agent_version: "7.14" },
      is_late: false,
    });
  }

  // ─── 2. Initial Recon & Exploit Phase (60 - 45 mins ago) ───
  // Target 10.0.0.5 is hit
  events.push({ id: "evt-snort-recon-5", source: "snort", timestamp: t(60), event_type: "ids_alert", entity: { type: "port", identifier: "10.0.0.5:445" }, data: { status: "open", alert: "SMB Recon" }, is_late: false });
  events.push({ id: "evt-snort-exploit-5", source: "snort", timestamp: t(55), event_type: "ids_alert", entity: { type: "port", identifier: "10.0.0.5:445" }, data: { status: "open", alert: "MS17-010 Exploit" }, is_late: false });
  
  // Conflicting baseline vs exploit on 10.0.0.5
  decisions.push({
    entity: { type: "port", identifier: "10.0.0.5:445" },
    value: { status: "open", threat: "critical" },
    winning_event_id: "evt-snort-exploit-5",
    losing_event_ids: ["evt-nmap-base-5"],
    rule_applied: "higher_confidence_recency",
    score_breakdown: { source_reliability: 0.9, recency_decay: 0.8, final_score: 0.72 }
  });

  // Target 10.0.0.8 web portal attack
  events.push({ id: "evt-burp-scan-8", source: "burp", timestamp: t(50), event_type: "web_scan", entity: { type: "url", identifier: "https://10.0.0.8/admin" }, data: { status_code: 403 }, is_late: false });
  events.push({ id: "evt-burp-bypass-8", source: "burp", timestamp: t(45), event_type: "web_scan", entity: { type: "url", identifier: "https://10.0.0.8/admin" }, data: { status_code: 200, payload: "Auth Bypass" }, is_late: true });
  
  decisions.push({
    entity: { type: "url", identifier: "https://10.0.0.8/admin" },
    value: { status_code: 200, state: "compromised" },
    winning_event_id: "evt-burp-bypass-8",
    losing_event_ids: ["evt-burp-scan-8"],
    rule_applied: "late_arrival_override",
    score_breakdown: { source_reliability: 0.8, recency_decay: 0.95, final_score: 0.76 }
  });

  // ─── 3. Lateral Movement (30 - 15 mins ago) ───
  // Spreading from 10.0.0.5 to .2, .3, .4
  [2, 3, 4].forEach((i, idx) => {
    const ip = `10.0.0.${i}`;
    events.push({ id: `evt-ps-lateral-${i}`, source: "powershell", timestamp: t(30 - idx * 2), event_type: "process_log", entity: { type: "host", identifier: ip }, data: { status: "compromised", process: "psexec.exe" }, is_late: false });
    events.push({ id: `evt-snort-lateral-${i}`, source: "snort", timestamp: t(29 - idx * 2), event_type: "ids_alert", entity: { type: "host", identifier: ip }, data: { status: "compromised", alert: "Lateral Movement RPC" }, is_late: false });
    
    decisions.push({
      entity: { type: "host", identifier: ip },
      value: { status: "compromised", vector: "psexec" },
      winning_event_id: `evt-snort-lateral-${i}`,
      losing_event_ids: [`evt-crowdstrike-base-${i}`],
      rule_applied: "corroborated_override",
      score_breakdown: { source_reliability: 0.9, corroboration_bonus: 0.1, final_score: 0.95 }
    });
  });

  // ─── 4. C2 Beaconing (10 - 0 mins ago) ───
  // All compromised hosts beacon out to 192.168.100.99
  [5, 8, 2, 3, 4].forEach((i, idx) => {
    events.push({ id: `evt-cs-beacon-${i}`, source: "crowdstrike", timestamp: t(10 - idx), event_type: "network_log", entity: { type: "connection", identifier: `10.0.0.${i}->192.168.100.99` }, data: { status: "active", port: 443 }, is_late: false });
    
    decisions.push({
      entity: { type: "connection", identifier: `10.0.0.${i}->192.168.100.99` },
      value: { status: "active", classification: "c2_beacon" },
      winning_event_id: `evt-cs-beacon-${i}`,
      losing_event_ids: [],
      rule_applied: "single_source",
      score_breakdown: { source_reliability: 0.85, final_score: 0.85 }
    });
  });

  // Generate false positives
  events.push({ id: "evt-snort-fp-9", source: "snort", timestamp: t(5), event_type: "ids_alert", entity: { type: "host", identifier: "10.0.0.9" }, data: { status: "compromised", alert: "Suspicious DLL" }, is_late: false });
  events.push({ id: "evt-cs-fp-9", source: "crowdstrike", timestamp: t(4), event_type: "agent_heartbeat", entity: { type: "host", identifier: "10.0.0.9" }, data: { status: "healthy", reason: "Known legitimate update" }, is_late: true });
  
  decisions.push({
    entity: { type: "host", identifier: "10.0.0.9" },
    value: { status: "healthy" },
    winning_event_id: "evt-cs-fp-9",
    losing_event_ids: ["evt-snort-fp-9"],
    rule_applied: "higher_confidence_override",
    score_breakdown: { source_reliability: 0.95, final_score: 0.91 }
  });

  // Generate remaining random noise to hit 60 events
  let currentId = events.length + 1;
  while (events.length < 60) {
    const isLate = Math.random() > 0.8;
    events.push({
      id: `evt-noise-${currentId}`,
      source: sources[Math.floor(Math.random() * sources.length)],
      timestamp: t(Math.floor(Math.random() * 120)),
      event_type: "log_noise",
      entity: { type: "system", identifier: "log_server" },
      data: { status: "ok", memory: Math.floor(Math.random() * 100) },
      is_late: isLate,
    });
    currentId++;
  }

  // Sort events chronologically so the timeline makes sense
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Generate Snapshots for the Scrubber (one snapshot every 20 minutes)
  for (let m = 120; m >= 0; m -= 20) {
    const snapEvents = events.filter(e => new Date(e.timestamp).getTime() <= new Date(t(m)).getTime());
    snapshots.push({
      snapshot_id: `snap-${m}`,
      at: t(m),
      triggered_by_event_id: snapEvents.length > 0 ? snapEvents[snapEvents.length - 1].id : null,
      entity_states: snapEvents.map(e => ({ entity: e.entity, value: e.data, confidence: 0.5, last_updated_by: e.id, last_updated_at: e.timestamp }))
    });
  }

  // Generate Audit Trails for the decisions
  decisions.forEach((dec) => {
    auditTrail.push({
      entity: dec.entity,
      inputs_considered: [dec.winning_event_id, ...(dec.losing_event_ids || [])],
      rule_applied: dec.rule_applied,
      decision: dec,
      narrative: `Resolved conflict for ${dec.entity.identifier} via ${dec.rule_applied}.`,
      reconciled_at: t(2)
    });
  });

  return {
    run_id: "breach-simulation-2026",
    injected_now: now.toISOString(),
    events,
    decisions,
    audit_trail: auditTrail,
    state_snapshots: snapshots,
    diffs,
  };
}
