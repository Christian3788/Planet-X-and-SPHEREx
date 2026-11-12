/**
 * SPHEREx SkyShift - On-the-Fly 102-Band Spectral Energy Distribution (SED) Analyzer
 * Renders calibrated 102-point near-infrared spectrum (0.75 - 5.0 µm) with
 * molecular ice absorption identifications (H2O, CO2, CO, CH4) and Planck temperature fits.
 */

import React, { useState } from 'react';
import { StarObject } from '../types/astronomy';
import { extract102BandSpectrum } from '../utils/fitsSimulation';
import { DETECTOR_ARRAYS, MOLECULAR_ICE_MARKERS } from '../data/spectralBands';
import { Activity, Sparkles, Flame, Info } from 'lucide-react';

interface SpectralViewerProps {
  selectedStar: StarObject;
  epoch: number;
}

export const SpectralViewer: React.FC<SpectralViewerProps> = ({ selectedStar, epoch }) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    bandIndex: number;
    wavelengthUm: number;
    fluxMjy: number;
    array: number;
    x: number;
    y: number;
  } | null>(null);

  const [showBlackbodyFit, setShowBlackbodyFit] = useState<boolean>(true);

  const spectrumData = extract102BandSpectrum(selectedStar, epoch);

  // SVG Chart Geometry
  const svgWidth = 840;
  const svgHeight = 280;
  const margin = { top: 30, right: 30, bottom: 45, left: 65 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  const minLambda = 0.75;
  const maxLambda = 5.0;

  const maxFlux = Math.max(10, ...spectrumData.map((d) => d.fluxMjy)) * 1.15;
  const minFlux = 0;

  // Coordinate scales
  const scaleX = (lambda: number) =>
    margin.left + ((lambda - minLambda) / (maxLambda - minLambda)) * plotWidth;

  const scaleY = (flux: number) =>
    margin.top + plotHeight - ((flux - minFlux) / (maxFlux - minFlux)) * plotHeight;

  // SVG Path generator for the 102 points
  const pointsPath = spectrumData
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(pt.wavelengthUm)} ${scaleY(pt.fluxMjy)}`)
    .join(' ');

  // Generate Planck Blackbody curve for comparison
  const blackbodyPath = showBlackbodyFit
    ? Array.from({ length: 60 }).map((_, i) => {
        const lambda = minLambda + (i / 59) * (maxLambda - minLambda);
        const temp = selectedStar.temperatureK || 3000;
        const lambdaPeak = 2898 / Math.max(150, temp);
        const x = lambda / lambdaPeak;
        let bVal = (1 / Math.pow(x, 5)) / (Math.exp(Math.min(10, 4.965 / x)) - 1);
        bVal = Math.max(0.01, bVal * 65);
        // Scale to peak flux of star
        const peakFlux = Math.max(...spectrumData.map((d) => d.fluxMjy));
        const fluxEst = bVal * (peakFlux / 3.0);
        return `${i === 0 ? 'M' : 'L'} ${scaleX(lambda)} ${scaleY(Math.min(maxFlux, fluxEst))}`;
      }).join(' ')
    : '';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3.5">
      {/* Header and Object Info */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-white text-sm">
            {selectedStar.name || 'Target Source'} — 102-Band Near-Infrared Spectrum
          </span>
          <span className="text-slate-500">·</span>
          <span className="text-xs text-slate-300 font-mono">{selectedStar.spectralType}</span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-mono text-amber-300">
            <Flame className="w-3.5 h-3.5" />
            <span>T_eff: {selectedStar.temperatureK} K</span>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white font-mono">
            <input
              type="checkbox"
              checked={showBlackbodyFit}
              onChange={(e) => setShowBlackbodyFit(e.target.checked)}
              className="rounded accent-cyan-400"
            />
            <span>Planck Model Curve</span>
          </label>
        </div>
      </div>

      {/* Interactive SVG Chart */}
      <div className="relative w-full overflow-x-auto bg-slate-950 border border-slate-800 rounded-lg p-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[720px] select-none"
        >
          {/* Detector Array Background Shading (Arrays 1 through 6) */}
          {DETECTOR_ARRAYS.map((arr, idx) => {
            const xStart = scaleX(arr.minWavelengthUm);
            const xEnd = scaleX(arr.maxWavelengthUm);
            const isEven = idx % 2 === 0;
            return (
              <g key={arr.arrayId}>
                <rect
                  x={xStart}
                  y={margin.top}
                  width={xEnd - xStart}
                  height={plotHeight}
                  fill={isEven ? 'rgba(30, 41, 59, 0.25)' : 'rgba(15, 23, 42, 0.4)'}
                />
                <text
                  x={(xStart + xEnd) / 2}
                  y={margin.top - 8}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="JetBrains Mono"
                  textAnchor="middle"
                >
                  Array {arr.arrayId} ({arr.minWavelengthUm}–{arr.maxWavelengthUm}µm)
                </text>
              </g>
            );
          })}

          {/* Molecular Ice Marker Vertical Indicator Lines */}
          {MOLECULAR_ICE_MARKERS.map((m) => {
            const mx = scaleX(m.wavelengthUm);
            return (
              <g key={m.name}>
                <line
                  x1={mx}
                  y1={margin.top}
                  x2={mx}
                  y2={margin.top + plotHeight}
                  stroke={m.color}
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity="0.45"
                />
                <text
                  x={mx}
                  y={margin.top + plotHeight + 28}
                  fill={m.color}
                  fontSize="9"
                  fontFamily="JetBrains Mono"
                  textAnchor="middle"
                >
                  {m.name.split(' ')[0]}
                </text>
              </g>
            );
          })}

          {/* X and Y Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((t) => {
            const y = margin.top + plotHeight * (1 - t);
            const fluxVal = minFlux + t * (maxFlux - minFlux);
            return (
              <g key={t}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={margin.left + plotWidth}
                  y2={y}
                  stroke="rgba(51, 65, 85, 0.3)"
                  strokeWidth="1"
                />
                <text
                  x={margin.left - 8}
                  y={y + 4}
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="JetBrains Mono"
                  textAnchor="end"
                >
                  {fluxVal.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* X Axis Wavelength Ticks */}
          {[1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0].map((wl) => {
            const x = scaleX(wl);
            return (
              <g key={wl}>
                <line
                  x1={x}
                  y1={margin.top + plotHeight}
                  x2={x}
                  y2={margin.top + plotHeight + 5}
                  stroke="#64748b"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={margin.top + plotHeight + 16}
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="JetBrains Mono"
                  textAnchor="middle"
                >
                  {wl.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Blackbody Planck Reference Curve */}
          {showBlackbodyFit && (
            <path
              d={blackbodyPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.7"
            />
          )}

          {/* Calibrated 102 Spectral Points Line */}
          <path
            d={pointsPath}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Individual Data Points */}
          {spectrumData.map((pt) => {
            const cx = scaleX(pt.wavelengthUm);
            const cy = scaleY(pt.fluxMjy);
            const isHovered = hoveredPoint?.bandIndex === pt.bandIndex;
            return (
              <circle
                key={pt.bandIndex}
                cx={cx}
                cy={cy}
                r={isHovered ? 5 : 2.5}
                fill={isHovered ? '#38bdf8' : '#0891b2'}
                stroke={isHovered ? '#ffffff' : 'none'}
                strokeWidth={isHovered ? 1.5 : 0}
                onMouseEnter={() =>
                  setHoveredPoint({
                    bandIndex: pt.bandIndex,
                    wavelengthUm: pt.wavelengthUm,
                    fluxMjy: pt.fluxMjy,
                    array: pt.array,
                    x: cx,
                    y: cy,
                  })
                }
                onMouseLeave={() => setHoveredPoint(null)}
                className="cursor-pointer transition-all"
              />
            );
          })}

          {/* Axis Titles */}
          <text
            x={margin.left + plotWidth / 2}
            y={svgHeight - 4}
            fill="#cbd5e1"
            fontSize="11"
            fontFamily="Plus Jakarta Sans"
            textAnchor="middle"
            fontWeight="500"
          >
            Observed Wavelength λ (µm) — SPHEREx 102 Near-Infrared Bands
          </text>
          <text
            x={-(margin.top + plotHeight / 2)}
            y="18"
            fill="#cbd5e1"
            fontSize="11"
            fontFamily="Plus Jakarta Sans"
            textAnchor="middle"
            transform="rotate(-90)"
            fontWeight="500"
          >
            Spectral Flux Density F_ν (mJy)
          </text>
        </svg>

        {/* Hover Tooltip Card */}
        {hoveredPoint && (
          <div
            className="absolute z-30 bg-slate-900 border border-cyan-500/80 rounded-lg p-2 text-xs font-mono shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full"
            style={{
              left: `${(hoveredPoint.x / svgWidth) * 100}%`,
              top: `${(hoveredPoint.y / svgHeight) * 100}%`,
            }}
          >
            <div className="text-cyan-300 font-bold">
              Band {hoveredPoint.bandIndex} (Array {hoveredPoint.array})
            </div>
            <div className="text-slate-300">
              λ: {hoveredPoint.wavelengthUm.toFixed(3)} µm
            </div>
            <div className="text-white">
              Flux: {hoveredPoint.fluxMjy.toFixed(2)} mJy
            </div>
          </div>
        )}
      </div>

      {/* Scientific Spectral Interpretation Notes */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 bg-slate-950/70 p-3 rounded-lg border border-slate-800">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            SPHEREx enables spectroscopic discovery by scanning 102 discrete infrared bands simultaneously.
            Notice how cold brown dwarfs like WISE 0855 stay suppressed below 3 µm and blaze above 4.5 µm!
          </span>
        </div>
      </div>
    </div>
  );
};
