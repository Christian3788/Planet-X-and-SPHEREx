/**
 * SPHEREx SkyShift - Top Navigation Bar
 * Complies with the Frontend Design Constitution Top Bar Contract:
 * Exactly 3 zones separated by gap-8: Single Brand wordmark, 4-5 single-line nav links, 1 primary action.
 */

import React from 'react';
import { Telescope, BookOpen, Share2 } from 'lucide-react';

interface TopBarProps {
  activeTab: 'viewer' | 'benchmarks' | 'spectra' | '3d' | 'log' | 'mission';
  setActiveTab: (tab: 'viewer' | 'benchmarks' | 'spectra' | '3d' | 'log' | 'mission') => void;
  onOpenGuide: () => void;
  onShareURL: () => void;
  onOpenEmbed: () => void;
  onOpenDataReleases: () => void;
  discoveryCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  onOpenGuide,
  onShareURL,
  onOpenEmbed,
  onOpenDataReleases,
  discoveryCount,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold shadow-sm">
          <Telescope className="w-4 h-4 text-slate-950" />
        </div>
        <button
          onClick={() => setActiveTab('viewer')}
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-cyan-400 transition-colors text-left"
        >
          SPHEREx SkyShift
        </button>
      </div>

      {/* Zone 2: 4–5 clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => setActiveTab('viewer')}
          className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
            activeTab === 'viewer' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Sky Viewer
        </button>
        <button
          onClick={() => setActiveTab('benchmarks')}
          className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
            activeTab === 'benchmarks' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Benchmarks
        </button>
        <button
          onClick={() => setActiveTab('spectra')}
          className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
            activeTab === 'spectra' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          102 Spectra
        </button>
        <button
          onClick={() => setActiveTab('3d')}
          className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
            activeTab === '3d' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          3D Observatory
        </button>
        <button
          onClick={() => setActiveTab('log')}
          className={`whitespace-nowrap shrink-0 transition-colors hover:text-white flex items-center gap-1.5 ${
            activeTab === 'log' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          <span>Discovery Log</span>
          {discoveryCount > 0 && (
            <span className="font-mono text-xs px-1.5 py-0.2 bg-cyan-950 text-cyan-300 border border-cyan-800/60 rounded">
              {discoveryCount}
            </span>
          )}
        </button>
      </nav>

      {/* Zone 3: 1 primary action + concise utility triggers */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenDataReleases}
          title="SPHEREx Survey Data Releases & Batch Coordinate Ingestion"
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 rounded-lg transition-colors text-xs font-mono hidden sm:flex items-center gap-1"
        >
          <span className="text-cyan-400">DR1–DR4</span>
        </button>
        <button
          onClick={onOpenEmbed}
          title="Embed Interactive Sky Viewer in Websites or Papers"
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 rounded-lg transition-colors"
        >
          <Share2 className="w-4 h-4" />
        </button>
        <button
          onClick={onOpenGuide}
          className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-lg hover:bg-cyan-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-sm"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Discovery Guide</span>
        </button>
      </div>
    </header>
  );
};
