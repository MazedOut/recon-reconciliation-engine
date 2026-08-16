import React, { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import { theme } from "../theme/theme";
import { motion } from "motion/react";

export interface AnalyticsViewProps {
  events: any[];
  decisions: any[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ events, decisions }) => {

  // 1. Event Volume Over Time
  const timeData = useMemo(() => {
    const buckets = events.reduce((acc: any, event) => {
      const t = new Date(event.timestamp).toISOString().split("T")[1].slice(0, 5);
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b)).map(([time, count]) => ({ time, events: count }));
  }, [events]);

  // 2. Source Reliability (Static Config)
  const sourceReliability = [
    { name: "Snort", value: 0.9, color: theme.colors.sources.snort },
    { name: "CrowdStrike", value: 0.85, color: theme.colors.sources.crowdstrike },
    { name: "Burp", value: 0.8, color: theme.colors.sources.burp },
    { name: "Nmap", value: 0.75, color: theme.colors.sources.nmap },
    { name: "PowerShell", value: 0.6, color: theme.colors.sources.powershell },
  ];

  // 3. Conflicts by Entity Type
  const conflictData = useMemo(() => {
    const buckets = decisions.reduce((acc: any, dec) => {
      if (dec.losing_event_ids?.length > 0) {
        const type = dec.entity.type;
        acc[type] = (acc[type] || 0) + 1;
      }
      return acc;
    }, {});
    return Object.entries(buckets).map(([type, count]) => ({ type: type.toUpperCase(), conflicts: count }));
  }, [decisions]);

  // 4. Event Distribution by Tool
  const toolDistData = useMemo(() => {
    const buckets = events.reduce((acc: any, event) => {
      acc[event.source] = (acc[event.source] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(buckets).map(([name, value]) => ({ name, value, color: theme.colors.sources[name as keyof typeof theme.colors.sources] || theme.colors.textDim }));
  }, [events]);

  // 5. Average Resolution Confidence
  const avgConfData = useMemo(() => {
    const buckets: any = {};
    const counts: any = {};
    decisions.forEach(d => {
      if (!buckets[d.rule_applied]) { buckets[d.rule_applied] = 0; counts[d.rule_applied] = 0; }
      buckets[d.rule_applied] += d.score_breakdown.final_score;
      counts[d.rule_applied]++;
    });
    return Object.keys(buckets).map(rule => ({ rule, avg: Number((buckets[rule] / counts[rule]).toFixed(2)) }));
  }, [decisions]);

  // 6. Resolution Outcomes
  const outcomesData = useMemo(() => {
    let won = 0, lost = 0, unanimous = 0;
    decisions.forEach(d => {
      if (d.losing_event_ids?.length > 0) { won++; lost += d.losing_event_ids.length; } else { unanimous++; }
    });
    return [
      { name: "Resolved", value: won, color: theme.colors.yellow },
      { name: "Overridden", value: lost, color: theme.colors.losing },
      { name: "Corroborated", value: unanimous, color: theme.colors.resolved },
    ];
  }, [decisions]);

  // 7. Events by Severity
  const severityData = useMemo(() => {
    let high = 0, med = 0, low = 0;
    events.forEach(e => {
      const txt = JSON.stringify(e.data).toLowerCase();
      if (txt.includes("critical") || txt.includes("compromised") || txt.includes("exploit")) high++;
      else if (txt.includes("alert") || txt.includes("suspicious")) med++;
      else low++;
    });
    return [
      { level: "High", count: high, fill: theme.colors.conflict },
      { level: "Medium", count: med, fill: theme.colors.yellow },
      { level: "Low", count: low, fill: theme.colors.resolved },
    ];
  }, [events]);

  // 8. Late Arrivals Proportion
  const lateData = useMemo(() => {
    const late = events.filter(e => e.is_late).length;
    return [
      { name: "On Time", value: events.length - late, color: theme.colors.resolved },
      { name: "Late Arrival", value: late, color: theme.colors.lateEvent },
    ];
  }, [events]);

  // 9. Entity Type Distribution
  const entityTypeData = useMemo(() => {
    const buckets = events.reduce((acc: any, e) => {
      const t = e.entity?.type || "unknown";
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(buckets).map(([subject, A]) => ({ subject: subject.toUpperCase(), A, fullMark: 50 }));
  }, [events]);

  // 10. System Uptime & Latency (Mock)
  const perfData = [
    { time: "00:00", latency: 24 }, { time: "04:00", latency: 32 }, { time: "08:00", latency: 28 },
    { time: "12:00", latency: 45 }, { time: "16:00", latency: 22 }, { time: "20:00", latency: 26 }
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: theme.colors.surfaceRaised, padding: "8px 12px", border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.sm, fontFamily: theme.font.mono, fontSize: "11px", zIndex: 100 }}>
          {label && <p style={{ margin: "0 0 4px 0", color: theme.colors.textDim }}>{label}</p>}
          {payload.map((entry: any, i: number) => (
            <p key={i} style={{ margin: 0, color: entry.color || theme.colors.text }}>{entry.name || entry.dataKey}: {entry.value}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.radius.md,
        padding: "20px",
        height: "300px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h3 style={{ fontFamily: theme.font.sans, fontSize: "14px", color: theme.colors.text, margin: "0 0 16px 0", fontWeight: 600 }}>{title}</h3>
      <div style={{ flex: 1, minHeight: 0 }}>
        {children}
      </div>
    </motion.div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "24px" }}>
      
      {/* Chart 1: Event Volume Over Time */}
      <ChartCard title="1. Event Volume Over Time">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={timeData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border} vertical={false} />
            <XAxis dataKey="time" stroke={theme.colors.textDim} fontSize={10} fontFamily={theme.font.mono} tickLine={false} axisLine={false} />
            <YAxis stroke={theme.colors.textDim} fontSize={10} fontFamily={theme.font.mono} tickLine={false} axisLine={false} />
            <RechartsTooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="events" stroke={theme.colors.yellow} strokeWidth={2} dot={false} activeDot={{ r: 6, fill: theme.colors.yellow }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart 2: Source Reliability */}
      <ChartCard title="2. Source Reliability Config">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={sourceReliability} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
              {sourceReliability.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie>
            <RechartsTooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart 3: Conflicts by Type */}
      <ChartCard title="3. Conflicts by Entity Type">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={conflictData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border} vertical={false} />
            <XAxis dataKey="type" stroke={theme.colors.textDim} fontSize={10} fontFamily={theme.font.mono} tickLine={false} axisLine={false} />
            <YAxis stroke={theme.colors.textDim} fontSize={10} fontFamily={theme.font.mono} tickLine={false} axisLine={false} allowDecimals={false} />
            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: theme.colors.surfaceRaised }} />
            <Bar dataKey="conflicts" fill={theme.colors.conflict} radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart 4: Tool Distribution */}
      <ChartCard title="4. Event Volume by Tool">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={toolDistData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
              {toolDistData.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie>
            <RechartsTooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart 5: Average Resolution Confidence */}
      <ChartCard title="5. Avg Confidence by Rule">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={avgConfData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border} vertical={false} />
            <XAxis dataKey="rule" stroke={theme.colors.textDim} fontSize={8} fontFamily={theme.font.mono} tickLine={false} axisLine={false} tickFormatter={(v) => v.split('_')[0]} />
            <YAxis stroke={theme.colors.textDim} fontSize={10} fontFamily={theme.font.mono} tickLine={false} axisLine={false} />
            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: theme.colors.surfaceRaised }} />
            <Bar dataKey="avg" fill={theme.colors.resolved} radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart 6: Resolution Outcomes */}
      <ChartCard title="6. Replay Outcome Distribution">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={outcomesData} cx="50%" cy="50%" outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
              {outcomesData.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie>
            <RechartsTooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart 7: Events by Severity */}
      <ChartCard title="7. Event Severity Distribution">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={severityData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border} vertical={false} />
            <XAxis dataKey="level" stroke={theme.colors.textDim} fontSize={10} fontFamily={theme.font.mono} tickLine={false} axisLine={false} />
            <YAxis stroke={theme.colors.textDim} fontSize={10} fontFamily={theme.font.mono} tickLine={false} axisLine={false} allowDecimals={false} />
            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: theme.colors.surfaceRaised }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {severityData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart 8: Late Arrivals */}
      <ChartCard title="8. Temporal Drift (Late Arrivals)">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={lateData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
              {lateData.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie>
            <RechartsTooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart 9: Entity Type Radar */}
      <ChartCard title="9. Observed Entity Spread">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={entityTypeData}>
            <PolarGrid stroke={theme.colors.border} />
            <PolarAngleAxis dataKey="subject" tick={{ fill: theme.colors.textDim, fontSize: 10, fontFamily: theme.font.mono }} />
            <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={false} axisLine={false} />
            <Radar name="Count" dataKey="A" stroke={theme.colors.yellow} fill={theme.colors.yellow} fillOpacity={0.3} />
            <RechartsTooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart 10: System Latency */}
      <ChartCard title="10. System Engine Latency (ms)">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={perfData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border} vertical={false} />
            <XAxis dataKey="time" stroke={theme.colors.textDim} fontSize={10} fontFamily={theme.font.mono} tickLine={false} axisLine={false} />
            <YAxis stroke={theme.colors.textDim} fontSize={10} fontFamily={theme.font.mono} tickLine={false} axisLine={false} />
            <RechartsTooltip content={<CustomTooltip />} />
            <Line type="step" dataKey="latency" stroke={theme.colors.text} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

    </div>
  );
};
