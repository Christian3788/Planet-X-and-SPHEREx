/**
 * SPHEREx SkyShift - Main Interactive Sky Canvas Viewer
 * High-performance HTML5 Canvas renderer for multi-epoch near-IR sky fields.
 * Supports Blink comparator, Difference subtraction, Co-add stacking, Astrometric ruler,
 * and Multi-mission overlays (Gaia DR3 vectors, WISE, SPHEREx contamination flags).
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  GeneratedField,
  StarObject,
  ContaminationFlag,
  EpochViewMode,
  ColormapOption,
  StretchOption,
  OverlayConfig,
  DisplayMode,
  MeasurementPoint,
} from '../types/astronomy';
import {
  calculateStarPositionAtEpoch,
  calculateStarFlux,
  applyColormap,
  applyStretch,
} from '../utils/fitsSimulation';
import {
  degreesToSexagesimalRA,
  degreesToSexagesimalDec,
  angularSeparationArcsec,
  positionAngleDegrees,
} from '../utils/coordinates';
import { SPHEREX_SURVEY_EPOCHS } from '../data/spectralBands';
import { scanFieldForMotionDipoles } from '../utils/anomalyDetector';
import { ZoomIn, ZoomOut, RotateCcw, Crosshair, Ruler, Eye, Layers } from 'lucide-react';

interface SkyCanvasViewerProps {
  skyField: GeneratedField;
  activeEpoch: number; // 1, 2, 3, 4
  compareEpoch: number; // for diff & blink (default 2)
  viewMode: EpochViewMode; // 'single' | 'blink' | 'timelapse' | 'difference' | 'stacked_coadd'
  selectedBandIndex: number;
  displayMode: DisplayMode;
  colormap: ColormapOption;
  stretch: StretchOption;
  overlays: OverlayConfig;
  onSelectStar: (star: StarObject) => void;
  selectedStarId?: string;
  onMeasurementComplete?: (p1: MeasurementPoint, p2: MeasurementPoint, arcsec: number, paDeg: number) => void;
  isBlinking: boolean;
  blinkFrame: number; // alternating 1 or 2
}

export const SkyCanvasViewer: React.FC<SkyCanvasViewerProps> = ({
  skyField,
  activeEpoch,
  compareEpoch,
  viewMode,
  selectedBandIndex,
  displayMode,
  colormap,
  stretch,
  overlays,
  onSelectStar,
  selectedStarId,
  onMeasurementComplete,
  isBlinking,
  blinkFrame,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Pan & Zoom state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Hover coordinate probe
  const [cursorCoord, setCursorCoord] = useState<{
    ra: number;
    dec: number;
    raStr: string;
    decStr: string;
    canvasX: number;
    canvasY: number;
  } | null>(null);

  // Ruler / Astrometric Measurement state
  const [isRulerActive, setIsRulerActive] = useState<boolean>(false);
  const [measurePoint1, setMeasurePoint1] = useState<MeasurementPoint | null>(null);
  const [currentMeasure, setCurrentMeasure] = useState<{
    arcsec: number;
    paDeg: number;
    deltaYears: number;
    estimatedPmMasYr: number;
  } | null>(null);

  // Compute active effective epoch to display
  const effectiveEpoch =
    viewMode === 'blink'
      ? blinkFrame === 1
        ? activeEpoch
        : compareEpoch
      : viewMode === 'timelapse'
      ? blinkFrame
      : activeEpoch;

  // Converts celestial coordinate (RA, Dec) to Canvas pixel coordinates
  const celestialToCanvas = useCallback(
    (
      targetRa: number,
      targetDec: number,
      width: number,
      height: number
    ): { x: number; y: number } => {
      const fovDeg = skyField.fovArcmin / 60;
      const cosDec = Math.cos((skyField.centerDec * Math.PI) / 180) || 1;

      // In astronomy: RA increases to the LEFT (East is Left, West is Right)
      const dRa = (skyField.centerRa - targetRa) * cosDec;
      const dDec = targetDec - skyField.centerDec;

      const pxPerDeg = (Math.min(width, height) / fovDeg) * zoom;
      const centerX = width / 2 + pan.x;
      const centerY = height / 2 + pan.y;

      return {
        x: centerX + dRa * pxPerDeg,
        y: centerY - dDec * pxPerDeg,
      };
    },
    [skyField, zoom, pan]
  );

  // Converts Canvas pixel coordinates to Celestial (RA, Dec)
  const canvasToCelestial = useCallback(
    (
      canvasX: number,
      canvasY: number,
      width: number,
      height: number
    ): { ra: number; dec: number } => {
      const fovDeg = skyField.fovArcmin / 60;
      const cosDec = Math.cos((skyField.centerDec * Math.PI) / 180) || 1;
      const pxPerDeg = (Math.min(width, height) / fovDeg) * zoom;

      const centerX = width / 2 + pan.x;
      const centerY = height / 2 + pan.y;

      const dRa = (canvasX - centerX) / pxPerDeg;
      const dDec = (centerY - canvasY) / pxPerDeg;

      const ra = skyField.centerRa - dRa / cosDec;
      const dec = skyField.centerDec + dDec;

      return {
        ra: ((ra % 360) + 360) % 360,
        dec: Math.max(-90, Math.min(90, dec)),
      };
    },
    [skyField, zoom, pan]
  );

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    const isDiff = viewMode === 'difference';
    const isStacked = viewMode === 'stacked_coadd';

    if (isDiff) {
      // In difference mode, baseline zero-delta is neutral slate gray
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, width, height);
    } else if (colormap === 'inverted_astronomy') {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = '#07090e';
      ctx.fillRect(0, 0, width, height);
    }

    // Render Multi-Mission Survey Backdrop Layer (2MASS, WISE, DSS, Gaia) if selected
    if (overlays.backdropSurvey && overlays.backdropSurvey !== 'spherex_only' && !isDiff) {
      ctx.save();
      const alpha = overlays.backdropOpacity || 0.35;
      ctx.globalAlpha = alpha;

      if (overlays.backdropSurvey === '2mass_nir') {
        // 2MASS NIR J/H/Ks diffuse background glow
        const grad = ctx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, width * 0.7);
        grad.addColorStop(0, 'rgba(217, 119, 6, 0.4)'); // Warm amber
        grad.addColorStop(0.6, 'rgba(180, 83, 9, 0.2)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (overlays.backdropSurvey === 'wise_allwise') {
        // WISE / NEOWISE Mid-IR cirrus infrared glow
        const grad = ctx.createRadialGradient(width * 0.4, height * 0.4, 30, width / 2, height / 2, width * 0.8);
        grad.addColorStop(0, 'rgba(236, 72, 153, 0.45)'); // Magenta/cyan cirrus
        grad.addColorStop(0.5, 'rgba(6, 182, 212, 0.25)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (overlays.backdropSurvey === 'dss_optical') {
        // DSS Optical Sky Survey subtle blue-white star haze
        const grad = ctx.createRadialGradient(width / 2, height / 2, 40, width / 2, height / 2, width * 0.65);
        grad.addColorStop(0, 'rgba(147, 197, 253, 0.3)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (overlays.backdropSurvey === 'gaia_density') {
        // Gaia DR3 stellar density heatmap
        const grad = ctx.createLinearGradient(0, height, width, 0);
        grad.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
        grad.addColorStop(0.5, 'rgba(16, 185, 129, 0.2)');
        grad.addColorStop(1, 'rgba(245, 158, 11, 0.3)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.restore();
    }

    // Draw coordinate hairline grid if enabled
    if (overlays.coordinateGrid) {
      ctx.save();
      ctx.strokeStyle = colormap === 'inverted_astronomy' ? 'rgba(148, 163, 184, 0.3)' : 'rgba(51, 65, 85, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      const gridSteps = 6;
      for (let i = 1; i < gridSteps; i++) {
        const gx = (width / gridSteps) * i;
        const gy = (height / gridSteps) * i;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Render Stars / Objects
    skyField.stars.forEach((star: StarObject) => {
      if (isDiff) {
        // Difference Image Mode (Epoch compareEpoch minus Epoch activeEpoch):
        // Position & flux at Epoch A (reference)
        const posA = calculateStarPositionAtEpoch(star, activeEpoch);
        const fluxA = calculateStarFlux(star, activeEpoch, selectedBandIndex, displayMode);
        const ptA = celestialToCanvas(posA.ra, posA.dec, width, height);

        // Position & flux at Epoch B (new pass)
        const posB = calculateStarPositionAtEpoch(star, compareEpoch);
        const fluxB = calculateStarFlux(star, compareEpoch, selectedBandIndex, displayMode);
        const ptB = celestialToCanvas(posB.ra, posB.dec, width, height);

        const deltaFlux = fluxB - fluxA;
        const deltaPosArcsec = angularSeparationArcsec(posA, posB);

        if (deltaPosArcsec > 0.4) {
          // Object moved! Render Dipole:
          // Negative deficit (old position posA)
          const radiusA = Math.max(3, Math.min(16, Math.sqrt(fluxA) * 0.35 * zoom));
          const gradA = ctx.createRadialGradient(ptA.x, ptA.y, 0, ptA.x, ptA.y, radiusA * 2);
          gradA.addColorStop(0, 'rgba(6, 182, 212, 0.95)'); // Laser cyan negative dipole
          gradA.addColorStop(0.5, 'rgba(6, 182, 212, 0.4)');
          gradA.addColorStop(1, 'rgba(6, 182, 212, 0)');
          ctx.fillStyle = gradA;
          ctx.beginPath();
          ctx.arc(ptA.x, ptA.y, radiusA * 2, 0, Math.PI * 2);
          ctx.fill();

          // Positive excess (new position posB)
          const radiusB = Math.max(3, Math.min(16, Math.sqrt(fluxB) * 0.35 * zoom));
          const gradB = ctx.createRadialGradient(ptB.x, ptB.y, 0, ptB.x, ptB.y, radiusB * 2);
          gradB.addColorStop(0, 'rgba(249, 115, 22, 0.95)'); // Electric orange positive dipole
          gradB.addColorStop(0.5, 'rgba(249, 115, 22, 0.4)');
          gradB.addColorStop(1, 'rgba(249, 115, 22, 0)');
          ctx.fillStyle = gradB;
          ctx.beginPath();
          ctx.arc(ptB.x, ptB.y, radiusB * 2, 0, Math.PI * 2);
          ctx.fill();

          // Motion connector line
          ctx.save();
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(ptA.x, ptA.y);
          ctx.lineTo(ptB.x, ptB.y);
          ctx.stroke();
          ctx.restore();
        } else if (Math.abs(deltaFlux) > 30) {
          // Stationary but variable in flux (e.g. RW Aurigae, R Draconis, Supernova!)
          const radius = Math.max(3, Math.min(22, Math.sqrt(Math.abs(deltaFlux)) * 0.4 * zoom));
          const isBrightened = deltaFlux > 0;
          const color = isBrightened ? 'rgba(239, 68, 68, 0.9)' : 'rgba(59, 130, 246, 0.9)';
          const grad = ctx.createRadialGradient(ptB.x, ptB.y, 0, ptB.x, ptB.y, radius * 2);
          grad.addColorStop(0, color);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(ptB.x, ptB.y, radius * 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Perfect cancellation: small residual speckle
          ctx.fillStyle = 'rgba(100, 116, 139, 0.2)';
          ctx.beginPath();
          ctx.arc(ptA.x, ptA.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Normal, Blink, or Stacked Rendering
        let pos = calculateStarPositionAtEpoch(star, effectiveEpoch);
        let flux = calculateStarFlux(star, effectiveEpoch, selectedBandIndex, displayMode);

        if (isStacked) {
          // Stacked co-add averages all 4 passes
          let sumFlux = 0;
          for (let ep = 1; ep <= 4; ep++) {
            sumFlux += calculateStarFlux(star, ep, selectedBandIndex, displayMode);
          }
          flux = sumFlux / 4;
        }

        const pt = celestialToCanvas(pos.ra, pos.dec, width, height);

        // Normalize flux and apply stretch
        const normFlux = Math.min(1, flux / 3500);
        const stretched = applyStretch(normFlux, stretch);

        // PSF radius based on flux & telescope aperture (SPHEREx 20cm aperture ~ 6.2 arcsec pixels)
        const baseRadius = Math.max(1.8, Math.min(18, Math.pow(stretched, 0.6) * 14 * zoom));
        const [r, g, b] = applyColormap(stretched, colormap);

        const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, baseRadius * 1.8);
        if (colormap === 'inverted_astronomy') {
          grad.addColorStop(0, `rgb(${r}, ${g}, ${b})`);
          grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.8)`);
          grad.addColorStop(0.8, `rgba(${r}, ${g}, ${b}, 0.2)`);
          grad.addColorStop(1, 'rgba(248, 250, 252, 0)');
        } else {
          grad.addColorStop(0, `rgb(${r}, ${g}, ${b})`);
          grad.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.85)`);
          grad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.3)`);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, baseRadius * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Target highlight circle or selected star indicator
        if (star.isTarget || star.id === selectedStarId) {
          ctx.save();
          ctx.strokeStyle = star.id === selectedStarId ? '#38bdf8' : '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, baseRadius * 2 + 5, 0, Math.PI * 2);
          ctx.stroke();

          // Reticle tick marks
          const rTick = baseRadius * 2 + 5;
          ctx.beginPath();
          ctx.moveTo(pt.x - rTick - 4, pt.y);
          ctx.lineTo(pt.x - rTick, pt.y);
          ctx.moveTo(pt.x + rTick, pt.y);
          ctx.lineTo(pt.x + rTick + 4, pt.y);
          ctx.moveTo(pt.x, pt.y - rTick - 4);
          ctx.lineTo(pt.x, pt.y - rTick);
          ctx.moveTo(pt.x, pt.y + rTick);
          ctx.lineTo(pt.x, pt.y + rTick + 4);
          ctx.stroke();
          ctx.restore();
        }

        // SIMBAD / Object Name labels
        if (overlays.simbadLabels && (star.name || star.isTarget)) {
          ctx.save();
          ctx.font = '11px "JetBrains Mono", monospace';
          ctx.fillStyle = colormap === 'inverted_astronomy' ? '#0f172a' : '#38bdf8';
          ctx.fillText(star.name || star.id, pt.x + baseRadius + 8, pt.y + 4);
          ctx.restore();
        }

        // Gaia DR3 Astrometric Vectors overlay
        if (overlays.gaiaVectors && (Math.abs(star.properMotionRa) > 20 || Math.abs(star.properMotionDec) > 20)) {
          ctx.save();
          ctx.strokeStyle = '#22c55e'; // Green proper motion arrow
          ctx.fillStyle = '#22c55e';
          ctx.lineWidth = 1.5;

          // Scale vector (10 years projected motion)
          const scaleYears = 10;
          const cosDec = Math.cos((star.baseDec * Math.PI) / 180) || 1;
          const dRaArcsec = (star.properMotionRa * scaleYears) / 1000;
          const dDecArcsec = (star.properMotionDec * scaleYears) / 1000;

          const fovDeg = skyField.fovArcmin / 60;
          const pxPerDeg = (Math.min(width, height) / fovDeg) * zoom;
          const pxPerArcsec = pxPerDeg / 3600;

          // Remember: RA increases to left
          const endX = pt.x - dRaArcsec * pxPerArcsec;
          const endY = pt.y - dDecArcsec * pxPerArcsec;

          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          // Arrowhead
          const angle = Math.atan2(endY - pt.y, endX - pt.x);
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - 7 * Math.cos(angle - Math.PI / 6), endY - 7 * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(endX - 7 * Math.cos(angle + Math.PI / 6), endY - 7 * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fill();

          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillText(`µ: ${(Math.sqrt(star.properMotionRa ** 2 + star.properMotionDec ** 2) / 1000).toFixed(2)}″/yr`, endX + 4, endY);
          ctx.restore();
        }

        // WISE W1/W2 crosshair reference
        if (overlays.wiseCrosshairs && star.baseMagNIR < 13.5) {
          ctx.save();
          ctx.strokeStyle = 'rgba(236, 72, 153, 0.6)'; // Magenta
          ctx.lineWidth = 1;
          const chSize = 7;
          ctx.beginPath();
          ctx.moveTo(pt.x - chSize, pt.y);
          ctx.lineTo(pt.x + chSize, pt.y);
          ctx.moveTo(pt.x, pt.y - chSize);
          ctx.lineTo(pt.x, pt.y + chSize);
          ctx.stroke();
          ctx.restore();
        }
      }
    });

    // Render Contamination Flags
    if (overlays.contaminationFlags) {
      skyField.contaminants.forEach((c: ContaminationFlag) => {
        if (!c.epochAffected.includes(effectiveEpoch) && !isDiff) return;

        const cx = c.x * width;
        const cy = c.y * height;

        ctx.save();
        ctx.strokeStyle = c.type === 'cosmic_ray' ? '#ef4444' : '#eab308';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([2, 2]);

        // Box around artifact
        ctx.strokeRect(cx - 10, cy - 10, 20, 20);

        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = c.type === 'cosmic_ray' ? '#ef4444' : '#eab308';
        ctx.fillText(`[FLAG: ${c.type.toUpperCase()}]`, cx + 14, cy + 4);
        ctx.restore();
      });
    }

    // Render Automated Dipole Discovery Reticles (AI / Algorithmic Candidate Finder)
    if (overlays.autoDipoleBoxes) {
      const dipoles = scanFieldForMotionDipoles(
        skyField.stars,
        activeEpoch,
        compareEpoch,
        selectedBandIndex
      );

      dipoles.forEach((d) => {
        const ptA = celestialToCanvas(d.posA.x, d.posA.y, width, height);
        const ptB = celestialToCanvas(d.posB.x, d.posB.y, width, height);

        ctx.save();
        ctx.strokeStyle = '#06b6d4'; // Laser cyan
        ctx.lineWidth = 1.5;

        // Animated / Stylized diamond reticle
        const size = 16;
        ctx.beginPath();
        ctx.moveTo(ptB.x, ptB.y - size);
        ctx.lineTo(ptB.x + size, ptB.y);
        ctx.lineTo(ptB.x, ptB.y + size);
        ctx.lineTo(ptB.x - size, ptB.y);
        ctx.closePath();
        ctx.stroke();

        // Connect from old position
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
        ctx.beginPath();
        ctx.moveTo(ptA.x, ptA.y);
        ctx.lineTo(ptB.x, ptB.y);
        ctx.stroke();

        // Candidate Tag
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(8, 51, 68, 0.9)';
        ctx.strokeStyle = '#0891b2';
        ctx.fillRect(ptB.x + size + 4, ptB.y - 18, 140, 24);
        ctx.strokeRect(ptB.x + size + 4, ptB.y - 18, 140, 24);

        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = '#67e8f9';
        ctx.fillText(`★ DIPOLE SNR: ${d.snr}`, ptB.x + size + 8, ptB.y - 6);
        ctx.fillText(`Δθ: ${d.deltaArcsec.toFixed(2)}″`, ptB.x + size + 8, ptB.y + 3);
        ctx.restore();
      });
    }

    // Render Astrometric Measurement Ruler Line if active
    if (measurePoint1 && isRulerActive && cursorCoord) {
      const p1Canvas = celestialToCanvas(measurePoint1.ra, measurePoint1.dec, width, height);
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(p1Canvas.x, p1Canvas.y);
      ctx.lineTo(cursorCoord.canvasX, cursorCoord.canvasY);
      ctx.stroke();

      // End anchor points
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(p1Canvas.x, p1Canvas.y, 4, 0, Math.PI * 2);
      ctx.arc(cursorCoord.canvasX, cursorCoord.canvasY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Measurement tag
      if (currentMeasure) {
        const midX = (p1Canvas.x + cursorCoord.canvasX) / 2;
        const midY = (p1Canvas.y + cursorCoord.canvasY) / 2;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#0284c7';
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
        ctx.fillRect(midX - 55, midY - 26, 110, 36);
        ctx.strokeRect(midX - 55, midY - 26, 110, 36);

        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.fillStyle = '#f0f9ff';
        ctx.textAlign = 'center';
        ctx.fillText(`Δθ: ${currentMeasure.arcsec.toFixed(2)}″`, midX, midY - 10);
        ctx.fillText(`PA: ${currentMeasure.paDeg.toFixed(1)}°`, midX, midY + 4);
      }
      ctx.restore();
    }

    // Render Astronomical Scale Bar
    if (overlays.scaleBar) {
      ctx.save();
      const fovDeg = skyField.fovArcmin / 60;
      const pxPerDeg = (Math.min(width, height) / fovDeg) * zoom;
      const pxPerArcmin = pxPerDeg / 60;

      // Choose convenient bar length (1 arcmin or 30 arcsec)
      let barArcmin = 1;
      let barLabel = '1.0′ (60″)';
      if (skyField.fovArcmin <= 3.5) {
        barArcmin = 0.5;
        barLabel = '30″ (0.5′)';
      } else if (skyField.fovArcmin >= 20) {
        barArcmin = 5;
        barLabel = '5.0′ (300″)';
      }

      const barPx = pxPerArcmin * barArcmin;
      const barX = 24;
      const barY = height - 24;

      ctx.strokeStyle = colormap === 'inverted_astronomy' ? '#0f172a' : '#f8fafc';
      ctx.fillStyle = colormap === 'inverted_astronomy' ? '#0f172a' : '#f8fafc';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(barX, barY);
      ctx.lineTo(barX + barPx, barY);
      // End ticks
      ctx.moveTo(barX, barY - 5);
      ctx.lineTo(barX, barY + 5);
      ctx.moveTo(barX + barPx, barY - 5);
      ctx.lineTo(barX + barPx, barY + 5);
      ctx.stroke();

      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(barLabel, barX, barY - 8);
      ctx.restore();
    }

    // Render Compass / Orientation Indicator (N / E)
    ctx.save();
    const compassX = width - 36;
    const compassY = height - 36;
    const compassLen = 22;

    ctx.strokeStyle = colormap === 'inverted_astronomy' ? '#475569' : '#94a3b8';
    ctx.fillStyle = colormap === 'inverted_astronomy' ? '#475569' : '#94a3b8';
    ctx.lineWidth = 1.5;

    // North (pointing Up)
    ctx.beginPath();
    ctx.moveTo(compassX, compassY);
    ctx.lineTo(compassX, compassY - compassLen);
    ctx.stroke();

    // East (pointing Left in standard astronomical convention!)
    ctx.beginPath();
    ctx.moveTo(compassX, compassY);
    ctx.lineTo(compassX - compassLen, compassY);
    ctx.stroke();

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('N', compassX - 3, compassY - compassLen - 4);
    ctx.fillText('E', compassX - compassLen - 12, compassY + 3);
    ctx.restore();
  }, [
    skyField,
    effectiveEpoch,
    activeEpoch,
    compareEpoch,
    viewMode,
    selectedBandIndex,
    displayMode,
    colormap,
    stretch,
    overlays,
    zoom,
    pan,
    celestialToCanvas,
    selectedStarId,
    measurePoint1,
    isRulerActive,
    cursorCoord,
    currentMeasure,
  ]);

  // Handle Resize of canvas to fill container
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom((prev) => Math.max(0.6, Math.min(6.0, prev * zoomFactor)));
  };

  // Mouse move handler for dragging, coordinate readout, and ruler
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging) {
      setPan({
        x: pan.x + (x - dragStart.x),
        y: pan.y + (y - dragStart.y),
      });
      setDragStart({ x, y });
    }

    // Convert mouse position to celestial coordinates
    const celestial = canvasToCelestial(x, y, canvas.width, canvas.height);
    const raStr = degreesToSexagesimalRA(celestial.ra);
    const decStr = degreesToSexagesimalDec(celestial.dec);

    setCursorCoord({
      ra: celestial.ra,
      dec: celestial.dec,
      raStr,
      decStr,
      canvasX: x,
      canvasY: y,
    });

    if (measurePoint1 && isRulerActive) {
      const sep = angularSeparationArcsec(measurePoint1, celestial);
      const pa = positionAngleDegrees(measurePoint1, celestial);
      const deltaYears = Math.abs(effectiveEpoch - measurePoint1.epoch) * 0.5 || 0.5;
      const pm = (sep / deltaYears) * 1000; // mas/yr

      setCurrentMeasure({
        arcsec: sep,
        paDeg: pa,
        deltaYears,
        estimatedPmMasYr: pm,
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      // Left click
      if (isRulerActive) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const celestial = canvasToCelestial(x, y, canvas.width, canvas.height);

        if (!measurePoint1) {
          // Set point 1
          setMeasurePoint1({
            x,
            y,
            ra: celestial.ra,
            dec: celestial.dec,
            epoch: effectiveEpoch,
          });
        } else {
          // Complete measurement
          const sep = angularSeparationArcsec(measurePoint1, celestial);
          const pa = positionAngleDegrees(measurePoint1, celestial);
          if (onMeasurementComplete) {
            onMeasurementComplete(
              measurePoint1,
              { x, y, ra: celestial.ra, dec: celestial.dec, epoch: effectiveEpoch },
              sep,
              pa
            );
          }
          setMeasurePoint1(null);
          setCurrentMeasure(null);
        }
        return;
      }

      // Check if user clicked near any star to select for spectral analysis
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      let foundStar: StarObject | null = null;
      let minDistance = 24; // click radius in pixels

      skyField.stars.forEach((star: StarObject) => {
        const pos = calculateStarPositionAtEpoch(star, effectiveEpoch);
        const pt = celestialToCanvas(pos.ra, pos.dec, canvas.width, canvas.height);
        const dist = Math.hypot(pt.x - clickX, pt.y - clickY);
        if (dist < minDistance) {
          minDistance = dist;
          foundStar = star;
        }
      });

      if (foundStar) {
        onSelectStar(foundStar);
      } else {
        // Start pan drag
        setIsDragging(true);
        setDragStart({ x: clickX, y: clickY });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[500px] flex-1 bg-slate-950 overflow-hidden select-none border border-slate-800 rounded-xl"
    >
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          setCursorCoord(null);
        }}
        className={`w-full h-full block ${
          isRulerActive ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-crosshair'
        }`}
      />

      {/* Floating HUD: Viewport Mode & Epoch Badge */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-mono">EPOCH:</span>
          {viewMode === 'difference' ? (
            <span className="font-mono text-cyan-400 font-semibold">
              Pass {compareEpoch} - Pass {activeEpoch} (Diff Subtraction)
            </span>
          ) : viewMode === 'stacked_coadd' ? (
            <span className="font-mono text-cyan-400 font-semibold">
              Co-add Stacking (Passes 1–4)
            </span>
          ) : (
            <span className="font-mono text-cyan-300 font-semibold">
              SPHEREx Pass {effectiveEpoch} (
              {SPHEREX_SURVEY_EPOCHS.find((e) => e.epochId === effectiveEpoch)?.dateString})
            </span>
          )}
          {viewMode === 'blink' && (
            <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse ml-1" />
          )}
        </div>

        {skyField.activeTarget && (
          <div className="bg-slate-950/80 backdrop-blur-md border border-amber-500/30 rounded-lg px-3 py-1.5 text-xs flex items-center gap-2 text-amber-300">
            <span className="font-medium">{skyField.activeTarget.name}</span>
            <span className="text-slate-500">·</span>
            <span className="font-mono text-xs">{skyField.activeTarget.spectralClass}</span>
          </div>
        )}
      </div>

      {/* Canvas Tool Overlay Controls (Zoom, Pan Reset, Ruler) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5">
        <button
          onClick={() => setZoom((z) => Math.min(6.0, z * 1.25))}
          title="Zoom In"
          className="p-2 bg-slate-900/85 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg backdrop-blur-sm transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.6, z * 0.8))}
          title="Zoom Out"
          className="p-2 bg-slate-900/85 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg backdrop-blur-sm transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          title="Reset Zoom & Pan"
          className="p-2 bg-slate-900/85 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg backdrop-blur-sm transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setIsRulerActive(!isRulerActive);
            setMeasurePoint1(null);
            setCurrentMeasure(null);
          }}
          title={isRulerActive ? 'Disable Motion Ruler' : 'Measure Motion / Distance Ruler'}
          className={`p-2 border rounded-lg backdrop-blur-sm transition-colors ${
            isRulerActive
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-semibold'
              : 'bg-slate-900/85 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
          }`}
        >
          <Ruler className="w-4 h-4" />
        </button>
      </div>

      {/* Real-time Astrometric Crosshair Readout Bar */}
      <div className="absolute bottom-4 left-4 z-20 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-lg px-3.5 py-2 flex items-center gap-4 text-xs font-mono text-slate-300">
        <div className="flex items-center gap-1.5 text-cyan-400">
          <Crosshair className="w-3.5 h-3.5" />
          <span className="text-slate-400">J2000:</span>
        </div>
        {cursorCoord ? (
          <>
            <div>
              <span className="text-slate-500 mr-1">RA:</span>
              <span className="text-white">{cursorCoord.raStr}</span>
              <span className="text-slate-500 text-[11px] ml-1">({cursorCoord.ra.toFixed(4)}°)</span>
            </div>
            <span className="text-slate-700">|</span>
            <div>
              <span className="text-slate-500 mr-1">Dec:</span>
              <span className="text-white">{cursorCoord.decStr}</span>
              <span className="text-slate-500 text-[11px] ml-1">({cursorCoord.dec.toFixed(4)}°)</span>
            </div>
          </>
        ) : (
          <div className="text-slate-500 italic">Hover over sky canvas for coordinates</div>
        )}
        <span className="text-slate-700">|</span>
        <div>
          <span className="text-slate-500 mr-1">FOV:</span>
          <span className="text-slate-200">{skyField.fovArcmin}′</span>
        </div>
        <div>
          <span className="text-slate-500 mr-1">Zoom:</span>
          <span className="text-slate-200">{zoom.toFixed(1)}x</span>
        </div>
      </div>

      {/* Astrometric Motion Measurement Banner when Ruler is Active */}
      {isRulerActive && (
        <div className="absolute top-16 left-4 z-20 bg-cyan-950/90 border border-cyan-700/60 rounded-lg px-4 py-2.5 text-xs text-cyan-100 flex items-center gap-4 backdrop-blur-md shadow-lg">
          <div>
            <div className="font-semibold text-cyan-300">Astrometric Motion Measurement Mode</div>
            <div className="text-[11px] text-cyan-400/80">
              {measurePoint1
                ? 'Click second position (e.g. object in next pass) to complete measurement'
                : 'Click initial position of moving object'}
            </div>
          </div>
          {currentMeasure && (
            <div className="flex items-center gap-3 pl-3 border-l border-cyan-800 font-mono">
              <div>
                <span className="text-cyan-400">Sep:</span> {currentMeasure.arcsec.toFixed(2)}″
              </div>
              <div>
                <span className="text-cyan-400">PA:</span> {currentMeasure.paDeg.toFixed(1)}°
              </div>
              <div>
                <span className="text-cyan-400">Est. Motion:</span>{' '}
                {currentMeasure.estimatedPmMasYr > 1000
                  ? `${(currentMeasure.estimatedPmMasYr / 1000).toFixed(2)}″/yr`
                  : `${Math.round(currentMeasure.estimatedPmMasYr)} mas/yr`}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
