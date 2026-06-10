/* ─────────────────────────────────────────────
 *  SimulationPanel — reads from SimulationContext
 *
 *  Sections:
 *  1. Polygon type draw buttons
 *  2. Draw-mode instructions
 *  3. Drawn elements summary
 *  4. Selected polygon property editor
 *  5. Selected edge property editor
 *  6. Simulation config (mesh, solver)
 *  7. Action buttons (Clear / Run)
 * ───────────────────────────────────────────── */

import React, { useState } from "react";
import {
  useSimulationState,
  useSimulationActions,
} from "../context/SimulationContext";
import {
  POLYGON_TYPES,
  POLYGON_TYPE_KEYS,
  isPropertyVisible,
  type PropertyDef,
} from "../config/polygonTypes";
import { SIMULATION_PARAMS } from "../config/simulationConfig";
import { CodeEditorModal } from "./CodeEditorModal";
import { Button } from "./buttons/Button";
/* ── Styles ──────────────────────────────────── */

const S = {
  panel: {
    position: "absolute" as const,
    top: 12,
    right: 12,
    zIndex: 10,
    background: "rgba(15, 15, 20, 0.88)",
    backdropFilter: "blur(12px)",
    borderRadius: 10,
    padding: 16,
    minWidth: 270,
    maxWidth: 300,
    color: "#e4e4e7",
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 13,
    boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
    border: "1px solid rgba(255,255,255,0.08)",
    maxHeight: "calc(100vh - 24px)",
    overflowY: "auto" as const,
  },
  sectionLabel: {
    fontSize: 10,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "#a1a1aa",
    marginBottom: 8,
    fontWeight: 600,
  },
  divider: {
    borderTop: "1px solid rgba(255,255,255,0.08)",
    margin: "12px 0",
  },
};

/* ── Code editor state ───────────────────────── */

interface CodeEditorState {
  open: boolean;
  title: string;
  propKey: string;
  polyIdx: number;
  value: string;
  placeholder?: string;
}

const closedEditor: CodeEditorState = {
  open: false,
  title: "",
  propKey: "",
  polyIdx: -1,
  value: "",
};

/* ── Property Field (reused for polygon, edge, and config) ── */

function PropertyField({
  def,
  value,
  onChange,
  onOpenCodeEditor,
}: {
  def: PropertyDef;
  value: any;
  onChange: (val: any) => void;
  onOpenCodeEditor?: (def: PropertyDef, currentValue: string) => void;
}) {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "5px 8px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 4,
    color: "#e4e4e7",
    fontSize: 12,
    outline: "none",
  };

  /* ── Code type: render a button to open modal ── */
  if (def.type === "code") {
    const hasCode = value && value !== def.default;
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: "#a1a1aa", marginBottom: 3 }}>
          {def.label}
        </div>
        <button
          onClick={() =>
            onOpenCodeEditor?.(def, value ?? def.default)
          }
          style={{
            width: "100%",
            padding: "7px 10px",
            background: hasCode
              ? "rgba(94, 187, 255, 0.08)"
              : "rgba(255,255,255,0.06)",
            border: hasCode
              ? "1px solid rgba(94, 187, 255, 0.25)"
              : "1px solid rgba(255,255,255,0.12)",
            borderRadius: 6,
            color: hasCode ? "#5ebbff" : "#a1a1aa",
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "all 0.15s",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <span style={{ fontSize: 14, opacity: 0.7 }}>λ</span>
          <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {hasCode ? "Edit function…" : "Write function…"}
          </span>
          <span style={{ fontSize: 10, opacity: 0.5 }}>✎</span>
        </button>
        {/* Mini preview of first line */}
        {hasCode && (
          <div
            style={{
              marginTop: 4,
              padding: "3px 8px",
              background: "rgba(0,0,0,0.25)",
              borderRadius: 4,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: "#546677",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {(value as string).split("\n")[0]}
          </div>
        )}
      </div>
    );
  }

  if (def.type === "select" && def.options) {
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: "#a1a1aa", marginBottom: 3 }}>
          {def.label}
        </div>
        <select
          value={value ?? def.default}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, cursor: "pointer" }}
        >
          {def.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (def.type === "number") {
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: "#a1a1aa", marginBottom: 3 }}>
          {def.label}{" "}
          {def.unit && <span style={{ opacity: 0.6 }}>({def.unit})</span>}
        </div>
        <input
          type="number"
          value={value ?? def.default}
          min={def.min}
          max={def.max}
          step={def.step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          style={inputStyle}
        />
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: "#a1a1aa", marginBottom: 3 }}>
        {def.label}
      </div>
      <input
        type="text"
        value={value ?? def.default}
        onChange={(e) => onChange(e.target.value)}
        placeholder={def.label}
        style={inputStyle}
      />
    </div>
  );
}

