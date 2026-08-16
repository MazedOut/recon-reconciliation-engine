/**
 * Shared filter bar for both Main and By-Tool views.
 * Dynamically populates the source dropdown from available data.
 * activeView toggle is visually distinct (segmented control, top-level).
 */
import React from "react";
import { motion } from "motion/react";
import { theme } from "../theme/theme";

export interface FilterState {
  entityTypeFilter: "all" | "port" | "url" | "host";
  conflictOnly: boolean;
  lateOnly: boolean;
  sourceFilter: string; // Dynamic — not a hardcoded union
}

export interface FilterBarProps extends FilterState {
  activeView: "main" | "byTool";
  onViewChange: (v: "main" | "byTool") => void;
  onFilterChange: (patch: Partial<FilterState>) => void;
  availableSources?: string[]; // Dynamically derived from data
}

const DEFAULT_FILTERS: FilterState = {
  entityTypeFilter: "all",
  conflictOnly: false,
  lateOnly: false,
  sourceFilter: "all",
};

export const FilterBar: React.FC<FilterBarProps> = (props) => {
  const sources = props.availableSources || [];
  const hasActiveFilters =
    props.entityTypeFilter !== "all" ||
    props.conflictOnly ||
    props.lateOnly ||
    props.sourceFilter !== "all";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

      {/* Data Filters Row */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          alignItems: "center",
          flexWrap: "wrap",
          padding: "12px 16px",
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.md,
          border: `1px solid ${theme.colors.border}`,
        }}
      >
        {/* Entity Type */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "10px", fontFamily: theme.font.mono, color: theme.colors.textDim, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Entity
          </label>
          <select
            value={props.entityTypeFilter}
            onChange={(e) =>
              props.onFilterChange({
                entityTypeFilter: e.target.value as FilterState["entityTypeFilter"],
              })
            }
            style={{
              backgroundColor: theme.colors.bg,
              color: theme.colors.text,
              border: `1px solid ${theme.colors.border}`,
              padding: "6px 28px 6px 8px",
              borderRadius: theme.radius.sm,
              fontFamily: theme.font.mono,
              fontSize: "12px",
            }}
          >
            <option value="all">All Entities</option>
            <option value="port">Ports</option>
            <option value="url">URLs</option>
            <option value="host">Hosts</option>
          </select>
        </div>

        {/* Source Filter — Dynamic */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "10px", fontFamily: theme.font.mono, color: theme.colors.textDim, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Source
          </label>
          <select
            value={props.sourceFilter}
            onChange={(e) =>
              props.onFilterChange({ sourceFilter: e.target.value })
            }
            style={{
              backgroundColor: theme.colors.bg,
              color: theme.colors.text,
              border: `1px solid ${theme.colors.border}`,
              padding: "6px 28px 6px 8px",
              borderRadius: theme.radius.sm,
              fontFamily: theme.font.mono,
              fontSize: "12px",
            }}
          >
            <option value="all">All Sources</option>
            {sources.map((src) => (
              <option key={src} value={src}>
                {src.charAt(0).toUpperCase() + src.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Divider */}
        <div style={{ width: "1px", height: "32px", backgroundColor: theme.colors.border }} />

        {/* Toggle Checkboxes */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: props.conflictOnly ? theme.colors.yellow : theme.colors.textDim,
            fontSize: "12px",
            fontFamily: theme.font.mono,
            cursor: "pointer",
            transition: "color 0.2s",
          }}
        >
          <input
            type="checkbox"
            checked={props.conflictOnly}
            onChange={(e) =>
              props.onFilterChange({ conflictOnly: e.target.checked })
            }
            style={{ accentColor: theme.colors.yellow }}
          />
          Conflicts Only
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: props.lateOnly ? theme.colors.lateEvent : theme.colors.textDim,
            fontSize: "12px",
            fontFamily: theme.font.mono,
            cursor: "pointer",
            transition: "color 0.2s",
          }}
        >
          <input
            type="checkbox"
            checked={props.lateOnly}
            onChange={(e) =>
              props.onFilterChange({ lateOnly: e.target.checked })
            }
            style={{ accentColor: theme.colors.lateEvent }}
          />
          Late Events Only
        </label>

        {/* Reset Button */}
        {hasActiveFilters && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => props.onFilterChange(DEFAULT_FILTERS)}
            style={{
              marginLeft: "auto",
              backgroundColor: "transparent",
              color: theme.colors.textDim,
              border: `1px solid ${theme.colors.border}`,
              padding: "4px 12px",
              borderRadius: theme.radius.sm,
              fontFamily: theme.font.mono,
              fontSize: "11px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            whileHover={{
              borderColor: theme.colors.text,
              color: theme.colors.text,
            }}
          >
            ✕ RESET
          </motion.button>
        )}
      </div>
    </div>
  );
};