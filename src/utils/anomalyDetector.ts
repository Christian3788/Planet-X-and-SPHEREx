/**
 * SPHEREx SkyShift - Automated Transient & Motion Dipole Pipeline
 * Scans multi-epoch field for high-significance astrometric displacements,
 * extreme infrared color excess, and photometric variability.
 */

import { StarObject, DetectedDipoleCandidate } from '../types/astronomy';
import { calculateStarPositionAtEpoch, calculateStarFlux } from './fitsSimulation';
import { angularSeparationArcsec, degreesToSexagesimalRA, degreesToSexagesimalDec } from './coordinates';

export function scanFieldForMotionDipoles(
  stars: StarObject[],
  epochA: number,
  epochB: number,
  selectedBandIndex: number
): DetectedDipoleCandidate[] {
  const candidates: DetectedDipoleCandidate[] = [];

  stars.forEach((star) => {
    const posA = calculateStarPositionAtEpoch(star, epochA);
    const posB = calculateStarPositionAtEpoch(star, epochB);
    const fluxA = calculateStarFlux(star, epochA, selectedBandIndex, 'single_band');
    const fluxB = calculateStarFlux(star, epochB, selectedBandIndex, 'single_band');

    const sepArcsec = angularSeparationArcsec(posA, posB);
    const deltaFlux = Math.abs(fluxB - fluxA);

    // Astronomical Detection Criteria:
    // 1. Astrometric motion: separation > 0.4 arcsec over baseline
    // 2. Photometric variability: deltaFlux > 40 mJy
    if (sepArcsec > 0.4 || deltaFlux > 45) {
      let classification = 'High Proper Motion Candidate';
      if (star.id === 'wise-0855') {
        classification = 'Cold Y-Dwarf (High PM + Parallax)';
      } else if (star.id === 'epsilon-indi-b' || star.id === 'epsilon-indi-bb') {
        classification = 'Binary Brown Dwarf System';
      } else if (star.id === 'barnards-star') {
        classification = 'High Proper Motion M-Dwarf';
      } else if (star.id === 'asteroid-2024-yr4') {
        classification = 'Fast-Moving Solar System Asteroid';
      } else if (star.id === 'rw-aurigae') {
        classification = 'T Tauri Disk Occultation Variable';
      } else if (star.id === 'r-draconis') {
        classification = 'Mira Pulsating Red Giant Variable';
      } else if (star.id === 'supernova-sn2025pht') {
        classification = 'Extragalactic Supernova Transient';
      } else if (star.temperatureK < 1500) {
        classification = 'Cold Brown Dwarf Candidate';
      }

      const snr = Math.min(99.9, Math.max(3.2, (sepArcsec * 12) + (deltaFlux / 30)));

      candidates.push({
        id: `DIPOLE-${star.id.toUpperCase()}`,
        ra: posB.ra,
        dec: posB.dec,
        raStr: degreesToSexagesimalRA(posB.ra),
        decStr: degreesToSexagesimalDec(posB.dec),
        deltaArcsec: sepArcsec,
        snr: Number(snr.toFixed(1)),
        classification,
        posA: { x: posA.ra, y: posA.dec },
        posB: { x: posB.ra, y: posB.dec },
        starRef: star,
      });
    }
  });

  return candidates.sort((a, b) => b.snr - a.snr);
}