/* ── Collapsible Section ─────────────────────── */

function Section({
  label,
  defaultOpen = true,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <div
        onClick={() => setOpen(!open)}
        style={{
          ...S.sectionLabel,
          cursor: "pointer",
          userSelect: "none",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <span style={{ fontSize: 8, opacity: 0.6 }}>{open ? "▼" : "▶"}</span>
        {label}
      </div>
      {open && children}
    </>
  );
}

/* ── Main Component ──────────────────────────── */

export function SimulationPanel() {
  const state = useSimulationState();
  const actions = useSimulationActions();

  const {
    features,
    isDrawing,
    activeType,
    selectedFeatureIndex,
    selectedEdgeIndex,
    isEditing,
    areaSqM,
    config,
    job,
  } = state;

  /* ── Code editor modal state ─────────────── */
  const [codeEditor, setCodeEditor] = useState<CodeEditorState>(closedEditor);

  const openCodeEditor = (
    def: PropertyDef,
    currentValue: string,
    polyIdx: number,
  ) => {
    setCodeEditor({
      open: true,
      title: def.label,
      propKey: def.key,
      polyIdx,
      value: currentValue,
      placeholder: def.placeholder,
    });
  };

  const handleCodeSave = (code: string) => {
    actions.updateFeatureProperty(codeEditor.polyIdx, codeEditor.propKey, code);
    setCodeEditor(closedEditor);
  };

  /* ── Derived ───────────────────────────────── */

  const hasPolygons = features.features.length > 0;

  const selectedFeature =
    selectedFeatureIndex !== null
      ? features.features[selectedFeatureIndex]
      : null;

  const selectedTypeKey = selectedFeature?.properties?._type as string | undefined;
  const selectedTypeDef = selectedTypeKey ? POLYGON_TYPES[selectedTypeKey] : null;

  const edgeValues =
    selectedFeature && selectedEdgeIndex !== null
      ? selectedFeature.properties?.edges?.[selectedEdgeIndex] || {}
      : null;

  const formatArea = (m2: number) => {
    if (m2 >= 1_000_000) return `${(m2 / 1_000_000).toFixed(2)} km²`;
    if (m2 >= 10_000) return `${(m2 / 10_000).toFixed(2)} ha`;
    return `${m2.toFixed(1)} m²`;
  };

  const isJobBusy = job.status === "submitting" || job.status === "meshing" || job.status === "solving";

  return (
    <>
      <div style={S.panel}>
        <div style={{ ...S.sectionLabel, marginBottom: 12 }}>Simulation</div>

        {/* ── 1. Type Buttons ──────────────────── */}
        {!isDrawing && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 12,
            }}
          >
            {POLYGON_TYPE_KEYS.map((key) => {
              const def = POLYGON_TYPES[key];
              const [r, g, b] = def.color.stroke;
              return (
                <button
                  key={key}
                  onClick={() => actions.startDrawing(key)}
                  disabled={isJobBusy}
                  style={{
                    flex: "1 1 calc(50% - 3px)",
                    padding: "7px 4px",
                    borderRadius: 6,
                    border: `1px solid rgba(${r},${g},${b},0.3)`,
                    background: `rgba(${r},${g},${b},0.08)`,
                    color: `rgb(${r},${g},${b})`,
                    cursor: isJobBusy ? "not-allowed" : "pointer",
                    fontSize: 11,
                    fontWeight: 500,
                    transition: "all 0.15s",
                    textAlign: "center" as const,
                    opacity: isJobBusy ? 0.4 : 1,
                  }}
                  title={def.description}
                >
                  {def.icon} {def.label}
                </button>
              );
            })}
          </div>
        )}

        {/* ── 2. Draw Mode ─────────────────────── */}
        {isDrawing && activeType && (
          <>
            <button
              onClick={actions.stopDrawing}
              style={{
                width: "100%",
                padding: "8px 0",
                borderRadius: 6,
                border: "1px solid #ff6b6b",
                background: "rgba(255,107,107,0.15)",
                color: "#ff6b6b",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: 13,
                marginBottom: 8,
              }}
            >
              ✕ Cancel Drawing
            </button>
            <div
              style={{
                padding: "6px 8px",
                background: `rgba(${POLYGON_TYPES[activeType].color.stroke.slice(0, 3).join(",")},0.1)`,
                borderRadius: 6,
                fontSize: 11,
                color: "#a1a1aa",
                lineHeight: 1.5,
              }}
            >
              Drawing{" "}
              <b
                style={{
                  color: `rgb(${POLYGON_TYPES[activeType].color.stroke.slice(0, 3).join(",")})`,
                }}
              >
                {POLYGON_TYPES[activeType].label}
              </b>
              <br />
              Click to place vertices. Double‑click or click first point to
              close.
            </div>
          </>
        )}

        {/* ── 3. Drawn Elements Summary ────────── */}
        {hasPolygons && !isDrawing && (
          <>
            <div style={S.divider} />
            <Section label="Drawn Elements">
              <div
                style={{
                  fontSize: 11,
                  color: "#71717a",
                  marginBottom: 8,
                  lineHeight: 1.6,
                }}
              >
                {POLYGON_TYPE_KEYS.map((key) => {
                  const count = features.features.filter(
                    (f) => f.properties?._type === key,
                  ).length;
                  if (count === 0) return null;
                  const def = POLYGON_TYPES[key];
                  const [r, g, b] = def.color.stroke;
                  return (
                    <span key={key} style={{ marginRight: 10 }}>
                      <span style={{ color: `rgb(${r},${g},${b})` }}>
                        {def.icon}
                      </span>{" "}
                      {count} {def.label}
                    </span>
                  );
                })}
                {areaSqM != null && (
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#fff",
                      marginTop: 4,
                    }}
                  >
                    {formatArea(areaSqM)}
                  </div>
                )}
              </div>

              {selectedFeatureIndex === null && (
                <div style={{ fontSize: 11, color: "#5ebbff" }}>
                  Click a polygon to edit properties.
                </div>
              )}
            </Section>
          </>
        )}

        {/* ── 4. Selected Polygon Properties ──── */}
        {selectedFeature && selectedTypeDef && !isDrawing && (
          <>
            <div style={S.divider} />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: `rgb(${selectedTypeDef.color.stroke.slice(0, 3).join(",")})`,
                }}
              >
                {selectedTypeDef.icon} {selectedTypeDef.label} #
                {selectedFeatureIndex! + 1}
              </div>
              <button
                onClick={() => actions.deleteFeature(selectedFeatureIndex!)}
                style={{
                  padding: "2px 8px",
                  background: "rgba(255,107,107,0.15)",
                  border: "none",
                  borderRadius: 4,
                  color: "#ff6b6b",
                  fontSize: 10,
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
              <Button
                size="small"
                severity={isEditing ? "info" : "secondary"}
                outlined
                onClick={() => (isEditing ? actions.stopEditing() : actions.startEditing())}
              >
                {isEditing ? "Done" : "Edit Shape"}
              </Button>
            </div>

            {selectedTypeDef.properties.map((propDef) => {
              if (
                !isPropertyVisible(propDef, selectedFeature.properties || {})
              )
                return null;
              return (
                <PropertyField
                  key={propDef.key}
                  def={propDef}
                  value={selectedFeature.properties?.[propDef.key]}
                  onChange={(val) =>
                    actions.updateFeatureProperty(
                      selectedFeatureIndex!,
                      propDef.key,
                      val,
                    )
                  }
                  onOpenCodeEditor={(def, currentValue) =>
                    openCodeEditor(def, currentValue, selectedFeatureIndex!)
                  }
                />
              );
            })}

            {selectedTypeDef.edgeProperties && selectedEdgeIndex === null && (
              <div style={{ fontSize: 11, color: "#fbb03b", marginTop: 4 }}>
                Click an amber edge to set boundary conditions.
              </div>
            )}
          </>
        )}

        {/* ── 5. Selected Edge Properties ──────── */}
        {selectedFeature &&
          selectedTypeDef?.edgeProperties &&
          selectedEdgeIndex !== null &&
          !isDrawing && (
            <>
              <div style={S.divider} />
              <div style={{ ...S.sectionLabel, color: "#00dcff" }}>
                Edge #{selectedEdgeIndex + 1}
              </div>

              {selectedTypeDef.edgeProperties.map((propDef) => {
                if (!isPropertyVisible(propDef, edgeValues || {})) return null;
                return (
                  <PropertyField
                    key={propDef.key}
                    def={propDef}
                    value={edgeValues?.[propDef.key]}
                    onChange={(val) =>
                      actions.updateEdgeProperty(
                        selectedFeatureIndex!,
                        selectedEdgeIndex,
                        propDef.key,
                        val,
                      )
                    }
                  />
                );
              })}
            </>
          )}

        {/* ── 6. Simulation Config ─────────────── */}
        <div style={S.divider} />
        <Section label="Solver Config" defaultOpen={false}>
          {SIMULATION_PARAMS.map((propDef) => (
            <PropertyField
              key={propDef.key}
              def={propDef}
              value={config[propDef.key]}
              onChange={(val) => actions.updateConfig(propDef.key, val)}
            />
          ))}
        </Section>

        {/* ── 7. Action Buttons ────────────────── */}
        {!isDrawing && (
          <>
            <div style={S.divider} />

            {/* Job status */}
            {job.status !== "idle" && (
              <div
                style={{
                  fontSize: 11,
                  color:
                    job.status === "error"
                      ? "#ff6b6b"
                      : job.status === "done"
                        ? "#22c55e"
                        : "#5ebbff",
                  marginBottom: 8,
                }}
              >
                {job.status === "submitting" && "⏳ Submitting…"}
                {job.status === "meshing" && "⏳ Generating mesh…"}
                {job.status === "solving" && `⏳ Solving… ${job.progress != null ? `${job.progress}%` : ""}`}
                {job.status === "done" && `✓ Complete${job.id ? ` (${job.id})` : ""}`}
                {job.status === "error" && `✕ Error: ${job.error}`}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              {hasPolygons && (
                <Button
                  onClick={actions.clearAll}
                  disabled={isJobBusy}
                  severity="danger"
                >
                  Clear All
                </Button>
              )}
              <Button
                onClick={actions.submitSimulation}
                disabled={!hasPolygons || isJobBusy}
              >
                {isJobBusy ? "Running…" : "Run Simulation"}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* ── Code Editor Modal (portal-level) ──── */}
      {codeEditor.open && (
        <CodeEditorModal
          title={codeEditor.title}
          value={codeEditor.value}
          placeholder={codeEditor.placeholder}
          onSave={handleCodeSave}
          onClose={() => setCodeEditor(closedEditor)}
        />
      )}
    </>
  );
}
