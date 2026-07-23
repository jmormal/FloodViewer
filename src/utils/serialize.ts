/* ─────────────────────────────────────────────
 *  Serialize — convert context state → API payload
 *
 *  Groups features by their _type, strips internal keys, and bundles with
 *  simulation config. Python-sourced properties become { type, code }.
 *
 *  STORM features are special: they carry no polygon-type properties, only a
 *  storm_ref (catalog id) and a placement transform. They are emitted under
 *  features.storm as { storm_ref, placement } and skip the normal property
 *  pipeline entirely.
 * ───────────────────────────────────────────── */

import type { SimulationState } from "../context/SimulationContext";
import { POLYGON_TYPES } from "../config/polygonTypes";

export interface SimulationPayload {
  config: Record<string, any>;
  features: Record<string, any[]>;
}

export interface FeaturePayload {
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
  properties: Record<string, any>;
  edges: Record<string, any>[];
}

export interface StormPayload {
  storm_ref: string;
  // Placement in lon/lat degrees; the worker reprojects to EPSG:25830 metres.
  placement: {
    centerLng: number;
    centerLat: number;
    halfW: number;
    halfH: number;
    rotationDeg: number;
  };
}

export function serializePayload(state: SimulationState): SimulationPayload {
  const grouped: Record<string, any[]> = {};

  // Initialize all known polygon types with empty arrays
  for (const key of Object.keys(POLYGON_TYPES)) {
    grouped[key] = [];
  }
  grouped.storm = []; // storms are a feature type but not a POLYGON_TYPE

  for (const feature of state.features.features) {
    const props = { ...feature.properties } as Record<string, any>;
    const typeKey = props._type as string;

    // ── Storm: emit ref + placement, skip the property pipeline ──
    if (typeKey === "storm") {
      grouped.storm.push({
        storm_ref: props.storm_ref,
        placement: props.placement,
      } as StormPayload);
      continue;
    }

    // ── Normal polygon features ──
    const edges: Record<string, any>[] = props.edges || [];
    delete props._type;
    delete props.edges;

    const cleanProps: Record<string, any> = {};
    const sourceKeys = Object.keys(props).filter((k) => k.endsWith("_source"));

    for (const sk of sourceKeys) {
      const base = sk.replace(/_source$/, "");
      const source = props[sk];
      const codeKey = `${base}_code`;

      if (source === "python" && props[codeKey]) {
        cleanProps[base] = { type: "python", code: props[codeKey] };
      } else {
        cleanProps[base] = props[base];
      }

      delete props[sk];
      delete props[codeKey];
      delete props[base];
    }

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
