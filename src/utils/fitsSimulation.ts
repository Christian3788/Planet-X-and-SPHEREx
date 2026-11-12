/**
 * SPHEREx SkyShift Astronomical Simulation & Raster Processing Engine
 * Simulates high-fidelity multi-epoch SPHEREx NIR sky fields, Point Spread Functions (PSF),
 * astrometric shifts (proper motion + parallax), variability, and 102-band spectral SEDs.
 */

import {
  CelestialCoordinate,
  StarObject,
  ContaminationFlag,
  ColormapOption,
  StretchOption,
  DisplayMode,
  TargetPreset,
  GeneratedField,
} from '../types/astronomy';
import { SPHEREX_BANDS, SPHEREX_SURVEY_EPOCHS, MOLECULAR_ICE_MARKERS } from '../data/spectralBands';
import { BENCHMARK_TARGETS } from '../data/spherexTargets';

// Pseudo-random deterministic generator for consistent star fields from RA/Dec coordinates
function createSeededRandom(seed: number) {
  let s = Math.sin(seed) * 10000;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * Finds if the coordinate is near any benchmark target (within 0.1 degree)
 */
export function findMatchingBenchmark(ra: number, dec: number): TargetPreset | undefined {
  return BENCHMARK_TARGETS.find((target) => {
    const dRa = Math.abs(target.ra - ra) * Math.cos((dec * Math.PI) / 180);
    const dDec = Math.abs(target.dec - dec);
    const dist = Math.sqrt(dRa * dRa + dDec * dDec);
    return dist < 0.2; // Within ~12 arcmin
  });
}

/**
 * Generates the astronomical objects in the field of view based on coordinates and FOV
 */
export function generateSkyField(
  ra: number,
  dec: number,
  fovArcmin: number
): GeneratedField {
  const matchingTarget = findMatchingBenchmark(ra, dec);
  // Seed based on integer coordinate hash
  const coordHash = Math.abs(Math.sin(ra * 1000 + dec * 700)) * 100000;
  const rand = createSeededRandom(coordHash);

  const stars: StarObject[] = [];
  const contaminants: ContaminationFlag[] = [];

  const fovDeg = fovArcmin / 60;
  const halfFov = fovDeg / 2;

  // Add the primary target object if present, or create a target object at center
  if (matchingTarget) {
    stars.push({
      id: matchingTarget.id,
      name: matchingTarget.name,
      baseRa: matchingTarget.ra,
      baseDec: matchingTarget.dec,
      properMotionRa: matchingTarget.properMotionRa,
      properMotionDec: matchingTarget.properMotionDec,
      parallax: matchingTarget.parallax,
      baseMagNIR: matchingTarget.magnitudeNIR,
      spectralType: matchingTarget.spectralClass,
      temperatureK: matchingTarget.temperatureK,
      isTarget: true,
      isVariable: matchingTarget.isVariable,
      variabilityType: matchingTarget.type === 'supernova' ? 'supernova' : matchingTarget.id === 'r-draconis' ? 'mira' : matchingTarget.id === 'rw-aurigae' ? 't_tauri' : 'none',
      variabilityPeriodDays: matchingTarget.variabilityPeriodDays,
      variabilityAmplitudeMag: matchingTarget.variabilityAmplitudeMag,
      variabilityPhase: matchingTarget.variabilityPhaseOffset || 0,
      h2oIce: matchingTarget.id === 'wise-0855' || matchingTarget.id === 'epsilon-indi-b' ? 0.85 : 0.15,
      co2Ice: matchingTarget.id === 'wise-0855' ? 0.45 : 0.05,
      coIce: matchingTarget.id === 'r-draconis' ? 0.7 : 0.1,
      methane: matchingTarget.id === 'epsilon-indi-b' ? 0.95 : matchingTarget.id === 'wise-0855' ? 0.8 : 0.0,
      silicates: matchingTarget.id === 'rw-aurigae' ? 0.85 : 0.1,
    });

    // If Epsilon Indi B, add its binary companion Bb!
    if (matchingTarget.id === 'epsilon-indi-b') {
      stars.push({
        id: 'epsilon-indi-bb',
        name: 'Epsilon Indi Bb (Companion T6)',
        baseRa: matchingTarget.ra + 0.00021, // ~0.7 arcsec separation
        baseDec: matchingTarget.dec - 0.00018,
        properMotionRa: matchingTarget.properMotionRa + 40,
        properMotionDec: matchingTarget.properMotionDec - 30,
        parallax: matchingTarget.parallax,
        baseMagNIR: matchingTarget.magnitudeNIR + 1.2,
        spectralType: 'T6.0 Brown Dwarf',
        temperatureK: 950,
        isTarget: false,
        h2oIce: 0.9,
        co2Ice: 0.5,
        coIce: 0.1,
        methane: 0.98,
        silicates: 0.05,
      });

      // Add parent primary star Epsilon Indi A in the wider field
      stars.push({
        id: 'epsilon-indi-a',
        name: 'Epsilon Indi A (Primary K5V)',
        baseRa: matchingTarget.ra - 0.0042, // ~15 arcsec separation
        baseDec: matchingTarget.dec + 0.0035,
        properMotionRa: matchingTarget.properMotionRa,
        properMotionDec: matchingTarget.properMotionDec,
        parallax: matchingTarget.parallax,
        baseMagNIR: 2.8,
        spectralType: 'K5V Orange Dwarf',
        temperatureK: 4600,
        h2oIce: 0.0,
        co2Ice: 0.0,
        coIce: 0.1,
        methane: 0.0,
        silicates: 0.0,
      });
    }
  }

  // Populate background stars and distant reference galaxies
  const numStars = Math.floor(45 + rand() * 40);
  for (let i = 0; i < numStars; i++) {
    const starRa = ra + (rand() - 0.5) * fovDeg;
    const starDec = dec + (rand() - 0.5) * fovDeg;

    // Distant background stars have almost zero proper motion (< 5 mas/yr)
    const pmRa = (rand() - 0.5) * 8;
    const pmDec = (rand() - 0.5) * 8;
    const plx = rand() * 3; // tiny parallax
    const mag = 7 + rand() * 8.5; // magnitude 7 to 15.5
    const temp = 2800 + rand() * 6500; // 2800K to 9300K

    stars.push({
      id: `bg-star-${i}`,
      baseRa: starRa,
      baseDec: starDec,
      properMotionRa: pmRa,
      properMotionDec: pmDec,
      parallax: plx,
      baseMagNIR: mag,
      spectralType: temp > 6000 ? 'F/G Dwarf' : temp > 4000 ? 'K Dwarf' : 'M Dwarf',
      temperatureK: Math.round(temp),
      h2oIce: rand() * 0.2,
      co2Ice: rand() * 0.1,
      coIce: rand() * 0.15,
      methane: 0,
      silicates: rand() * 0.2,
    });
  }

  // Add realistic contamination artifacts (cosmic ray strikes, bad detector pixels, stray light)
  // Cosmic ray on Epoch 2
  contaminants.push({
    id: 'cr-1',
    x: 0.35 + rand() * 0.3,
    y: 0.25 + rand() * 0.5,
    type: 'cosmic_ray',
    label: 'Single-Pass Cosmic Ray Transient',
    severity: 'medium',
    epochAffected: [2],
  });

  // Hot detector pixel (present in all epochs)
  contaminants.push({
    id: 'bp-1',
    x: 0.82,
    y: 0.74,
    type: 'bad_pixel',
    label: 'Detector Array 4 Hot Pixel Flag',
    severity: 'low',
    epochAffected: [1, 2, 3, 4],
  });

  return {
    stars,
    contaminants,
    centerRa: ra,
    centerDec: dec,
    fovArcmin,
    activeTarget: matchingTarget,
  };
}

/**
 * Computes celestial position of a star for a given SPHEREx survey epoch
 * Includes proper motion linear march and annual parallax wobble!
 */
export function calculateStarPositionAtEpoch(
  star: StarObject,
  epoch: number // 1, 2, 3, 4
): { ra: number; dec: number; deltaRaArcsec: number; deltaDecArcsec: number } {
  const epochData = SPHEREX_SURVEY_EPOCHS.find((e) => e.epochId === epoch) || SPHEREX_SURVEY_EPOCHS[0];
  const deltaYears = epochData.decimalYear - 2025.42; // baseline from Pass 1

  // Handle fast solar system asteroid motion if present
  if (star.isTarget && star.id === 'asteroid-2024-yr4') {
    // Asteroid moves significantly across 6-month survey sweeps
    const arcsecShift = (epoch - 1) * 38.0; // 38 arcsec per pass
    const degShift = arcsecShift / 3600;
    return {
      ra: star.baseRa + degShift,
      dec: star.baseDec + degShift * 0.6,
      deltaRaArcsec: arcsecShift,
      deltaDecArcsec: arcsecShift * 0.6,
    };
  }

  // Astrometric Proper Motion:
  // delta RA (arcsec) = (pmRA * deltaYears) / 1000
  // delta Dec (arcsec) = (pmDec * deltaYears) / 1000
  const pmRaArcsec = (star.properMotionRa * deltaYears) / 1000;
  const pmDecArcsec = (star.properMotionDec * deltaYears) / 1000;

  // Parallax wobble:
  // Earth's position in orbit creates semi-annual elliptical wobble
  // SPHEREx Pass 1 & 3 are in May (solar longitude ~60°), Pass 2 & 4 are in November (solar longitude ~240°)
  const orbitPhase = deltaYears * 2 * Math.PI;
  const parallaxArcsec = (star.parallax / 1000) * Math.sin(orbitPhase);

  const totalDeltaRaArcsec = pmRaArcsec + parallaxArcsec;
  const totalDeltaDecArcsec = pmDecArcsec + parallaxArcsec * 0.5;

  const cosDec = Math.cos((star.baseDec * Math.PI) / 180);
  const deltaRaDeg = totalDeltaRaArcsec / (3600 * (cosDec || 1));
  const deltaDecDeg = totalDeltaDecArcsec / 3600;

  return {
    ra: star.baseRa + deltaRaDeg,
    dec: star.baseDec + deltaDecDeg,
    deltaRaArcsec: totalDeltaRaArcsec,
    deltaDecArcsec: totalDeltaDecArcsec,
  };
}

/**
 * Computes observed flux for a star in a given epoch and spectral band
 */
export function calculateStarFlux(
  star: StarObject,
  epoch: number,
  bandIndex: number,
  displayMode: DisplayMode
): number {
  const band = SPHEREX_BANDS.find((b) => b.bandIndex === bandIndex) || SPHEREX_BANDS[50];
  const wavelength = band.centerWavelengthUm;

  // Baseline flux from NIR magnitude (standard Pogson relation: Flux ~ 10^(-0.4 * mag))
  let baseFlux = Math.pow(10, -0.4 * (star.baseMagNIR - 10)) * 1000; // in mJy scale

  // Spectral Energy Distribution (SED) modulation based on Planck function approximation:
  // Cold brown dwarfs (WISE 0855 at 250K) peak at ~4.5 - 5.0 µm!
  // M-dwarfs (3100K) peak around 1.0 - 1.6 µm.
  const tempK = star.temperatureK;
  // Wien's displacement: lambda_peak = 2898 / T (in microns)
  const lambdaPeak = 2898 / Math.max(200, tempK);
  
  // Normalized Planck shape
  const x = wavelength / lambdaPeak;
  let spectralFactor = (1 / Math.pow(x, 5)) / (Math.exp(Math.min(10, 4.965 / x)) - 1);
  spectralFactor = Math.max(0.02, Math.min(4.0, spectralFactor * 70));

  // If cold brown dwarf like WISE 0855, dramatically suppress short wavelengths (< 3.0 µm)
  if (tempK < 500) {
    if (wavelength < 2.5) {
      spectralFactor *= 0.02; // Virtually invisible in optical & Arrays 1-2
    } else if (wavelength < 3.8) {
      spectralFactor *= 0.25;
    } else {
      spectralFactor *= 3.5; // Blazing bright in SPHEREx Arrays 5 & 6!
    }
  }

  // Molecular absorption dips:
  // Water ice absorption at 3.05 µm (Array 4)
  if (star.h2oIce > 0 && Math.abs(wavelength - 3.05) < 0.4) {
    const dip = star.h2oIce * (1 - Math.abs(wavelength - 3.05) / 0.4) * 0.75;
    spectralFactor *= (1 - dip);
  }
  // Methane absorption at 1.66 µm and 2.20 µm (Array 3)
  if (star.methane > 0) {
    if (Math.abs(wavelength - 1.66) < 0.15) {
      spectralFactor *= (1 - star.methane * 0.65);
    }
    if (Math.abs(wavelength - 2.20) < 0.2) {
      spectralFactor *= (1 - star.methane * 0.7);
    }
  }
  // CO2 ice absorption at 4.27 µm (Array 5)
  if (star.co2Ice > 0 && Math.abs(wavelength - 4.27) < 0.18) {
    spectralFactor *= (1 - star.co2Ice * 0.6);
  }
  // CO ice absorption at 4.67 µm (Array 6)
  if (star.coIce > 0 && Math.abs(wavelength - 4.67) < 0.15) {
    spectralFactor *= (1 - star.coIce * 0.55);
  }

  // Variability modulation across epochs:
  if (star.isVariable) {
    const epochData = SPHEREX_SURVEY_EPOCHS.find((e) => e.epochId === epoch) || SPHEREX_SURVEY_EPOCHS[0];
    const daysSinceEpoch1 = (epochData.decimalYear - 2025.42) * 365.25;
    const period = star.variabilityPeriodDays || 250;
    const amp = star.variabilityAmplitudeMag || 2.0;
    const phaseOffset = star.variabilityPhase || 0;

    if (star.variabilityType === 'mira') {
      // Periodic sinusoidal Mira pulsation
      const phase = (daysSinceEpoch1 / period + phaseOffset) * 2 * Math.PI;
      const magDelta = (Math.sin(phase) * amp) / 2;
      const varFactor = Math.pow(10, -0.4 * magDelta);
      baseFlux *= varFactor;
    } else if (star.variabilityType === 't_tauri') {
      // RW Aurigae erratic circumstellar disk occultation (deep dip in epoch 2)
      if (epoch === 2) {
        baseFlux *= 0.12; // deep dimming
      } else if (epoch === 3) {
        baseFlux *= 0.45; // partial recovery
      } else {
        baseFlux *= 1.1; // bright state
      }
    } else if (star.variabilityType === 'supernova') {
      // Supernova explosion: dim in epoch 1, massive flash in epoch 2, fading in 3 and 4
      if (epoch === 1) {
        baseFlux *= 0.01;
      } else if (epoch === 2) {
        baseFlux *= 8.0; // peak supernova explosion!
      } else if (epoch === 3) {
        baseFlux *= 2.2;
      } else {
        baseFlux *= 0.6;
      }
    }
  }

  // Display mode adjustments:
  if (displayMode === 'all_bands_coadd') {
    // Sum over all 102 bands provides maximum SNR (~10x boost)
    return baseFlux * spectralFactor * 1.5;
  } else if (displayMode === 'array_coadd') {
    return baseFlux * spectralFactor * 1.1;
  }

  return baseFlux * spectralFactor;
}

/**
 * Extracts the full 102-band spectrum (SED) for a star
 */
export function extract102BandSpectrum(
  star: StarObject,
  epoch: number
): { wavelengthUm: number; fluxMjy: number; bandIndex: number; array: number; label: string }[] {
  return SPHEREX_BANDS.map((band) => {
    const flux = calculateStarFlux(star, epoch, band.bandIndex, 'single_band');
    return {
      wavelengthUm: band.centerWavelengthUm,
      fluxMjy: Number(flux.toFixed(2)),
      bandIndex: band.bandIndex,
      array: band.detectorArray,
      label: band.label,
    };
  });
}

/**
 * Maps normalized intensity [0, 1] to RGB values based on colormap
 */
export function applyColormap(
  value: number,
  colormap: ColormapOption,
  isNegativeDipole: boolean = false
): [number, number, number] {
  // Clamp
  const v = Math.max(0, Math.min(1, value));

  if (colormap === 'inverted_astronomy') {
    // Inverted: Background is white/light-gray (245, 247, 250), Stars are dark ink (15, 23, 42)
    const val = Math.round(245 - v * 235);
    return [val, val, val];
  }

  if (colormap === 'deep_space') {
    // Traditional dark space: Background is black/obsidian (8, 12, 22), Stars are bright white-cyan
    const r = Math.round(8 + v * 247);
    const g = Math.round(12 + v * 243);
    const b = Math.round(22 + v * 233);
    return [r, g, b];
  }

  if (colormap === 'magma') {
    // Magma ramp: Black -> Dark Purple -> Red-Orange -> Yellow -> White
    let r = 0, g = 0, b = 0;
    if (v < 0.25) {
      const t = v / 0.25;
      r = Math.round(10 + t * 60);
      g = Math.round(5 + t * 10);
      b = Math.round(20 + t * 80);
    } else if (v < 0.5) {
      const t = (v - 0.25) / 0.25;
      r = Math.round(70 + t * 120);
      g = Math.round(15 + t * 25);
      b = Math.round(100 - t * 40);
    } else if (v < 0.75) {
      const t = (v - 0.5) / 0.25;
      r = Math.round(190 + t * 55);
      g = Math.round(40 + t * 110);
      b = Math.round(60 - t * 20);
    } else {
      const t = (v - 0.75) / 0.25;
      r = Math.round(245 + t * 10);
      g = Math.round(150 + t * 105);
      b = Math.round(40 + t * 215);
    }
    return [r, g, b];
  }

  if (colormap === 'viridis') {
    // Viridis: Purple -> Blue -> Green -> Yellow
    let r = 0, g = 0, b = 0;
    if (v < 0.33) {
      const t = v / 0.33;
      r = Math.round(68 - t * 30);
      g = Math.round(1 + t * 90);
      b = Math.round(84 + t * 50);
    } else if (v < 0.66) {
      const t = (v - 0.33) / 0.33;
      r = Math.round(38 + t * 20);
      g = Math.round(91 + t * 90);
      b = Math.round(134 - t * 40);
    } else {
      const t = (v - 0.66) / 0.34;
      r = Math.round(58 + t * 195);
      g = Math.round(181 + t * 74);
      b = Math.round(94 - t * 60);
    }
    return [r, g, b];
  }

  if (colormap === 'infrared_heat') {
    // SPHEREx False Color: Deep Navy -> Laser Cyan -> Amber -> White
    let r = Math.round(v * 255);
    let g = Math.round(Math.pow(v, 1.4) * 220 + v * 35);
    let b = Math.round(Math.sin(v * Math.PI) * 180 + v * 120);
    return [Math.min(255, r), Math.min(255, g), Math.min(255, b)];
  }

  if (colormap === 'difference_bipolar') {
    // For difference subtraction:
    // Positive excess (Epoch B brighter) -> Electric Orange/Red
    // Negative excess (Epoch A brighter / old position) -> Laser Cyan/Blue
    // Zero baseline -> Flat Slate Gray (40, 48, 64)
    if (isNegativeDipole) {
      // Negative deficit (displaced old position)
      const r = Math.round(20 + (1 - v) * 20);
      const g = Math.round(120 + v * 100);
      const b = Math.round(200 + v * 55);
      return [r, g, b];
    } else {
      // Positive excess (new position or flared star)
      const r = Math.round(220 + v * 35);
      const g = Math.round(90 + v * 100);
      const b = Math.round(20 + v * 30);
      return [r, g, b];
    }
  }

  return [Math.round(v * 255), Math.round(v * 255), Math.round(v * 255)];
}

/**
 * Applies mathematical astronomical stretch to dynamic range
 */
export function applyStretch(normalizedVal: number, stretch: StretchOption): number {
  const v = Math.max(0, Math.min(1, normalizedVal));
  switch (stretch) {
    case 'linear':
      return v;
    case 'asinh':
      // Asinh stretch is the gold standard for astronomical imagery (Lupton et al.)
      // It preserves faint background galaxy structures while preventing bright star core saturation
      const a = 10;
      return Math.asinh(a * v) / Math.asinh(a);
    case 'sqrt':
      return Math.sqrt(v);
    case 'log':
      return Math.log10(1 + 9 * v);
    default:
      return v;
  }
}
