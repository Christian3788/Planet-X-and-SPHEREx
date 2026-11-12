/**
 * SPHEREx SkyShift - 102 Spectral Bands & Instrument Array Selector
 * Controls SPHEREx's 6 Linear Variable Filter (LVF) detector arrays,
 * molecular ice absorption filters, RGB composites, and colormaps.
 */

import React from 'react';
import {
  DisplayMode,
  ColormapOption,
  StretchOption,
  OverlayConfig,
} from '../types/astronomy';
import {
  DETECTOR_ARRAYS,
  MOLECULAR_ICE_MARKERS,
  SPHEREX_BANDS,
} from '../data/spectralBands';
import { Sliders, Palette, Layers, Sparkles } from 'lucide-react';

interface BandSelectorProps {
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
  selectedBandIndex: number;
  setSelectedBandIndex: (idx: number) => void;
  selectedArray: number; // 1 to 6
  setSelectedArray: (arr: 1 | 2 | 3 | 4 | 5 | 6) => void;
  colormap: ColormapOption;
  setColormap: (cmap: ColormapOption) => void;
  stretch: StretchOption;
  setStretch: (s: StretchOption) => void;
  overlays: OverlayConfig;
  setOverlays: React.Dispatch<React.SetStateAction<OverlayConfig>>;
}

