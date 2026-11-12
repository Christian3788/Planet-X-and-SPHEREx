/**
 * SPHEREx SkyShift - NASA Benchmark Targets Dossier & Detailed View
 * Comprehensive astrophysical dossiers for Barnard's Star, Epsilon Indi B,
 * WISE 0855-0714, RW Aurigae, R Draconis, and solar system asteroids.
 */

import React from 'react';
import { TargetPreset } from '../types/astronomy';
import { BENCHMARK_TARGETS } from '../data/spherexTargets';
import { Telescope, Play, Flame, Compass, Activity, ExternalLink } from 'lucide-react';

interface BenchmarkTargetsViewProps {
  onSelectTarget: (target: TargetPreset) => void;
  currentTargetId?: string;
}

export const BenchmarkTargetsView: React.FC<BenchmarkTargetsViewProps> = ({
  onSelectTarget,
  currentTargetId,
}) => {
  return (
    <div className="flex flex-col gap-6">
      {/* Introduction Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col gap-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Telescope className="w-5 h-5 text-cyan-400" />
          <span>NASA Challenge Benchmark Test Suite</span>
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          The 2026 NASA Space Apps Challenge specifies five critical astrophysical test objects
          to validate that the tool makes moving brown dwarfs, high-proper-motion stars, and variable
          infrared sources immediately visible. Click any benchmark to load its multi-epoch SPHEREx observations.
        </p>
      </div>

      {/* Target Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {BENCHMARK_TARGETS.map((tgt) => {
          const isSelected = currentTargetId === tgt.id;
          const totalPm = Math.sqrt(tgt.properMotionRa ** 2 + tgt.properMotionDec ** 2);

          return (
            <div
              key={tgt.id}
              className={`bg-slate-900/90 border rounded-xl p-5 flex flex-col justify-between gap-4 transition-all ${
                isSelected
                  ? 'border-cyan-500 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col gap-2.5">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white">{tgt.name}</h3>
                    <p className="text-xs text-cyan-400 font-medium">{tgt.subtitle}</p>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {tgt.spectralClass}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {tgt.description}
                </p>

                {/* Key Astrometric Metrics */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 font-mono text-[11px]">
                  <div className="bg-slate-950/60 p-2 rounded border border-slate-800/60">
                    <span className="text-slate-500 block text-[10px]">COORDINATES (J2000)</span>
                    <span className="text-white truncate block">{tgt.raStr}</span>
                    <span className="text-slate-400 truncate block">{tgt.decStr}</span>
                  </div>

                  <div className="bg-slate-950/60 p-2 rounded border border-slate-800/60">
                    <span className="text-slate-500 block text-[10px]">
                      {tgt.isVariable ? 'VARIABILITY' : 'PROPER MOTION'}
                    </span>
                    {tgt.properMotionRa !== 0 ? (
                      <span className="text-amber-300 font-semibold block">
                        {(totalPm / 1000).toFixed(2)}″ / yr
                      </span>
                    ) : tgt.isVariable ? (
                      <span className="text-rose-400 font-semibold block">
                        Δ {tgt.variabilityAmplitudeMag} mag
                      </span>
                    ) : (
                      <span className="text-cyan-300 block">Fast Orbit</span>
                    )}
                    <span className="text-slate-400 text-[10px] block">
                      Dist: {tgt.distanceLy > 1000 ? `${(tgt.distanceLy / 1000).toFixed(1)}k ly` : `${tgt.distanceLy} ly`}
                    </span>
                  </div>
                </div>

                {/* Scientific Features & Ice Lines */}
                <div className="flex flex-wrap gap-1 text-[10px] text-slate-400">
                  {tgt.features.map((feat) => (
                    <span
                      key={feat}
                      className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800/80 text-slate-300"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onSelectTarget(tgt)}
                className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-white'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isSelected ? 'Currently Loaded in Viewer' : 'Load Target into SkyShift'}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
