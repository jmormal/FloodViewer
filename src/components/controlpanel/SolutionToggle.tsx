import { useFloodState, useFloodActions } from "../../context/FloodContext";
import { Button } from "../buttons/Button";

export function SolutionToggle() {
  const { showSolution } = useFloodState();
  const { toggleShowSolution } = useFloodActions();

  return (
    <div>
      <label className="ctrl-label">Visualization</label>
      <Button
        onClick={toggleShowSolution}
        severity={!showSolution ? "primary" : "secondary"}
        outlined={showSolution}
        className="w-full justify-start text-xs"
        icon={!showSolution ? "pi pi-eye" : "pi pi-eye-slash"}
      >
        {!showSolution ? "Show Flood Simulation" : "Hide Flood Simulation"}
      </Button>
    </div>
  );
}
