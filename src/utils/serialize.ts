/* ─────────────────────────────────────────────
 *  Serialize — convert context state → API payload
 *
 *  Groups features by their _type, strips internal
 *  keys, and bundles with simulation config.
 *
 *  For properties with a `_source` toggle set to
 *  "python", the `_code` string is sent instead of
 *  the constant value.
 * ───────────────────────────────────────────── */

import type { SimulationState } from "../context/SimulationContext";
import { POLYGON_TYPES } from "../config/polygonTypes";

export interface SimulationPayload {
  config: Record<string, any>;
  /** Features grouped by polygon type key */
  features: Record<string, FeaturePayload[]>;
}

export interface FeaturePayload {
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
  properties: Record<string, any>;
  edges: Record<string, any>[];
}

/**
 * Convert the full simulation state into a clean API payload.
 *
 * The backend receives:
 * {
 *   config: { mesh_max_area: 100, duration: 3600, ... },
 *   features: {
 *     region: [ { geometry, properties, edges }, ... ],
 *     inlet:  [ ... ],
 *     rate:   [ ... ],
 *     elevation: [ ... ],
 *   }
 * }
 *
 * For Python-sourced properties, the payload contains:
 *   { Q: { type: "python", code: "def Q(t): ..." } }
 * instead of:
 *   { Q: 1.0 }
 */
export function serializePayload(state: SimulationState): SimulationPayload {
  const grouped: Record<string, FeaturePayload[]> = {};

  // Initialize all known types with empty arrays
  for (const key of Object.keys(POLYGON_TYPES)) {
    grouped[key] = [];
  }

  for (const feature of state.features.features) {
    const props = { ...feature.properties } as Record<string, any>;
    const typeKey = props._type as string;

    // Separate edges from properties
    const edges: Record<string, any>[] = props.edges || [];
    delete props._type;
    delete props.edges;

    // Resolve source toggles: if X_source === "python", send X as { type, code }
    // and remove the helper keys (X_source, X_code)
    const cleanProps: Record<string, any> = {};
    const sourceKeys = Object.keys(props).filter((k) => k.endsWith("_source"));

    for (const sk of sourceKeys) {
      const base = sk.replace(/_source$/, "");
      const source = props[sk];
      const codeKey = `${base}_code`;

      if (source === "python" && props[codeKey]) {
        cleanProps[base] = { type: "python", code: props[codeKey] };
      } else {
        // constant — keep the numeric/scalar value as-is
        cleanProps[base] = props[base];
      }

      // Mark consumed keys
      delete props[sk];
      delete props[codeKey];
      delete props[base];
    }

    // Copy remaining (non-consumed) properties
    for (const [k, v] of Object.entries(props)) {
      if (!(k in cleanProps)) cleanProps[k] = v;
    }

    const payload: FeaturePayload = {
      geometry: feature.geometry as any,
      properties: cleanProps,
      edges,
    };

    if (grouped[typeKey]) {
      grouped[typeKey].push(payload);
    } else {
      grouped[typeKey] = [payload];
    }
  }

  return {
    config: { ...state.config },
    features: grouped,
  };
}
