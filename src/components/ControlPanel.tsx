/* ─────────────────────────────────────────────
 *  ControlPanel — left sidebar with all controls
 * ───────────────────────────────────────────── */

import { useFloodState } from "../context/FloodContext";
import { PropertySelector } from "./controlpanel/PropertySelector";
import { TimeControls } from "./controlpanel/TimeControls";
import { OpacitySlider } from "./controlpanel/OpacitySlider";
import { SolutionToggle } from "./controlpanel/SolutionToggle";

export function ControlPanel() {
  const { dataset } = useFloodState();
  if (!dataset) return null;

  return (
    <div className="panel absolute top-20 left-4 z-[1000] w-64 p-4 flex flex-col gap-4">
      <SolutionToggle />
      <PropertySelector />
      <TimeControls />
      <OpacitySlider />
    </div>
  );
}
