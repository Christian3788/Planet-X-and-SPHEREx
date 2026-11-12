/**
 * SPHEREx SkyShift - NASA Mission & Discovery Science Guide Modal
 * Explains the SPHEREx mission architecture, 102 infrared bands,
 * Blink comparator history (Clyde Tombaugh / Pluto to Backyard Worlds),
 * and the 5 benchmark test targets.
 */

import React from 'react';
import { X, Sparkles, Orbit, Telescope, Radio, ExternalLink } from 'lucide-react';

interface MissionScienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBenchmark: (targetId: string) => void;
}

export const MissionScienceModal: React.FC<MissionScienceModalProps> = ({
  isOpen,
  onClose,
  onSelectBenchmark,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col gap-6 text-slate-200 my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white bg-slate-950/60 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Section */}
        <div className="flex flex-col md:flex-row items-center gap-6 pb-6 border-b border-slate-800">
          <div className="w-full md:w-1/2 rounded-xl overflow-hidden border border-slate-800 shadow-md">
            <img
              src="/src/assets/images/spherex_space_telescope_1794473731149.jpg"
              alt="NASA SPHEREx Space Observatory in Sun-Synchronous Orbit"
              className="w-full h-56 object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="w-full md:w-1/2 flex flex-col gap-2.5">
            <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase">
              NASA Astrophysics · Space Apps Challenge 2026
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              SPHEREx SkyShift Discovery Portal
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              NASA’s <strong>SPHEREx</strong> mission (Spectro-Photometer for the History of the Universe, Epoch of Reionization, and Ices Explorer) maps the entire sky every 6 months in 102 near-infrared spectral bands, gathering imagery and spectra for over a billion celestial objects.
            </p>
          </div>
        </div>

        {/* 3 Core Science Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl flex flex-col gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 text-cyan-400 flex items-center justify-center">
              <Telescope className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-white text-sm">Blink Astronomy & Proper Motion</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              In 1930, Clyde Tombaugh discovered Pluto by rapidly switching between two photographic plates taken on different nights. Modern citizen scientists have discovered over 90% of known cold brown dwarfs using this exact technique.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl flex flex-col gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-950 text-amber-400 flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-white text-sm">102 Infrared Bands (0.75 – 5.0 µm)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              SPHEREx uses 6 Linear Variable Filter detector arrays. Near-infrared light penetrates interstellar dust, revealing cold brown dwarfs radiating thermal heat and planetary objects in the outer solar system.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl flex flex-col gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-950 text-rose-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-white text-sm">Cosmic Ices & Life Molecules</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Specific SPHEREx bands target absorption signatures of water ice (3.05 µm), carbon dioxide ice (4.27 µm), carbon monoxide ice (4.67 µm), and methane (1.66 / 2.2 µm) in protoplanetary disks.
            </p>
          </div>
        </div>

        {/* Guided Test Benchmarks */}
        <div className="flex flex-col gap-3 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">The 5 NASA Challenge Benchmark Targets</h3>
            <span className="text-xs text-slate-400">Click to load and inspect</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
            <button
              onClick={() => {
                onSelectBenchmark('barnards-star');
                onClose();
              }}
              className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left transition-colors flex flex-col gap-1"
            >
              <div className="text-xs font-bold text-cyan-300">Barnard's Star</div>
              <div className="text-[11px] text-slate-400">Fastest proper motion star (10.36″/yr). Marches across the sky.</div>
            </button>

            <button
              onClick={() => {
                onSelectBenchmark('epsilon-indi-b');
                onClose();
              }}
              className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left transition-colors flex flex-col gap-1"
            >
              <div className="text-xs font-bold text-cyan-300">Epsilon Indi B</div>
              <div className="text-[11px] text-slate-400">Pair of cold T-dwarfs showing strong methane absorption at 1.66µm.</div>
            </button>

            <button
              onClick={() => {
                onSelectBenchmark('wise-0855');
                onClose();
              }}
              className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left transition-colors flex flex-col gap-1"
            >
              <div className="text-xs font-bold text-cyan-300">WISE 0855-0714</div>
              <div className="text-[11px] text-slate-400">Sub-freezing (250 K) sub-brown dwarf with water ice clouds. Peaks in Arrays 5-6!</div>
            </button>

            <button
              onClick={() => {
                onSelectBenchmark('rw-aurigae');
                onClose();
              }}
              className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left transition-colors flex flex-col gap-1"
            >
              <div className="text-xs font-bold text-cyan-300">RW Aurigae</div>
              <div className="text-[11px] text-slate-400">T Tauri young star with circumstellar disk tidal arm occultation.</div>
            </button>

            <button
              onClick={() => {
                onSelectBenchmark('r-draconis');
                onClose();
              }}
              className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left transition-colors flex flex-col gap-1"
            >
              <div className="text-xs font-bold text-cyan-300">R Draconis</div>
              <div className="text-[11px] text-slate-400">Pulsating Mira red giant undergoing massive 3.5 magnitude periodic swings.</div>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>NASA Space Apps Challenge 2026</span>
            <span>·</span>
            <span>Astrophysics / Planets & Moons / Software</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg transition-colors"
          >
            Enter SkyShift Portal
          </button>
        </div>
      </div>
    </div>
  );
};
