/**
 * SPHEREx SkyShift - Citizen Science Candidate Discovery Logger
 * Enables citizen astronomers to measure, log, catalog, and export
 * moving object discoveries (Brown Dwarfs, Asteroids, Proper Motion Stars, Supernovae)
 * formatted for NASA Citizen Science and Backyard Worlds collaboration.
 */

import React, { useState } from 'react';
import { DiscoveryCandidate } from '../types/astronomy';
import { degreesToSexagesimalRA, degreesToSexagesimalDec } from '../utils/coordinates';
import { BookmarkPlus, Download, Trash2, Eye, Award, ExternalLink } from 'lucide-react';

interface DiscoveryLoggerProps {
  discoveries: DiscoveryCandidate[];
  onAddDiscovery: (candidate: DiscoveryCandidate) => void;
  onDeleteDiscovery: (id: string) => void;
  onSelectDiscovery: (candidate: DiscoveryCandidate) => void;
  currentRa: number;
  currentDec: number;
  currentActiveEpoch: number;
  currentCompareEpoch: number;
}

export const DiscoveryLogger: React.FC<DiscoveryLoggerProps> = ({
  discoveries,
  onAddDiscovery,
  onDeleteDiscovery,
  onSelectDiscovery,
  currentRa,
  currentDec,
  currentActiveEpoch,
  currentCompareEpoch,
}) => {
  const [classification, setClassification] = useState<DiscoveryCandidate['classification']>(
    'Brown Dwarf Candidate'
  );
  const [angularShift, setAngularShift] = useState<string>('3.5');
  const [confidence, setConfidence] = useState<DiscoveryCandidate['userRating']>('High Confidence');
  const [notes, setNotes] = useState<string>('');

  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const shiftNum = parseFloat(angularShift) || 1.0;
    const deltaYears = Math.abs(currentCompareEpoch - currentActiveEpoch) * 0.5 || 0.5;
    const estimatedMotion = (shiftNum / deltaYears) * 1000; // mas/yr

    const newCandidate: DiscoveryCandidate = {
      id: `SPX-CAND-${Date.now().toString(36).toUpperCase()}`,
      timestamp: Date.now(),
      ra: currentRa,
      dec: currentDec,
      raStr: degreesToSexagesimalRA(currentRa),
      decStr: degreesToSexagesimalDec(currentDec),
      classification,
      angularShiftArcsec: shiftNum,
      estimatedMotionPerYear: estimatedMotion,
      epochsObserved: `Pass ${currentActiveEpoch} vs Pass ${currentCompareEpoch}`,
      notes: notes || 'Distinct dipole shift observed in SPHEREx NIR difference subtraction.',
      userRating: confidence,
    };

    onAddDiscovery(newCandidate);
    setNotes('');
  };

  const handleExportCSV = () => {
    if (discoveries.length === 0) return;
    const headers = [
      'Candidate_ID',
      'UTC_Logged',
      'RA_J2000_Deg',
      'Dec_J2000_Deg',
      'RA_Sexagesimal',
      'Dec_Sexagesimal',
      'Classification',
      'Shift_Arcsec',
      'Estimated_Proper_Motion_mas_yr',
      'Survey_Passes',
      'Confidence',
      'Notes',
    ];

    const rows = discoveries.map((d) => [
      d.id,
      new Date(d.timestamp).toISOString(),
      d.ra.toFixed(5),
      d.dec.toFixed(5),
      `"${d.raStr}"`,
      `"${d.decStr}"`,
      `"${d.classification}"`,
      d.angularShiftArcsec.toFixed(2),
      d.estimatedMotionPerYear.toFixed(1),
      `"${d.epochsObserved}"`,
      `"${d.userRating}"`,
      `"${d.notes.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SPHEREx_Citizen_Discoveries_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (discoveries.length === 0) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(discoveries, null, 2));
    const link = document.createElement('a');
    link.href = dataStr;
    link.setAttribute('download', `SPHEREx_Discoveries_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-cyan-400" />
            <span>Citizen Science Discovery Logger</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Catalog moving object candidates, brown dwarfs, and variable transients from SPHEREx NIR sky sweeps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={discoveries.length === 0}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportJSON}
            disabled={discoveries.length === 0}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Log New Candidate Form */}
      <form onSubmit={handleCreateEntry} className="bg-slate-950 p-4 rounded-lg border border-slate-800/80 flex flex-col gap-3 text-xs">
        <div className="font-semibold text-slate-200 flex items-center gap-2">
          <BookmarkPlus className="w-3.5 h-3.5 text-cyan-400" />
          <span>Log Candidate at Current Coordinates</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-mono">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">RA (J2000)</label>
            <input
              type="text"
              readOnly
              value={degreesToSexagesimalRA(currentRa)}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-cyan-300"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Dec (J2000)</label>
            <input
              type="text"
              readOnly
              value={degreesToSexagesimalDec(currentDec)}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-cyan-300"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1 font-sans">Object Classification</label>
            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value as DiscoveryCandidate['classification'])}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-sans text-xs"
            >
              <option value="Brown Dwarf Candidate">Brown Dwarf Candidate (T/Y Dwarf)</option>
              <option value="Fast Moving Asteroid / Comet">Fast Moving Asteroid / Comet</option>
              <option value="High Proper Motion Star">High Proper Motion Star</option>
              <option value="Variable Star / Transient">Variable Star / Transient</option>
              <option value="Unknown Anomaly">Unknown Astrometric Anomaly</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1 font-sans">Confidence Rating</label>
            <select
              value={confidence}
              onChange={(e) => setConfidence(e.target.value as DiscoveryCandidate['userRating'])}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-sans text-xs"
            >
              <option value="High Confidence">High Confidence (Clear Dipole)</option>
              <option value="Needs Follow-Up">Needs Follow-Up Inspection</option>
              <option value="Curious Anomaly">Curious Anomaly</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[11px] text-slate-400 block mb-1">Observational Notes & Spectral Features</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Strong absorption in Array 4 (3.05µm H2O ice); fast 8 arcsec shift between Pass 1 and 2."
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-200"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded text-xs transition-colors shadow-sm"
            >
              Record Discovery Candidate
            </button>
          </div>
        </div>
      </form>

      {/* Catalog Table */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Logged Discovery Candidates ({discoveries.length})</span>
          <span className="font-mono text-[11px]">NASA Citizen Science Protocol</span>
        </div>

        {discoveries.length === 0 ? (
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-6 text-center text-xs text-slate-500">
            No candidates logged yet. Spot moving dipoles in the Difference viewer or Blink comparator, then record them here!
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-medium border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">ID / Time</th>
                  <th className="py-2.5 px-3">Coordinates (J2000)</th>
                  <th className="py-2.5 px-3">Classification</th>
                  <th className="py-2.5 px-3 font-mono">Proper Motion</th>
                  <th className="py-2.5 px-3">Confidence</th>
                  <th className="py-2.5 px-3">Notes</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                {discoveries.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-cyan-400 font-bold">
                      <div>{d.id}</div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        {new Date(d.timestamp).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-white">
                      <div>{d.raStr}</div>
                      <div className="text-slate-400">{d.decStr}</div>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-200">
                      {d.classification}
                    </td>
                    <td className="py-2.5 px-3 text-amber-300">
                      {d.estimatedMotionPerYear > 1000
                        ? `${(d.estimatedMotionPerYear / 1000).toFixed(2)}″/yr`
                        : `${Math.round(d.estimatedMotionPerYear)} mas/yr`}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="text-emerald-400 font-medium">{d.userRating}</span>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-400 max-w-xs truncate">
                      {d.notes}
                    </td>
                    <td className="py-2.5 px-3 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectDiscovery(d)}
                          title="Slew Telescope to this Discovery"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteDiscovery(d.id)}
                          title="Remove Entry"
                          className="p-1.5 bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
