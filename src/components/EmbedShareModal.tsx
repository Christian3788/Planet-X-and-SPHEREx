/**
 * SPHEREx SkyShift - Embed & Direct URL Generator Modal
 * Enables science communicators, astronomers, and educators to embed
 * the interactive multi-epoch SPHEREx sky viewer directly into papers, blogs, and websites.
 */

import React, { useState } from 'react';
import { X, Copy, Check, Code, Share2, ExternalLink } from 'lucide-react';

interface EmbedShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRa: number;
  currentDec: number;
  currentFov: number;
  targetId?: string;
  activeEpoch: number;
}

export const EmbedShareModal: React.FC<EmbedShareModalProps> = ({
  isOpen,
  onClose,
  currentRa,
  currentDec,
  currentFov,
  targetId,
  activeEpoch,
}) => {
  const [copiedType, setCopiedType] = useState<'url' | 'iframe' | 'markdown' | null>(null);

  if (!isOpen) return null;

  const currentUrl = window.location.href;
  const iframeSnippet = `<iframe \n  src="${currentUrl}" \n  width="100%" \n  height="650" \n  style="border: 1px solid #1e293b; border-radius: 12px;" \n  title="NASA SPHEREx SkyShift Sky Viewer" \n  allow="fullscreen"\n></iframe>`;

  const markdownSnippet = `[![NASA SPHEREx SkyShift](https://img.shields.io/badge/NASA_SPHEREx-SkyShift_Viewer-06b6d4?style=flat-square&logo=nasa)](${currentUrl})`;

  const handleCopy = (text: string, type: 'url' | 'iframe' | 'markdown') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl flex flex-col gap-5 text-slate-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white bg-slate-950/60 rounded-lg border border-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-cyan-950 text-cyan-400 rounded-lg border border-cyan-800">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Share & Embed SkyShift Portal</h2>
            <p className="text-xs text-slate-400">
              Embed interactive multi-epoch SPHEREx sky patches into research notes, citizen science portals, or social posts.
            </p>
          </div>
        </div>

        {/* 1. Direct Shareable Link */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300">Direct Coordinate URL</label>
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-xs">
            <span className="flex-1 truncate text-cyan-300">{currentUrl}</span>
            <button
              onClick={() => handleCopy(currentUrl, 'url')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs flex items-center gap-1.5 transition-colors shrink-0 font-sans"
            >
              {copiedType === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedType === 'url' ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        {/* 2. Responsive HTML iframe Snippet */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Code className="w-3.5 h-3.5 text-cyan-400" />
            <span>HTML &lt;iframe&gt; Embed Code</span>
          </label>
          <div className="relative bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300">
            <pre className="overflow-x-auto whitespace-pre">{iframeSnippet}</pre>
            <button
              onClick={() => handleCopy(iframeSnippet, 'iframe')}
              className="absolute top-2.5 right-2.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs flex items-center gap-1.5 transition-colors font-sans"
            >
              {copiedType === 'iframe' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedType === 'iframe' ? 'Copied' : 'Copy Embed'}</span>
            </button>
          </div>
        </div>

        {/* 3. Markdown Badge Link */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300">GitHub / Markdown Link Badge</label>
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-xs">
            <span className="flex-1 truncate text-slate-400">{markdownSnippet}</span>
            <button
              onClick={() => handleCopy(markdownSnippet, 'markdown')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs flex items-center gap-1.5 transition-colors shrink-0 font-sans"
            >
              {copiedType === 'markdown' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedType === 'markdown' ? 'Copied' : 'Copy Badge'}</span>
            </button>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
          URL parameters include: RA (<span className="text-slate-400 font-mono">{currentRa.toFixed(4)}°</span>), Dec (<span className="text-slate-400 font-mono">{currentDec.toFixed(4)}°</span>), FOV (<span className="text-slate-400 font-mono">{currentFov}′</span>), and active Epoch (<span className="text-slate-400 font-mono">Pass {activeEpoch}</span>).
        </div>
      </div>
    </div>
  );
};
