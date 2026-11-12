/**
 * SPHEREx SkyShift - Coordinate Navigation & Target Preset Panel
 * Accepts decimal degrees, sexagesimal formats (HH:MM:SS, DD:MM:SS, 08h55m10.831s, -7d14m42.53s),
 * selectable Fields of View (FOV), and benchmark test targets.
 */

import React, { useState } from 'react';
import { TargetPreset } from '../types/astronomy';
import { BENCHMARK_TARGETS } from '../data/spherexTargets';
import {
  parseRightAscension,
  parseDeclination,
  degreesToSexagesimalRA,
  degreesToSexagesimalDec,
} from '../utils/coordinates';
import { Navigation, Compass, Star, Check, Copy } from 'lucide-react';

interface CoordinatePanelProps {
  currentRa: number;
  currentDec: number;
  currentFov: number;
  onCoordinatesSubmit: (ra: number, dec: number, fov: number, targetPreset?: TargetPreset) => void;
  activeTarget?: TargetPreset;
}

export const CoordinatePanel: React.FC<CoordinatePanelProps> = ({
  currentRa,
  currentDec,
  currentFov,
  onCoordinatesSubmit,
  activeTarget,
}) => {
  const [raInput, setRaInput] = useState<string>(degreesToSexagesimalRA(currentRa));
  const [decInput, setDecInput] = useState<string>(degreesToSexagesimalDec(currentDec));
  const [fovSelect, setFovSelect] = useState<number>(currentFov);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const parsedRa = parseRightAscension(raInput);
    const parsedDec = parseDeclination(decInput);

    if (parsedRa === null) {
      setErrorMessage('Invalid Right Ascension. Format as 17h 57m 48.5s or decimal degrees (0–360).');
      return;
    }

    if (parsedDec === null) {
      setErrorMessage('Invalid Declination. Format as +04° 41\' 36" or -7d14m42.53s or (-90 to +90).');
      return;
    }

    onCoordinatesSubmit(parsedRa, parsedDec, fovSelect);
  };

  const handleSelectPreset = (target: TargetPreset) => {
    setRaInput(target.raStr);
    setDecInput(target.decStr);
    setFovSelect(target.fovArcmin);
    setErrorMessage(null);
    onCoordinatesSubmit(target.ra, target.dec, target.fovArcmin, target);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-slate-200">
          <Navigation className="w-3.5 h-3.5 text-cyan-400" />
          <span>Celestial Coordinates & Target Preset</span>
        </div>
        <button
          onClick={handleCopyLink}
          className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
        >
          {copiedLink ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">URL Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Share Deep Link</span>
            </>
          )}
        </button>
      </div>

      {/* Coordinate Input Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400 font-medium">Right Ascension (RA, J2000)</label>
            <input
              type="text"
              value={raInput}
              onChange={(e) => setRaInput(e.target.value)}
              placeholder="e.g. 17h 57m 48.5s or 269.452°"
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400 font-medium">Declination (Dec, J2000)</label>
            <input
              type="text"
              value={decInput}
              onChange={(e) => setDecInput(e.target.value)}
              placeholder="e.g. +04° 41' 36.2&quot; or -7d14m42.53s"
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* FOV & Go Button */}
        <div className="flex items-center gap-2.5 pt-1">
          <div className="flex-1 flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5">
            <Compass className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-400 text-[11px]">Field of View:</span>
            <div className="flex items-center gap-1 font-mono">
              {[3.5, 7.0, 15.0, 30.0].map((fov) => (
                <button
                  type="button"
                  key={fov}
                  onClick={() => setFovSelect(fov)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    fovSelect === fov
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {fov}′
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg text-xs transition-colors shrink-0 shadow-sm"
          >
            Slew Telescope
          </button>
        </div>

        {errorMessage && (
          <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 rounded px-2.5 py-1.5 font-mono">
            {errorMessage}
          </div>
        )}
      </form>

      {/* Benchmark Presets Bar (Required by NASA Challenge) */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 font-medium">
            <Star className="w-3 h-3 text-amber-400" />
            <span>NASA Challenge Benchmark Presets:</span>
          </span>
          <span className="text-slate-500 font-mono">Click to test</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {BENCHMARK_TARGETS.slice(0, 5).map((tgt) => {
            const isActive = activeTarget?.id === tgt.id;
            return (
              <button
                type="button"
                key={tgt.id}
                onClick={() => handleSelectPreset(tgt)}
                className={`p-2 rounded-lg border text-left transition-colors flex flex-col gap-0.5 ${
                  isActive
                    ? 'bg-amber-950/40 border-amber-500/80 text-amber-200'
                    : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                <div className="font-semibold text-xs text-white flex items-center justify-between">
                  <span className="truncate">{tgt.name}</span>
                  {isActive && <Check className="w-3 h-3 text-amber-400 shrink-0" />}
                </div>
                <div className="text-[10px] text-slate-400 truncate">{tgt.subtitle}</div>
                <div className="text-[10px] font-mono text-cyan-400/90 truncate">
                  {tgt.properMotionRa !== 0
                    ? `µ: ${(Math.sqrt(tgt.properMotionRa ** 2 + tgt.properMotionDec ** 2) / 1000).toFixed(1)}″/yr`
                    : tgt.isVariable
                    ? 'Variable Flux'
                    : 'Transient'}
                </div>
              </button>
            );
          })}

          {/* Bonus Target */}
          <button
            type="button"
            onClick={() => handleSelectPreset(BENCHMARK_TARGETS[5])}
            className={`p-2 rounded-lg border text-left transition-colors flex flex-col gap-0.5 ${
              activeTarget?.id === BENCHMARK_TARGETS[5].id
                ? 'bg-amber-950/40 border-amber-500/80 text-amber-200'
                : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
            }`}
          >
            <div className="font-semibold text-xs text-white truncate">
              {BENCHMARK_TARGETS[5].name}
            </div>
            <div className="text-[10px] text-slate-400 truncate">Near-Earth Asteroid</div>
            <div className="text-[10px] font-mono text-amber-400/90">Fast Crossing</div>
          </button>
        </div>
      </div>
    </div>
  );
};
