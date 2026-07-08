/* ─────────────────────────────────────────────
 *  TimeControls — frame slider + transport buttons
 * ───────────────────────────────────────────── */

import { useFloodState, useFloodActions } from "../../context/FloodContext";

export function TimeControls() {
  const { dataset, currentFrame, isPlaying, playbackSpeed } = useFloodState();
  const { setCurrentFrame, stepFrame, togglePlay, cycleSpeed, decodeFrame } = useFloodActions();

  if (!dataset) return null;

  const frame = decodeFrame(currentFrame);
  const timeLabel = frame ? `${frame._t}` : "0.0";
  const maxFrame = dataset.times.length - 1;

  return (
    <div>
      <label className="ctrl-label">Time</label>

      <div className="flex flex-col gap-2">
        {/* Current time display */}
        <div className="text-center font-mono text-xl font-semibold text-accent leading-none">
          {timeLabel} <small className="text-xs font-normal text-dim">min</small>
        </div>

        {/* Slider */}
        <input
          type="range"
          min={0}
          max={maxFrame}
          value={currentFrame}
          step={1}
          onChange={(e) => setCurrentFrame(Number(e.target.value))}
          className="slider w-full"
        />

        {/* Transport buttons */}
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => stepFrame(-1)} className="transport-btn" aria-label="Previous frame">
            ⏮
          </button>
          <button onClick={togglePlay} className="transport-btn" aria-label={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button onClick={() => stepFrame(1)} className="transport-btn" aria-label="Next frame">
            ⏭
          </button>
          <button
            onClick={cycleSpeed}
            className="font-mono text-xs text-dim hover:text-accent transition ml-1"
          >
            {playbackSpeed}×
          </button>
        </div>
      </div>
    </div>
  );
}
