/* ─────────────────────────────────────────────
 *  ControlPanel — left sidebar with all controls
 * ───────────────────────────────────────────── */

import { useFloodState } from "../context/FloodContext";
import { PropertySelector } from "./PropertySelector";
import { TimeControls } from "./TimeControls";
import { OpacitySlider } from "./OpacitySlider";

export function ControlPanel() {
  const { dataset } = useFloodState();
  if (!dataset) return null;

  return (
    <div className="panel absolute top-20 left-4 z-[1000] w-64 p-4 flex flex-col gap-4">
      <PropertySelector />
      <TimeControls />
      <OpacitySlider />
    </div>
  );
}
