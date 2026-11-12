/**
 * SPHEREx SkyShift - Multi-Epoch Playback & Inspection Controls
 * Provides Blink Comparator, Time-Lapse Video, Difference Subtraction,
 * Stacking Co-addition, and Playback rate controls.
 */

import React from 'react';
import { EpochViewMode } from '../types/astronomy';
import { SPHEREX_SURVEY_EPOCHS } from '../data/spectralBands';
import { Play, Pause, SkipBack, SkipForward, Layers, Split, Clock, RefreshCw } from 'lucide-react';

interface PlaybackControlsProps {
  viewMode: EpochViewMode;
  setViewMode: (mode: EpochViewMode) => void;
  activeEpoch: number;
  setActiveEpoch: (epoch: number) => void;
  compareEpoch: number;
  setCompareEpoch: (epoch: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  blinkSpeedFps: number;
  setBlinkSpeedFps: (fps: number) => void;
  currentBlinkFrame: number;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  viewMode,
  setViewMode,
  activeEpoch,
  setActiveEpoch,
  compareEpoch,
  setCompareEpoch,
  isPlaying,
  setIsPlaying,
  blinkSpeedFps,
  setBlinkSpeedFps,
  currentBlinkFrame,
}) => {
  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStepForward = () => {
    setActiveEpoch((activeEpoch % 4) + 1);
  };

  const handleStepBackward = () => {
    setActiveEpoch(activeEpoch === 1 ? 4 : activeEpoch - 1);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3.5">
      {/* Top Row: View Mode Segmented Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => {
              setViewMode('single');
              setIsPlaying(false);
            }}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
              viewMode === 'single'
                ? 'bg-slate-800 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Single Pass
          </button>
          <button
            onClick={() => {
              setViewMode('blink');
              setIsPlaying(true);
            }}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              viewMode === 'blink'
                ? 'bg-slate-800 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <RefreshCw className="w-3 h-3" />
            <span>Blink Comparator</span>
          </button>
          <button
            onClick={() => {
              setViewMode('timelapse');
              setIsPlaying(true);
            }}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              viewMode === 'timelapse'
                ? 'bg-slate-800 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Time-Lapse Video</span>
          </button>
          <button
            onClick={() => {
              setViewMode('difference');
              setIsPlaying(false);
            }}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              viewMode === 'difference'
                ? 'bg-slate-800 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Split className="w-3 h-3" />
            <span>Difference (B - A)</span>
          </button>
          <button
            onClick={() => {
              setViewMode('stacked_coadd');
              setIsPlaying(false);
            }}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              viewMode === 'stacked_coadd'
                ? 'bg-slate-800 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Stack Co-add</span>
          </button>
        </div>

        {/* Speed / FPS Selector (when blinking or timelapse) */}
        {(viewMode === 'blink' || viewMode === 'timelapse') && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-mono">Blink Speed:</span>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 font-mono">
              {[0.5, 1.0, 2.0, 4.0].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setBlinkSpeedFps(speed)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    blinkSpeedFps === speed
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Second Row: Playback Controls & Epoch Selection */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-slate-800/80">
        {/* Play/Pause & Stepper Controls */}
        <div className="flex items-center gap-2">
          {(viewMode === 'blink' || viewMode === 'timelapse') && (
            <button
              onClick={handleTogglePlay}
              className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleStepBackward}
            title="Step to Previous Epoch"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleStepForward}
            title="Step to Next Epoch"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Epoch Selector Buttons */}
        <div className="flex items-center gap-3">
          {viewMode === 'difference' || viewMode === 'blink' ? (
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-mono">Reference (Epoch A):</span>
                <select
                  value={activeEpoch}
                  onChange={(e) => setActiveEpoch(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                >
                  {SPHEREX_SURVEY_EPOCHS.map((ep) => (
                    <option key={ep.epochId} value={ep.epochId}>
                      {ep.label} ({ep.dateString})
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-slate-600 font-bold">vs</span>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-mono">Comparison (Epoch B):</span>
                <select
                  value={compareEpoch}
                  onChange={(e) => setCompareEpoch(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-amber-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                >
                  {SPHEREX_SURVEY_EPOCHS.map((ep) => (
                    <option key={ep.epochId} value={ep.epochId}>
                      {ep.label} ({ep.dateString})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : viewMode === 'stacked_coadd' ? (
            <div className="text-xs text-slate-400 font-mono">
              Co-adding all 4 survey passes (Total integration time: 24 months all-sky baseline)
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-mono text-xs mr-1">Survey Pass:</span>
              {SPHEREX_SURVEY_EPOCHS.map((ep) => (
                <button
                  key={ep.epochId}
                  onClick={() => setActiveEpoch(ep.epochId)}
                  className={`px-2.5 py-1 text-xs rounded-md font-mono transition-colors ${
                    activeEpoch === ep.epochId
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-semibold'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {ep.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
