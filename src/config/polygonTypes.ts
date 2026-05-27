/* ─────────────────────────────────────────────
 *  Polygon Type Registry
 *
 *  Add, remove, or edit polygon types here.
 *  Everything downstream (drawing, colors, UI)
 *  reads from this config automatically.
 * ───────────────────────────────────────────── */

/* ── Property definition ─────────────────────── */

export interface PropertyDef {
  key: string;
  label: string;
  type: "number" | "select" | "text" | "code";
  default: any;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  /** If set, this property only shows when another property matches a value */
  showWhen?: { key: string; value: any };
  /** Language hint for code editor (default: "python") */
  language?: string;
  /** Placeholder text shown in the code editor */
  placeholder?: string;
}

/* ── Polygon type definition ─────────────────── */

export interface PolygonTypeDef {
  key: string;
  label: string;
  icon: string;
  description: string;
  color: {
    fill: [number, number, number, number];
    stroke: [number, number, number, number];
    fillSelected: [number, number, number, number];
  };
  /** Per-polygon properties (shown when polygon is selected) */
  properties: PropertyDef[];
  /** Per-edge properties (shown when an edge is clicked). Omit = no edge editing */
  edgeProperties?: PropertyDef[];
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  THE REGISTRY — edit this object to customise
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export const POLYGON_TYPES: Record<string, PolygonTypeDef> = {
  /* ── 1. Region ─────────────────────────────── */
  region: {
    key: "region",
    label: "Region",
    icon: "▢",
    description: "Domain sub-area: friction & initial conditions",
    color: {
      fill: [255, 107, 107, 30],
      stroke: [255, 107, 107, 200],
      fillSelected: [255, 107, 107, 60],
    },
    properties: [
      {
        key: "friction",
        label: "Friction (Manning n)",
        type: "number",
        default: 0.03,
        min: 0.001,
        max: 0.2,
        step: 0.001,
      },
      {
        key: "initial_stage",
        label: "Initial Stage",
        type: "number",
        default: 0,
        step: 0.1,
        unit: "m",
      },
      {
        key: "initial_elevation",
        label: "Initial Elevation",
        type: "number",
        default: 0,
        step: 0.1,
        unit: "m",
      },
    ],
    edgeProperties: [
      {
        key: "boundary",
        label: "Boundary",
        type: "select",
        default: "transmissive",
        options: [
          { value: "reflective", label: "Reflective (wall)" },
          { value: "transmissive", label: "Transmissive (open)" },
          { value: "dirichlet", label: "Dirichlet (fixed)" },
        ],
      },
      {
        key: "stage",
        label: "Stage",
        type: "number",
        default: 0,
        step: 0.1,
        unit: "m",
        showWhen: { key: "boundary", value: "dirichlet" },
      },
      {
        key: "xmomentum",
        label: "X-Momentum",
        type: "number",
        default: 0,
        step: 0.01,
        unit: "m²/s",
        showWhen: { key: "boundary", value: "dirichlet" },
      },
      {
        key: "ymomentum",
        label: "Y-Momentum",
        type: "number",
        default: 0,
        step: 0.01,
        unit: "m²/s",
        showWhen: { key: "boundary", value: "dirichlet" },
      },
    ],
  },

  /* ── 2. Inlet ──────────────────────────────── */
  inlet: {
    key: "inlet",
    label: "Inlet",
    icon: "◉",
    description: "Inject discharge (m³/s) — Inlet_operator",
    color: {
      fill: [59, 130, 246, 30],
      stroke: [59, 130, 246, 200],
      fillSelected: [59, 130, 246, 60],
    },
    properties: [
      {
        key: "Q_source",
        label: "Discharge Source",
        type: "select",
        default: "constant",
        options: [
          { value: "constant", label: "Constant value" },
          { value: "python", label: "Python function" },
        ],
      },
      {
        key: "Q",
        label: "Discharge (Q)",
        type: "number",
        default: 1.0,
        min: 0,
        step: 0.1,
        unit: "m³/s",
        showWhen: { key: "Q_source", value: "constant" },
      },
      {
        key: "Q_code",
        label: "Q(t) Function",
        type: "code",
        default: "def Q(t):\n    \"\"\"Discharge in m³/s as a function of time (seconds).\"\"\"\n    return 1.0\n",
        showWhen: { key: "Q_source", value: "python" },
        language: "python",
        placeholder: "def Q(t):\n    return 1.0\n",
      },
      {
        key: "velocity_direction",
        label: "Velocity Direction",
        type: "number",
        default: 0,
        min: 0,
        max: 360,
        step: 1,
        unit: "°",
      },
      {
        key: "label",
        label: "Label",
        type: "text",
        default: "",
      },
    ],
  },

  /* ── 3. Rate ───────────────────────────────── */
  rate: {
    key: "rate",
    label: "Rate",
    icon: "🌧",
    description: "Rainfall / evaporation — Rate_operator",
    color: {
      fill: [34, 197, 94, 30],
      stroke: [34, 197, 94, 200],
      fillSelected: [34, 197, 94, 60],
    },
    properties: [
      {
        key: "rate_source",
        label: "Rate Source",
        type: "select",
        default: "constant",
        options: [
          { value: "constant", label: "Constant value" },
          { value: "python", label: "Python function" },
        ],
      },
      {
        key: "rate",
        label: "Rate s ",
        type: "number",
        default: 10,
        step: 0.5,
        unit: "mm/hr",
        showWhen: { key: "rate_source", value: "constant" },
      },
      {
        key: "rate_code",
        label: "rate(t) Function",
        type: "code",
        default: "def rate(t):\n    \"\"\"Rainfall rate in mm/hr as a function of time (seconds).\"\"\"\n    return 10.0\n",
        showWhen: { key: "rate_source", value: "python" },
        language: "python",
        placeholder: "def rate(t):\n    return 10.0\n",
      },
      {
        key: "label",
        label: "Label",
        type: "text",
        default: "",
      },
    ],
  },

  /* ── 4. Elevation ──────────────────────────── */
  elevation: {
    key: "elevation",
    label: "Elevation",
    icon: "△",
    description: "Set bed elevation — Set_elevation_operator",
    color: {
      fill: [245, 158, 11, 30],
      stroke: [245, 158, 11, 200],
      fillSelected: [245, 158, 11, 60],
    },
    properties: [
      {
        key: "elevation",
        label: "Elevation",
        type: "number",
        default: 0,
        step: 0.1,
        unit: "m",
      },
      {
        key: "mode",
        label: "Mode",
        type: "select",
        default: "relative",
        options: [
          { value: "absolute", label: "Absolute" },
          { value: "relative", label: "Relative (+/−)" },
        ],
      },
      {
        key: "label",
        label: "Label",
        type: "text",
        default: "",
      },
    ],
  },
};

/* ── Helpers ─────────────────────────────────── */

export const POLYGON_TYPE_KEYS = Object.keys(POLYGON_TYPES);

export type PolygonTypeKey = keyof typeof POLYGON_TYPES;

/** Build default property values for a polygon type */
export function defaultPropsForType(typeKey: string): Record<string, any> {
  const typeDef = POLYGON_TYPES[typeKey];
  if (!typeDef) return {};
  const props: Record<string, any> = { _type: typeKey };
  for (const p of typeDef.properties) {
    props[p.key] = p.default;
  }
  return props;
}

/** Build default edge properties for a polygon type */
export function defaultEdgeProps(typeKey: string): Record<string, any> {
  const typeDef = POLYGON_TYPES[typeKey];
  if (!typeDef?.edgeProperties) return {};
  const props: Record<string, any> = {};
  for (const p of typeDef.edgeProperties) {
    props[p.key] = p.default;
  }
  return props;
}

/** Check if a property should be visible given current values */
export function isPropertyVisible(
  prop: PropertyDef,
  currentValues: Record<string, any>,
): boolean {
  if (!prop.showWhen) return true;
  return currentValues[prop.showWhen.key] === prop.showWhen.value;
}
