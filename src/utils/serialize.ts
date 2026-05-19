/* ─────────────────────────────────────────────
 *  Serialize — convert context state → API payload
 *
 *  Groups features by their _type, strips internal
 *  keys, and bundles with simulation config.
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

    const payload: FeaturePayload = {
      geometry: feature.geometry as any,
      properties: props,
      edges,
    };

    if (grouped[typeKey]) {
      grouped[typeKey].push(payload);
    } else {
      // Unknown type — keep it under its own key
      grouped[typeKey] = [payload];
    }
  }

  return {
    config: { ...state.config },
    features: grouped,
  };
}
