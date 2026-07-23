/* ─────────────────────────────────────────────
 *  deserialize — inverse of serializePayload
 *
 *  serializePayload groups features by _type, strips
 *  _type/edges, and collapses `X_source`/`X_code`
 *  helper keys into `{ X: { type: "python", code } }`.
 *
 *  To reload a saved instance we rebuild:
 *    - the flat FeatureCollection (restoring _type + edges)
 *    - the python source toggles (X_source / X_code)
 *    - the solver config
 *
 *  We lean on each type's PropertyDef registry to know
 *  which keys are code-typed, so the reconstruction is
 *  driven by config rather than guesswork.
 * ───────────────────────────────────────────── */

import type { Feature, FeatureCollection } from "geojson";
import { POLYGON_TYPES } from "../config/polygonTypes";
import { defaultSimConfig } from "../config/simulationConfig";
import type { SimulationPayload, FeaturePayload, StormPayload } from "./serialize";
import { placementToFeature } from "./stormPlacement";

/** Set of code-typed property keys for a given polygon type. */
function codeKeysForType(typeKey: string): Set<string> {
  const def = POLYGON_TYPES[typeKey];
  const keys = new Set<string>();
  if (!def) return keys;
  for (const p of def.properties) {
    if (p.type === "code") {
      // code keys are named `<base>_code`; the base is the toggled property
      keys.add(p.key.replace(/_code$/, ""));
    }
  }
  return keys;
}

/** Rebuild one feature's flat properties from the serialized form. */
function rebuildProperties(
  typeKey: string,
  serialized: Record<string, any>,
): Record<string, any> {
  const codeBases = codeKeysForType(typeKey);
  const props: Record<string, any> = { _type: typeKey };

  for (const [key, value] of Object.entries(serialized)) {
    const isPythonBlock =
      value &&
      typeof value === "object" &&
      value.type === "python" &&
      typeof value.code === "string";

    if (isPythonBlock || codeBases.has(key)) {
      // Reconstruct the source toggle + code/constant split
      if (isPythonBlock) {
        props[`${key}_source`] = "python";
        props[`${key}_code`] = value.code;
      } else {
        props[`${key}_source`] = "constant";
        props[key] = value;
      }
    } else {
      props[key] = value;
    }
  }
  return props;
}

/**
 * Convert a saved SimulationPayload back into the pieces SimulationProvider
 * needs to hydrate its state: a flat FeatureCollection and a config object.
 */
export function deserializePayload(payload: SimulationPayload | null): {
  features: FeatureCollection;
  config: Record<string, any>;
} {
  const features: Feature[] = [];

  if (payload?.features) {
    for (const [typeKey, list] of Object.entries(payload.features)) {
      // Storms carry no geometry/properties/edges of their own — the ring is
      // rebuilt from the placement transform (mirrors serializePayload's
      // storm branch, which only ever emits {storm_ref, placement}).
      if (typeKey === "storm") {
        for (const item of list as StormPayload[]) {
          features.push(placementToFeature(item.storm_ref, item.placement));
        }
        continue;
      }

      for (const item of list as FeaturePayload[]) {
        features.push({
          type: "Feature",
          geometry: item.geometry as any,
          properties: {
            ...rebuildProperties(typeKey, item.properties || {}),
            edges: item.edges ?? [],
          },
        });
      }
    }
  }

  // Start from defaults so any params added since the save still exist.
  const config = { ...defaultSimConfig(), ...(payload?.config ?? {}) };

  return {
    features: { type: "FeatureCollection", features },
    config,
  };
}
