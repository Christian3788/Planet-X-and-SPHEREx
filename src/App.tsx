/**
 * SPHEREx SkyShift — NASA Near-Infrared Sky Motion & Spectrum Discovery Portal
 * 2026 NASA Space Apps Challenge (Astrophysics / Planets & Moons / Software)
 *
 * Implements:
 * - Multi-epoch near-IR sky viewer across 4 SPHEREx all-sky passes
 * - Blink Comparator, Time-Lapse video player, Difference Subtraction (dipole detection) & Stacking
 * - 102 near-infrared bands (0.75 - 5.0 µm) across 6 Linear Variable Filter detector arrays
 * - On-the-fly 102-band SED spectral extraction & molecular ice identification (H2O, CO2, CO, CH4)
 * - Benchmark targets: Barnard's Star, Epsilon Indi B, WISE 0855, RW Aurigae, R Draconis
 * - Gaia DR3 proper motion vector & WISE infrared overlays
 * - Citizen science candidate discovery logger with CSV/JSON export
 * - Deep URL state sharing for coordinates, FOV, and targets
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  GeneratedField,
  StarObject,
  EpochViewMode,
  DisplayMode,
  ColormapOption,
  StretchOption,
  OverlayConfig,
  DiscoveryCandidate,
  TargetPreset,
  MeasurementPoint,
} from './types/astronomy';
import { generateSkyField, findMatchingBenchmark } from './utils/fitsSimulation';
import {
  getAstronomicalParamsFromURL,
  updateURLWithCoordinates,
  degreesToSexagesimalRA,
  degreesToSexagesimalDec,
} from './utils/coordinates';
import { BENCHMARK_TARGETS } from './data/spherexTargets';
import { TopBar } from './components/TopBar';
import { SkyCanvasViewer } from './components/SkyCanvasViewer';
import { PlaybackControls } from './components/PlaybackControls';
import { BandSelector } from './components/BandSelector';
import { CoordinatePanel } from './components/CoordinatePanel';
import { SpectralViewer } from './components/SpectralViewer';
import { DiscoveryLogger } from './components/DiscoveryLogger';
import { BenchmarkTargetsView } from './components/BenchmarkTargetsView';
import { MissionScienceModal } from './components/MissionScienceModal';
import { EmbedShareModal } from './components/EmbedShareModal';
import { DataReleaseModal } from './components/DataReleaseModal';
import { ThreeSpherexScene } from './components/ThreeSpherexScene';
import { Check, Info } from 'lucide-react';

export default function App() {
  // Read initial coordinates from URL query or default to Barnard's Star benchmark
  const initialParams = useMemo(() => getAstronomicalParamsFromURL(), []);
  const defaultTarget = BENCHMARK_TARGETS[0]; // Barnard's Star

  const [currentRa, setCurrentRa] = useState<number>(
    initialParams.ra !== undefined ? initialParams.ra : defaultTarget.ra
  );
  const [currentDec, setCurrentDec] = useState<number>(
    initialParams.dec !== undefined ? initialParams.dec : defaultTarget.dec
  );
  const [currentFov, setCurrentFov] = useState<number>(
    initialParams.fov !== undefined ? initialParams.fov : defaultTarget.fovArcmin
  );
  const [activeTarget, setActiveTarget] = useState<TargetPreset | undefined>(
    findMatchingBenchmark(currentRa, currentDec) || defaultTarget
  );

  // Active Navigation Tab: 'viewer' | 'benchmarks' | 'spectra' | '3d' | 'log' | 'mission'
  const [activeTab, setActiveTab] = useState<'viewer' | 'benchmarks' | 'spectra' | '3d' | 'log' | 'mission'>('viewer');

  // Multi-Epoch View & Playback State
  const [activeEpoch, setActiveEpoch] = useState<number>(initialParams.epoch || 1);
  const [compareEpoch, setCompareEpoch] = useState<number>(2);
  const [viewMode, setViewMode] = useState<EpochViewMode>('blink');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [blinkSpeedFps, setBlinkSpeedFps] = useState<number>(1.0); // 1.0 fps default
  const [blinkFrame, setBlinkFrame] = useState<number>(1);

  // 102 Spectral Bands & Array State
  const [selectedBandIndex, setSelectedBandIndex] = useState<number>(55); // Band 55 (~3.05 µm H2O ice)
  const [selectedArray, setSelectedArray] = useState<1 | 2 | 3 | 4 | 5 | 6>(4);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('all_bands_coadd');

  // Visualization settings
  const [colormap, setColormap] = useState<ColormapOption>('inverted_astronomy'); // Inverted by default for Clyde Tombaugh plate standard
  const [stretch, setStretch] = useState<StretchOption>('asinh');
  const [overlays, setOverlays] = useState<OverlayConfig>({
    gaiaVectors: true,
    wiseCrosshairs: false,
    simbadLabels: true,
    contaminationFlags: true,
    coordinateGrid: true,
    scaleBar: true,
    crosshairProbe: true,
    backdropSurvey: 'spherex_only',
    backdropOpacity: 0.35,
    autoDipoleBoxes: true,
  });

  // Selected Star for Spectral SED extraction
  const [selectedStar, setSelectedStar] = useState<StarObject | null>(null);

  // Modal State
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isEmbedOpen, setIsEmbedOpen] = useState<boolean>(false);
  const [isDataReleaseOpen, setIsDataReleaseOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Citizen Science Discoveries list (stored in localStorage)
  const [discoveries, setDiscoveries] = useState<DiscoveryCandidate[]>(() => {
    try {
      const saved = localStorage.getItem('spherex_discoveries');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save discoveries to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('spherex_discoveries', JSON.stringify(discoveries));
    } catch (err) {
      console.error('Failed to save discoveries to localStorage', err);
    }
  }, [discoveries]);

  // Generate the sky field whenever coordinates or FOV change
  const skyField: GeneratedField = useMemo(() => {
    const field = generateSkyField(currentRa, currentDec, currentFov);
    return field;
  }, [currentRa, currentDec, currentFov]);

  // Keep selected star synced with primary target or default target star
  useEffect(() => {
    const targetStar = skyField.stars.find((s: StarObject) => s.isTarget) || skyField.stars[0];
    setSelectedStar(targetStar || null);
  }, [skyField]);

  // Update URL whenever coordinates change
  useEffect(() => {
    updateURLWithCoordinates(currentRa, currentDec, currentFov, activeTarget?.id, activeEpoch);
  }, [currentRa, currentDec, currentFov, activeTarget, activeEpoch]);

  // Playback Animation Timer (Blink Comparator and Time-Lapse Video)
  useEffect(() => {
    if (!isPlaying) return;
    if (viewMode !== 'blink' && viewMode !== 'timelapse') return;

    const intervalMs = 1000 / blinkSpeedFps;
    const interval = setInterval(() => {
      setBlinkFrame((prev) => {
        if (viewMode === 'blink') {
          return prev === 1 ? 2 : 1;
        } else if (viewMode === 'timelapse') {
          return (prev % 4) + 1;
        }
        return prev;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isPlaying, viewMode, blinkSpeedFps]);

  // Handle Coordinate Form Submission
  const handleCoordinatesSubmit = useCallback(
    (ra: number, dec: number, fov: number, preset?: TargetPreset) => {
      setCurrentRa(ra);
      setCurrentDec(dec);
      setCurrentFov(fov);
      setActiveTarget(preset || findMatchingBenchmark(ra, dec));
    },
    []
  );

  // Handle selecting a benchmark from the targets view or modal
  const handleSelectBenchmarkById = useCallback(
    (targetId: string) => {
      const target = BENCHMARK_TARGETS.find((t) => t.id === targetId);
      if (target) {
        handleCoordinatesSubmit(target.ra, target.dec, target.fovArcmin, target);
        setActiveTab('viewer');
      }
    },
    [handleCoordinatesSubmit]
  );

  // Handle sharing URL
  const handleShareURL = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setToastMessage('Direct deep link copied to clipboard!');
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Handle Discovery Logging
  const handleAddDiscovery = useCallback((cand: DiscoveryCandidate) => {
    setDiscoveries((prev) => [cand, ...prev]);
    setToastMessage(`Discovery ${cand.id} recorded successfully!`);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const handleDeleteDiscovery = useCallback((id: string) => {
    setDiscoveries((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const handleSelectDiscovery = useCallback(
    (cand: DiscoveryCandidate) => {
      handleCoordinatesSubmit(cand.ra, cand.dec, 7.0);
      setActiveTab('viewer');
      setViewMode('difference');
    },
    [handleCoordinatesSubmit]
  );

  // Handle Astrometric Measurement Completion
  const handleMeasurementComplete = useCallback(
    (p1: MeasurementPoint, p2: MeasurementPoint, arcsec: number, paDeg: number) => {
      const deltaYears = Math.abs(p2.epoch - p1.epoch) * 0.5 || 0.5;
      const pm = (arcsec / deltaYears) * 1000;
      setToastMessage(
        `Displacement Measured: ${arcsec.toFixed(2)}″ at PA ${paDeg.toFixed(1)}° (Est. Motion: ${(pm / 1000).toFixed(2)}″/yr)`
      );
      setTimeout(() => setToastMessage(null), 4500);
    },
    []
  );

  // Handle Ingest Custom Batch Coordinates
  const handleIngestCoordinates = useCallback(
    (coords: { name: string; ra: number; dec: number; fov: number }[]) => {
      if (coords.length > 0) {
        const first = coords[0];
        handleCoordinatesSubmit(first.ra, first.dec, first.fov);
        setActiveTab('viewer');
        setToastMessage(`Slewed to ${first.name} (${coords.length} candidates loaded in catalog)`);
        setTimeout(() => setToastMessage(null), 4000);
      }
    },
    [handleCoordinatesSubmit]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 3-Zone Top Bar */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenGuide={() => setIsGuideOpen(true)}
        onShareURL={handleShareURL}
        onOpenEmbed={() => setIsEmbedOpen(true)}
        onOpenDataReleases={() => setIsDataReleaseOpen(true)}
        discoveryCount={discoveries.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 sm:p-6 flex flex-col gap-5">
        {/* Toast Alert Feedback */}
        {toastMessage && (
          <div className="fixed top-16 right-6 z-50 bg-cyan-950 border border-cyan-500 text-cyan-200 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-medium flex items-center gap-2 backdrop-blur-md animate-fade-in">
            <Check className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Tab 1: Primary Sky Viewer Workspace */}
        {activeTab === 'viewer' && (
          <div className="flex flex-col lg:flex-row gap-5 items-stretch">
            {/* Left Column: Controls, Coordinate Form & Band Selectors (Fixed width ~400px on desktop) */}
            <div className="w-full lg:w-[410px] shrink-0 flex flex-col gap-4">
              <CoordinatePanel
                currentRa={currentRa}
                currentDec={currentDec}
                currentFov={currentFov}
                onCoordinatesSubmit={handleCoordinatesSubmit}
                activeTarget={activeTarget}
              />

              <BandSelector
                displayMode={displayMode}
                setDisplayMode={setDisplayMode}
                selectedBandIndex={selectedBandIndex}
                setSelectedBandIndex={setSelectedBandIndex}
                selectedArray={selectedArray}
                setSelectedArray={setSelectedArray}
                colormap={colormap}
                setColormap={setColormap}
                stretch={stretch}
                setStretch={setStretch}
                overlays={overlays}
                setOverlays={setOverlays}
              />

              {/* Quick Science Summary Widget */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col gap-2 text-xs">
                <div className="font-semibold text-slate-200 flex items-center justify-between">
                  <span>How to Spot Moving Objects</span>
                  <span className="text-[10px] text-cyan-400 font-mono">Blink & Diff</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  <strong>Blink mode:</strong> Objects with high proper motion or parallax jump back and forth between survey passes.
                </p>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  <strong>Difference mode:</strong> Stationary stars subtract to neutral gray. Moving objects create paired cyan/orange dipoles.
                </p>
              </div>
            </div>

            {/* Right Column: Central Sky Canvas & Playback Controls & Real-time Spectra */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              {/* Playback & Multi-Epoch Mode Controls */}
              <PlaybackControls
                viewMode={viewMode}
                setViewMode={setViewMode}
                activeEpoch={activeEpoch}
                setActiveEpoch={setActiveEpoch}
                compareEpoch={compareEpoch}
                setCompareEpoch={setCompareEpoch}
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
                blinkSpeedFps={blinkSpeedFps}
                setBlinkSpeedFps={setBlinkSpeedFps}
                currentBlinkFrame={blinkFrame}
              />

              {/* High-Resolution Astronomical Canvas Viewer */}
              <div className="h-[560px] w-full">
                <SkyCanvasViewer
                  skyField={skyField}
                  activeEpoch={activeEpoch}
                  compareEpoch={compareEpoch}
                  viewMode={viewMode}
                  selectedBandIndex={selectedBandIndex}
                  displayMode={displayMode}
                  colormap={colormap}
                  stretch={stretch}
                  overlays={overlays}
                  onSelectStar={(star) => setSelectedStar(star)}
                  selectedStarId={selectedStar?.id}
                  onMeasurementComplete={handleMeasurementComplete}
                  isBlinking={isPlaying}
                  blinkFrame={blinkFrame}
                />
              </div>

              {/* On-The-Fly 102-Band Spectral SED Extraction */}
              {selectedStar && (
                <SpectralViewer
                  selectedStar={selectedStar}
                  epoch={viewMode === 'blink' ? (blinkFrame === 1 ? activeEpoch : compareEpoch) : activeEpoch}
                />
              )}
            </div>
          </div>
        )}

        {/* Tab 2: NASA Benchmark Test Targets Catalog */}
        {activeTab === 'benchmarks' && (
          <BenchmarkTargetsView
            onSelectTarget={(target) => {
              handleCoordinatesSubmit(target.ra, target.dec, target.fovArcmin, target);
              setActiveTab('viewer');
            }}
            currentTargetId={activeTarget?.id}
          />
        )}

        {/* Tab 3: Dedicated 102-Band Near-Infrared Spectra Studio */}
        {activeTab === 'spectra' && (
          <div className="flex flex-col gap-5">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col gap-2">
              <h2 className="text-lg font-bold text-white">SPHEREx 102-Band Spectroscopic Analyzer</h2>
              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                NASA's SPHEREx mission is the first all-sky near-infrared spectral survey. Each pixel collects
                a 102-point spectrum from 0.75 µm to 5.00 µm, identifying chemical ice reservoirs (H2O, CO2, CO),
                methane (CH4), and brown dwarf temperature profiles.
              </p>
            </div>

            {selectedStar ? (
              <SpectralViewer selectedStar={selectedStar} epoch={activeEpoch} />
            ) : (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-xs">
                Click any star on the Sky Viewer canvas to extract its calibrated 102-band spectrum.
              </div>
            )}
          </div>
        )}

        {/* Tab: 3D SPHEREx Observatory & Celestial Mission Simulator */}
        {activeTab === '3d' && (
          <div className="flex flex-col gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Interactive 3D SPHEREx Space Observatory & Orbital Explorer</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inspect the 3-tier stepped conical photon shields, telescope optics, and sun-synchronous Earth polar orbit. Click any celestial target pin to aim the observatory!
                </p>
              </div>

              <button
                onClick={() => setActiveTab('viewer')}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg text-xs transition-colors shrink-0"
              >
                Return to Sky Viewer
              </button>
            </div>

            <ThreeSpherexScene
              onSelectBenchmark={(target) => {
                handleCoordinatesSubmit(target.ra, target.dec, target.fovArcmin, target);
                setToastMessage(`Telescope aimed at ${target.name}. Switched coordinates!`);
                setTimeout(() => setToastMessage(null), 3500);
              }}
              activeBenchmarkId={activeTarget?.id}
            />
          </div>
        )}

        {/* Tab 4: Citizen Science Discovery Logger */}
        {activeTab === 'log' && (
          <DiscoveryLogger
            discoveries={discoveries}
            onAddDiscovery={handleAddDiscovery}
            onDeleteDiscovery={handleDeleteDiscovery}
            onSelectDiscovery={handleSelectDiscovery}
            currentRa={currentRa}
            currentDec={currentDec}
            currentActiveEpoch={activeEpoch}
            currentCompareEpoch={compareEpoch}
          />
        )}

        {/* Tab 5: Mission Science & Educational Guide */}
        {activeTab === 'mission' && (
          <div className="flex flex-col gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col gap-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-full md:w-1/2 rounded-xl overflow-hidden border border-slate-800">
                  <img
                    src="/src/assets/images/spherex_space_telescope_1794473731149.jpg"
                    alt="NASA SPHEREx Observatory"
                    className="w-full h-64 object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="w-full md:w-1/2 flex flex-col gap-3">
                  <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                    NASA Mission Overview
                  </span>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    SPHEREx: Mapping the Infrared Cosmos
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Launched into sun-synchronous low Earth orbit in early 2025, SPHEREx scans 99% of the sky every six months. Its 20 cm telescope utilizes three thermal photon shields and radiative cooling to maintain its detector arrays at 55 Kelvin.
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    By combining 102 near-infrared bands with 4 complete all-sky passes, SPHEREx enables both 3D spectroscopic galaxy mapping and high-precision time-domain astronomy for nearby moving bodies.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Educational Guide Modal */}
      <MissionScienceModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onSelectBenchmark={handleSelectBenchmarkById}
      />

      {/* Embed & Share Deep Link Modal */}
      <EmbedShareModal
        isOpen={isEmbedOpen}
        onClose={() => setIsEmbedOpen(false)}
        currentRa={currentRa}
        currentDec={currentDec}
        currentFov={currentFov}
        targetId={activeTarget?.id}
        activeEpoch={activeEpoch}
      />

      {/* Survey Data Releases & Batch Ingestion Modal */}
      <DataReleaseModal
        isOpen={isDataReleaseOpen}
        onClose={() => setIsDataReleaseOpen(false)}
        onIngestCoordinates={handleIngestCoordinates}
      />
    </div>
  );
}
