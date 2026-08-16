import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import { theme } from "../theme/theme";

export interface NetworkMapViewProps {
  events: any[];
}

interface Node {
  id: string;
  type: string;
  x: number;
  y: number;
  color: string;
}

interface Edge {
  source: string;
  target: string;
  color: string;
}

export const NetworkMapView: React.FC<NetworkMapViewProps> = ({ events }) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Derive network topology from events
  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, Node>();
    const edgeList: Edge[] = [];

    // Internal constants for layout
    const centerX = 400;
    const centerY = 300;
    const radius = 200;

    events.forEach(evt => {
      if (evt.entity?.type === "connection") {
        // e.g. "10.0.0.5->192.168.100.99"
        const parts = evt.entity.identifier.split("->");
        if (parts.length === 2) {
          const src = parts[0];
          const dst = parts[1];
          if (!nodeMap.has(src)) nodeMap.set(src, { id: src, type: "internal", x: 0, y: 0, color: theme.colors.resolved });
          if (!nodeMap.has(dst)) nodeMap.set(dst, { id: dst, type: "external", x: 0, y: 0, color: theme.colors.conflict });
          edgeList.push({ source: src, target: dst, color: theme.colors.sources.crowdstrike });
        }
      } else if (evt.entity?.type === "host" || evt.entity?.type === "port") {
        const id = evt.entity.identifier.split(":")[0]; // strip port if any
        if (!nodeMap.has(id)) {
          nodeMap.set(id, { id, type: "internal", x: 0, y: 0, color: evt.data.status === "compromised" ? theme.colors.conflict : theme.colors.resolved });
        } else if (evt.data.status === "compromised") {
          nodeMap.get(id)!.color = theme.colors.conflict; // Update status
        }
      }
    });

    // Circular layout computation
    const nodesArray = Array.from(nodeMap.values());
    nodesArray.forEach((node, i) => {
      if (node.id.includes("192.168.100")) {
        // Place external C2 server in the center-top
        node.x = centerX;
        node.y = 50;
      } else {
        const angle = (i / (nodesArray.length - 1 || 1)) * Math.PI * 2;
        node.x = centerX + Math.cos(angle) * radius;
        node.y = centerY + Math.sin(angle) * radius;
      }
    });

    return { nodes: nodesArray, edges: edgeList };
  }, [events]);

  return (
    <div style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.md, padding: "24px", height: "600px", display: "flex", flexDirection: "column" }}>
      <h3 style={{ margin: "0 0 16px 0", fontFamily: theme.font.mono, color: theme.colors.text }}>Network Topology Map</h3>
      
      <div style={{ flex: 1, position: "relative", backgroundColor: theme.colors.bg, borderRadius: theme.radius.sm, overflow: "hidden", border: `1px solid ${theme.colors.border}` }}>
        <svg width="100%" height="100%" viewBox="0 0 800 600" style={{ cursor: "crosshair" }}>
          
          {/* Edges */}
          {edges.map((edge, i) => {
            const srcNode = nodes.find(n => n.id === edge.source);
            const dstNode = nodes.find(n => n.id === edge.target);
            if (!srcNode || !dstNode) return null;
            const isHovered = hoveredNode === edge.source || hoveredNode === edge.target;
            
            return (
              <motion.line
                key={`edge-${i}`}
                x1={srcNode.x}
                y1={srcNode.y}
                x2={dstNode.x}
                y2={dstNode.y}
                stroke={isHovered ? theme.colors.yellow : edge.color}
                strokeWidth={isHovered ? 2 : 1}
                strokeDasharray="4 4"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: isHovered ? 0.8 : 0.4 }}
                transition={{ duration: 1.5, delay: i * 0.1 }}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const isHovered = hoveredNode === node.id;
            return (
              <g key={node.id} 
                 onMouseEnter={() => setHoveredNode(node.id)} 
                 onMouseLeave={() => setHoveredNode(null)}
                 style={{ cursor: "pointer" }}>
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={isHovered ? 12 : 8}
                  fill={node.color}
                  stroke={theme.colors.bg}
                  strokeWidth={2}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                />
                
                {/* Ping animation for compromised hosts */}
                {node.color === theme.colors.conflict && (
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r={8}
                    fill="transparent"
                    stroke={theme.colors.conflict}
                    strokeWidth={1}
                    initial={{ scale: 1, opacity: 1 }}
                    animate={{ scale: 3, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                )}

                <text
                  x={node.x}
                  y={node.y + 24}
                  textAnchor="middle"
                  fill={isHovered ? theme.colors.yellow : theme.colors.textDim}
                  fontFamily={theme.font.mono}
                  fontSize="10px"
                >
                  {node.id}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div style={{ position: "absolute", bottom: "16px", left: "16px", backgroundColor: theme.colors.surfaceRaised, padding: "8px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.colors.border}`, display: "flex", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: theme.colors.resolved }} />
            <span style={{ fontSize: "10px", fontFamily: theme.font.mono, color: theme.colors.textDim }}>Internal Host</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: theme.colors.conflict }} />
            <span style={{ fontSize: "10px", fontFamily: theme.font.mono, color: theme.colors.textDim }}>Compromised / External</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "16px", height: "1px", borderTop: `1px dashed ${theme.colors.sources.crowdstrike}` }} />
            <span style={{ fontSize: "10px", fontFamily: theme.font.mono, color: theme.colors.textDim }}>Beaconing</span>
          </div>
        </div>
      </div>
    </div>
  );
};