export const BandSelector: React.FC<BandSelectorProps> = ({
  displayMode,
  setDisplayMode,
  selectedBandIndex,
  setSelectedBandIndex,
  selectedArray,
  setSelectedArray,
  colormap,
  setColormap,
  stretch,
  setStretch,
  overlays,
  setOverlays,
}) => {
  const currentBand = SPHEREX_BANDS.find((b) => b.bandIndex === selectedBandIndex) || SPHEREX_BANDS[0];

  const handleSelectArray = (arrayId: 1 | 2 | 3 | 4 | 5 | 6) => {
    setSelectedArray(arrayId);
    setDisplayMode('array_coadd');
    const arrSpec = DETECTOR_ARRAYS.find((a) => a.arrayId === arrayId);
    if (arrSpec) {
      setSelectedBandIndex(arrSpec.bandsRange[0]);
    }
  };

  const handleSelectMolecularFilter = (targetWavelength: number) => {
    // Find closest band
    let closestBand = SPHEREX_BANDS[0];
    let minDiff = 999;
    SPHEREX_BANDS.forEach((b) => {
      const diff = Math.abs(b.centerWavelengthUm - targetWavelength);
      if (diff < minDiff) {
        minDiff = diff;
        closestBand = b;
      }
    });
    setSelectedBandIndex(closestBand.bandIndex);
    setSelectedArray(closestBand.detectorArray);
    setDisplayMode('single_band');
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-slate-200">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span>102 Spectral Bands & Detector Arrays</span>
        </div>
        <div className="text-[11px] font-mono text-cyan-400">
          λ: {currentBand.centerWavelengthUm.toFixed(2)} µm (Array {currentBand.detectorArray})
        </div>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800 font-medium">
        <button
          onClick={() => setDisplayMode('all_bands_coadd')}
          className={`px-2.5 py-1.5 rounded transition-colors text-center ${
            displayMode === 'all_bands_coadd'
              ? 'bg-slate-800 text-cyan-300 shadow-sm font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          All 102 Bands Co-add
        </button>
        <button
          onClick={() => setDisplayMode('array_coadd')}
          className={`px-2.5 py-1.5 rounded transition-colors text-center ${
            displayMode === 'array_coadd'
              ? 'bg-slate-800 text-cyan-300 shadow-sm font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Array Co-add
        </button>
        <button
          onClick={() => setDisplayMode('rgb_composite')}
          className={`px-2.5 py-1.5 rounded transition-colors text-center ${
            displayMode === 'rgb_composite'
              ? 'bg-slate-800 text-cyan-300 shadow-sm font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          NIR RGB Composite
        </button>
        <button
          onClick={() => setDisplayMode('single_band')}
          className={`px-2.5 py-1.5 rounded transition-colors text-center ${
            displayMode === 'single_band'
              ? 'bg-slate-800 text-cyan-300 shadow-sm font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Single Band Mode
        </button>
      </div>

      {/* Detector Arrays 1 to 6 Button Bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>SPHEREx Detector Arrays (0.75 – 5.0 µm)</span>
          <span className="font-mono text-slate-500">6 Arrays · 2048×2048 Teledyne H2RG</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 font-mono">
          {DETECTOR_ARRAYS.map((arr) => {
            const isSelected = selectedArray === arr.arrayId && displayMode === 'array_coadd';
            return (
              <button
                key={arr.arrayId}
                onClick={() => handleSelectArray(arr.arrayId)}
                className={`px-2 py-1.5 rounded border text-left transition-colors flex flex-col ${
                  isSelected
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200'
                    : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                <span className="font-bold text-[11px]">Array {arr.arrayId}</span>
                <span className="text-[10px] text-slate-400">
                  {arr.minWavelengthUm}–{arr.maxWavelengthUm}µm
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Molecular Ice Quick Filters */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Molecular Ice & Gas Absorption Filters</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MOLECULAR_ICE_MARKERS.map((marker) => (
            <button
              key={marker.name}
              onClick={() => handleSelectMolecularFilter(marker.wavelengthUm)}
              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-md text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 font-mono text-[11px]"
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: marker.color }}
              />
              <span>{marker.name}</span>
              <span className="text-slate-500">({marker.wavelengthUm}µm)</span>
            </button>
          ))}
        </div>
      </div>

      {/* 102 Band Fine Slider Scrubber */}
      <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 font-mono">
            Band Channel: <span className="text-white font-bold">{selectedBandIndex}</span> of 102
          </span>
          <span className="text-cyan-300 font-mono">
            {currentBand.centerWavelengthUm} µm (Bandwidth: ±{currentBand.bandwidthUm} µm)
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="102"
          value={selectedBandIndex}
          onChange={(e) => {
            const idx = Number(e.target.value);
            setSelectedBandIndex(idx);
            const b = SPHEREX_BANDS.find((band) => band.bandIndex === idx);
            if (b) setSelectedArray(b.detectorArray);
            if (displayMode !== 'single_band') setDisplayMode('single_band');
          }}
          className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
      </div>

      {/* Bottom Row: Colormap, Stretch & Overlays Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
        {/* Colormaps */}
        <div className="flex flex-col gap-1">
          <label className="text-slate-400 text-[11px] flex items-center gap-1">
            <Palette className="w-3 h-3 text-cyan-400" />
            <span>Colormap</span>
          </label>
          <select
            value={colormap}
            onChange={(e) => setColormap(e.target.value as ColormapOption)}
            className="bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="inverted_astronomy">Inverted Astronomy (Black on White)</option>
            <option value="deep_space">Deep Space (White on Black)</option>
            <option value="magma">Magma (Warm Infrared)</option>
            <option value="viridis">Viridis (Perceptual Linear)</option>
            <option value="infrared_heat">SPHEREx NIR False Color</option>
            <option value="difference_bipolar">Difference Bipolar (Cyan/Orange)</option>
          </select>
        </div>

        {/* Stretch */}
        <div className="flex flex-col gap-1">
          <label className="text-slate-400 text-[11px]">Dynamic Range Stretch</label>
          <select
            value={stretch}
            onChange={(e) => setStretch(e.target.value as StretchOption)}
            className="bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="asinh">Asinh (Lupton Astronomical Standard)</option>
            <option value="sqrt">Square Root</option>
            <option value="log">Logarithmic</option>
            <option value="linear">Linear</option>
          </select>
        </div>

        {/* Overlays */}
        <div className="flex flex-col gap-1">
          <label className="text-slate-400 text-[11px] flex items-center gap-1">
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>Multi-Mission Overlays</span>
          </label>
          <div className="flex flex-wrap gap-2 pt-0.5">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={overlays.gaiaVectors}
                onChange={(e) => setOverlays((prev) => ({ ...prev, gaiaVectors: e.target.checked }))}
                className="rounded accent-cyan-400"
              />
              <span>Gaia PM</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={overlays.wiseCrosshairs}
                onChange={(e) => setOverlays((prev) => ({ ...prev, wiseCrosshairs: e.target.checked }))}
                className="rounded accent-cyan-400"
              />
              <span>WISE W1/W2</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={overlays.autoDipoleBoxes}
                onChange={(e) => setOverlays((prev) => ({ ...prev, autoDipoleBoxes: e.target.checked }))}
                className="rounded accent-cyan-400"
              />
              <span className="text-cyan-300 font-semibold">Auto Dipoles</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={overlays.contaminationFlags}
                onChange={(e) => setOverlays((prev) => ({ ...prev, contaminationFlags: e.target.checked }))}
                className="rounded accent-cyan-400"
              />
              <span>Flags</span>
            </label>
          </div>
        </div>
      </div>

      {/* Survey Mission Backdrop Layer Selector (CDS Aladin / HiPS Cross-Matching) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono">Cross-Mission Backdrop:</span>
          <select
            value={overlays.backdropSurvey}
            onChange={(e) =>
              setOverlays((prev) => ({
                ...prev,
                backdropSurvey: e.target.value as any,
              }))
            }
            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-mono text-xs focus:outline-none"
          >
            <option value="spherex_only">SPHEREx NIR Only (Direct)</option>
            <option value="2mass_nir">2MASS All-Sky NIR (J/H/Ks)</option>
            <option value="wise_allwise">WISE / NEOWISE Mid-IR (W1/W2)</option>
            <option value="dss_optical">DSS Optical Sky Survey</option>
            <option value="gaia_density">Gaia DR3 Stellar Density</option>
          </select>
        </div>

        {overlays.backdropSurvey !== 'spherex_only' && (
          <div className="flex items-center gap-2 font-mono">
            <span className="text-slate-400">Backdrop Opacity:</span>
            <input
              type="range"
              min="0.1"
              max="0.8"
              step="0.05"
              value={overlays.backdropOpacity}
              onChange={(e) =>
                setOverlays((prev) => ({ ...prev, backdropOpacity: parseFloat(e.target.value) }))
              }
              className="w-20 h-1 bg-slate-950 accent-cyan-400 cursor-pointer"
            />
            <span className="text-slate-300">{Math.round(overlays.backdropOpacity * 100)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};
