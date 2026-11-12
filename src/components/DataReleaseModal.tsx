/**
 * SPHEREx SkyShift - Survey Data Release & Batch Coordinate Ingestion Manager
 * Supports updating and switching across SPHEREx Data Releases (DR1 to DR4),
 * and batch-ingesting custom coordinate lists for rapid citizen science triage.
 */

import React, { useState } from 'react';
import { X, Database, Upload, Check, HardDrive, Calendar, ArrowRight } from 'lucide-react';
import { parseRightAscension, parseDeclination } from '../utils/coordinates';

interface DataReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngestCoordinates: (coords: { name: string; ra: number; dec: number; fov: number }[]) => void;
}

export const DataReleaseModal: React.FC<DataReleaseModalProps> = ({
  isOpen,
  onClose,
  onIngestCoordinates,
}) => {
  const [customInput, setCustomInput] = useState<string>('');
  const [ingestSuccessCount, setIngestSuccessCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleBatchParse = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = customInput.split('\n').filter((l) => l.trim().length > 0);
    const parsedList: { name: string; ra: number; dec: number; fov: number }[] = [];

    lines.forEach((line, idx) => {
      // Split by comma, tab, or semicolon
      const tokens = line.split(/[,;\t]+/).map((t) => t.trim());
      if (tokens.length >= 2) {
        let name = `Candidate ${idx + 1}`;
        let raStr = tokens[0];
        let decStr = tokens[1];
        if (tokens.length >= 3 && isNaN(Number(tokens[0]))) {
          name = tokens[0];
          raStr = tokens[1];
          decStr = tokens[2];
        }

        const ra = parseRightAscension(raStr);
        const dec = parseDeclination(decStr);
        if (ra !== null && dec !== null) {
          parsedList.push({ name, ra, dec, fov: 7.0 });
        }
      }
    });

    if (parsedList.length > 0) {
      onIngestCoordinates(parsedList);
      setIngestSuccessCount(parsedList.length);
      setTimeout(() => {
        setIngestSuccessCount(null);
        onClose();
      }, 1500);
    }
  };

  const releases = [
    {
      dr: 'DR1 (Pass 1 Baseline)',
      period: 'May 2025 – Oct 2025',
      status: 'Calibrated & Ingested',
      objects: '1.05 Billion Sources',
      description: 'First all-sky near-infrared 102-band baseline. Initial solar system asteroidal flux calibration.',
    },
    {
      dr: 'DR2 (Pass 2 Cadence)',
      period: 'Nov 2025 – Apr 2026',
      status: 'Active Pipeline Stream',
      objects: '1.09 Billion Sources',
      description: 'First complete 6-month time difference baseline. Automated dipole motion catalog release.',
    },
    {
      dr: 'DR3 (Pass 3 Extended)',
      period: 'May 2026 – Oct 2026',
      status: 'Ingesting / Scheduled',
      objects: '1.14 Billion Sources',
      description: 'Parallax separation and annual orbital ellipse validation for nearby sub-brown dwarfs.',
    },
    {
      dr: 'DR4 (Full Survey Co-add)',
      period: 'Nov 2026 – Apr 2027',
      status: 'Pipeline Ready',
      objects: '1.20 Billion Sources',
      description: 'Ultimate 2-year all-sky co-add with 24-month astrometric baseline.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 text-slate-200 my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white bg-slate-950/60 rounded-lg border border-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-950 text-cyan-400 rounded-xl border border-cyan-800">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">SPHEREx Survey Data Release & Ingestion Engine</h2>
            <p className="text-xs text-slate-400">
              Manage multi-epoch data releases and batch-import target coordinates for automated motion detection.
            </p>
          </div>
        </div>

        {/* SPHEREx Survey Releases Overview */}
        <div className="flex flex-col gap-2.5">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
            Survey Passes & Release Pipeline
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {releases.map((rel) => (
              <div
                key={rel.dr}
                className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">{rel.dr}</span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                    {rel.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span>{rel.period}</span>
                  <span>·</span>
                  <span>{rel.objects}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed pt-1 border-t border-slate-900">
                  {rel.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Batch Target Coordinate Ingestion */}
        <form onSubmit={handleBatchParse} className="flex flex-col gap-2.5 pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Batch Ingest Custom Targets / Candidate Coordinates</span>
            </label>
            <span className="text-[11px] text-slate-500 font-mono">Accepts RA, Dec or Name, RA, Dec</span>
          </div>

          <textarea
            rows={4}
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder={`Example format (one per line):
Candidate Alpha, 17h 57m 48.5s, +04° 41' 36"
Candidate Beta, 133.795, -7.245
BrownDwarf_Gamma, 22:04:10.5, -56:46:58`}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
          />

          <div className="flex items-center justify-between pt-1">
            <div className="text-xs text-slate-400">
              {ingestSuccessCount !== null && (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Successfully ingested {ingestSuccessCount} targets into your workspace!
                </span>
              )}
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg text-xs transition-colors shadow-sm flex items-center gap-1.5"
            >
              <span>Ingest Target List</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
