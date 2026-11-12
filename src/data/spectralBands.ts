/**
 * NASA SPHEREx Mission Spectral Bands Definition
 * 102 Near-Infrared Spectral Bands spanning 0.75 µm to 5.0 µm
 * Divided across 6 linear variable filter (LVF) detector arrays
 */

import { SpectralBandInfo } from '../types/astronomy';

// Generate 102 spectral channels matching the SPHEREx instrument profile
// Array 1: 0.75 - 1.11 µm (Bands 1 - 17) -> Resolving power R ~ 41
// Array 2: 1.11 - 1.64 µm (Bands 18 - 34) -> Resolving power R ~ 41
// Array 3: 1.64 - 2.42 µm (Bands 35 - 51) -> Resolving power R ~ 41
// Array 4: 2.42 - 3.82 µm (Bands 52 - 68) -> Resolving power R ~ 35
// Array 5: 3.82 - 4.42 µm (Bands 69 - 85) -> Resolving power R ~ 110 (Deep CO2 Ice study)
// Array 6: 4.42 - 5.00 µm (Bands 86 - 102) -> Resolving power R ~ 130 (CO Ice & cold brown dwarf thermal)

export interface DetectorArraySpec {
  arrayId: 1 | 2 | 3 | 4 | 5 | 6;
  name: string;
  minWavelengthUm: number;
  maxWavelengthUm: number;
  pixelScaleArcsec: number; // 6.2 arcsec/pixel
  resolvingPower: number;
  primaryScience: string;
  bandsRange: [number, number];
}

export const DETECTOR_ARRAYS: DetectorArraySpec[] = [
  {
    arrayId: 1,
    name: 'Array 1 (Optical/NIR)',
    minWavelengthUm: 0.75,
    maxWavelengthUm: 1.11,
    pixelScaleArcsec: 6.2,
    resolvingPower: 41,
    primaryScience: 'Stellar continuum, Paschen hydrogen series, hot star classification',
    bandsRange: [1, 17],
  },
  {
    arrayId: 2,
    name: 'Array 2 (Near-IR J-Band)',
    minWavelengthUm: 1.11,
    maxWavelengthUm: 1.64,
    pixelScaleArcsec: 6.2,
    resolvingPower: 41,
    primaryScience: '1.4 µm H2O gas/vapor absorption, low-mass M & L dwarfs',
    bandsRange: [18, 34],
  },
  {
    arrayId: 3,
    name: 'Array 3 (Near-IR H & K Bands)',
    minWavelengthUm: 1.64,
    maxWavelengthUm: 2.42,
    pixelScaleArcsec: 6.2,
    resolvingPower: 41,
    primaryScience: '1.66 µm CH4 methane, 2.0 µm CO, 2.166 µm Brackett-gamma accretion',
    bandsRange: [35, 51],
  },
  {
    arrayId: 4,
    name: 'Array 4 (Mid-IR Water Ice)',
    minWavelengthUm: 2.42,
    maxWavelengthUm: 3.82,
    pixelScaleArcsec: 6.2,
    resolvingPower: 35,
    primaryScience: '3.05 µm H2O water ice broad absorption band, 3.3 µm PAH emissions',
    bandsRange: [52, 68],
  },
  {
    arrayId: 5,
    name: 'Array 5 (CO2 Ice High-Res)',
    minWavelengthUm: 3.82,
    maxWavelengthUm: 4.42,
    pixelScaleArcsec: 6.2,
    resolvingPower: 110,
    primaryScience: '4.27 µm CO2 ice deep absorption, interstellar dust grain mantles',
    bandsRange: [69, 85],
  },
  {
    arrayId: 6,
    name: 'Array 6 (CO Ice & Y-Dwarf Thermal)',
    minWavelengthUm: 4.42,
    maxWavelengthUm: 5.00,
    pixelScaleArcsec: 6.2,
    resolvingPower: 130,
    primaryScience: '4.67 µm CO ice absorption, ultra-cold Y-type brown dwarf thermal emission',
    bandsRange: [86, 102],
  },
];

export const MOLECULAR_ICE_MARKERS = [
  { name: 'CH4 (Methane)', wavelengthUm: 1.66, array: 3, color: '#38bdf8' },
  { name: 'CO (Gas)', wavelengthUm: 2.00, array: 3, color: '#a78bfa' },
  { name: 'Br-γ (H Accretion)', wavelengthUm: 2.166, array: 3, color: '#fb7185' },
  { name: 'CH4 (Methane K-band)', wavelengthUm: 2.20, array: 3, color: '#38bdf8' },
  { name: 'H2O Ice (Water Ice)', wavelengthUm: 3.05, array: 4, color: '#06b6d4' },
  { name: 'PAH (Organic dust)', wavelengthUm: 3.30, array: 4, color: '#fbbf24' },
  { name: 'CO2 Ice (Carbon Dioxide)', wavelengthUm: 4.27, array: 5, color: '#f43f5e' },
  { name: 'CO Ice (Carbon Monoxide)', wavelengthUm: 4.67, array: 6, color: '#ec4899' },
];

export function generateAll102Bands(): SpectralBandInfo[] {
  const bands: SpectralBandInfo[] = [];

  DETECTOR_ARRAYS.forEach((arr) => {
    const numBands = arr.bandsRange[1] - arr.bandsRange[0] + 1;
    const step = (arr.maxWavelengthUm - arr.minWavelengthUm) / numBands;

    for (let i = 0; i < numBands; i++) {
      const bandIdx = arr.bandsRange[0] + i;
      const center = arr.minWavelengthUm + step * (i + 0.5);
      const bandwidth = step;

      const matchingFeatures: string[] = [];
      MOLECULAR_ICE_MARKERS.forEach((marker) => {
        if (Math.abs(marker.wavelengthUm - center) <= step * 0.8) {
          matchingFeatures.push(marker.name);
        }
      });

      bands.push({
        bandIndex: bandIdx,
        detectorArray: arr.arrayId,
        centerWavelengthUm: Number(center.toFixed(3)),
        bandwidthUm: Number(bandwidth.toFixed(3)),
        label: `Band ${bandIdx} (${center.toFixed(2)} µm)`,
        keyMolecularFeatures: matchingFeatures,
      });
    }
  });

  return bands;
}

export const SPHEREX_BANDS = generateAll102Bands();

export const SPHEREX_SURVEY_EPOCHS = [
  { epochId: 1, label: 'Pass 1', dateString: 'May – Oct 2025', decimalYear: 2025.42, surveyPass: 1 },
  { epochId: 2, label: 'Pass 2', dateString: 'Nov 2025 – Apr 2026', decimalYear: 2025.92, surveyPass: 2 },
  { epochId: 3, label: 'Pass 3', dateString: 'May – Oct 2026', decimalYear: 2026.42, surveyPass: 3 },
  { epochId: 4, label: 'Pass 4', dateString: 'Nov 2026 – Apr 2027', decimalYear: 2026.92, surveyPass: 4 },
];
