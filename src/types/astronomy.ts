/**
 * SPHEREx SkyShift - Astronomy Data Types & Interfaces
 * NASA SPHEREx Mission: 102 NIR Spectral Bands across 6 Detector Arrays
 */

export interface CelestialCoordinate {
  ra: number; // Decimal degrees (0 to 360)
  dec: number; // Decimal degrees (-90 to +90)
}

export interface TargetPreset {
  id: string;
  name: string;
  subtitle: string;
  type: 'proper_motion' | 'brown_dwarf' | 'variable_star' | 'asteroid' | 'supernova';
  ra: number; // degrees
  dec: number; // degrees
  raStr: string; // Sexagesimal
  decStr: string; // Sexagesimal
  fovArcmin: number; // default FOV
  properMotionRa: number; // mas/yr (milliarcseconds per year)
  properMotionDec: number; // mas/yr
  parallax: number; // mas
  distanceLy: number; // Light years
  spectralClass: string;
  magnitudeNIR: number; // Apparent NIR magnitude (J/K band)
  description: string;
  scientificSignificance: string;
  features: string[];
  temperatureK: number; // Effective temperature for SED blackbody
  spectralAbsorptionLines: string[]; // e.g., ['H2O Ice (3.05µm)', 'CH4 (1.66µm)']
  isVariable?: boolean;
  variabilityType?: 'mira' | 't_tauri' | 'supernova' | 'none';
  variabilityPeriodDays?: number;
  variabilityAmplitudeMag?: number;
  variabilityPhaseOffset?: number;
  isSolarSystem?: boolean; // Fast moving asteroid/comet
  dailyMotionArcsec?: number; // arcsec/day
}

export interface GeneratedField {
  stars: StarObject[];
  contaminants: ContaminationFlag[];
  centerRa: number;
  centerDec: number;
  fovArcmin: number;
  activeTarget?: TargetPreset;
}

export interface SpherexEpoch {
  epochId: number; // 1, 2, 3, 4
  label: string; // "Pass 1 (2025.4)", etc.
  dateString: string; // "May – Oct 2025"
  decimalYear: number; // 2025.42
  surveyPass: number;
}

export interface SpectralBandInfo {
  bandIndex: number; // 1 to 102
  detectorArray: 1 | 2 | 3 | 4 | 5 | 6;
  centerWavelengthUm: number; // microns (0.75 - 5.0)
  bandwidthUm: number;
  label: string;
  keyMolecularFeatures: string[];
}

export type DisplayMode = 'single_band' | 'array_coadd' | 'all_bands_coadd' | 'rgb_composite';

export type EpochViewMode = 'single' | 'blink' | 'timelapse' | 'difference' | 'stacked_coadd';

export type ColormapOption = 'inverted_astronomy' | 'deep_space' | 'magma' | 'viridis' | 'infrared_heat' | 'difference_bipolar';

export type StretchOption = 'linear' | 'asinh' | 'sqrt' | 'log';

export type SurveyMissionBackdrop = 'spherex_only' | '2mass_nir' | 'wise_allwise' | 'dss_optical' | 'gaia_density';

export interface OverlayConfig {
  gaiaVectors: boolean;
  wiseCrosshairs: boolean;
  simbadLabels: boolean;
  contaminationFlags: boolean;
  coordinateGrid: boolean;
  scaleBar: boolean;
  crosshairProbe: boolean;
  backdropSurvey: SurveyMissionBackdrop;
  backdropOpacity: number; // 0 to 1
  autoDipoleBoxes: boolean;
}

export interface DetectedDipoleCandidate {
  id: string;
  ra: number;
  dec: number;
  raStr: string;
  decStr: string;
  deltaArcsec: number;
  snr: number;
  classification: string;
  posA: { x: number; y: number };
  posB: { x: number; y: number };
  starRef: StarObject;
}

export interface ContaminationFlag {
  id: string;
  x: number; // Pixel or relative coord
  y: number;
  type: 'cosmic_ray' | 'stray_light' | 'bad_pixel' | 'saturation';
  label: string;
  severity: 'low' | 'medium' | 'high';
  epochAffected: number[]; // e.g. [2] for single cosmic ray hit
}

export interface StarObject {
  id: string;
  name?: string;
  baseRa: number;
  baseDec: number;
  properMotionRa: number; // mas/yr
  properMotionDec: number; // mas/yr
  parallax: number; // mas
  baseMagNIR: number;
  spectralType: string;
  temperatureK: number;
  isTarget?: boolean;
  isVariable?: boolean;
  variabilityType?: 'mira' | 't_tauri' | 'supernova' | 'none';
  variabilityPeriodDays?: number;
  variabilityAmplitudeMag?: number;
  variabilityPhase?: number;
  isContaminant?: boolean;
  contaminantType?: string;
  // Molecular absorption features strength (0 to 1)
  h2oIce: number;
  co2Ice: number;
  coIce: number;
  methane: number;
  silicates: number;
}

export interface DiscoveryCandidate {
  id: string;
  timestamp: number;
  ra: number;
  dec: number;
  raStr: string;
  decStr: string;
  classification: 'Brown Dwarf Candidate' | 'Fast Moving Asteroid / Comet' | 'High Proper Motion Star' | 'Variable Star / Transient' | 'Unknown Anomaly';
  angularShiftArcsec: number;
  estimatedMotionPerYear: number; // mas/yr or arcsec/day
  epochsObserved: string;
  notes: string;
  userRating: 'High Confidence' | 'Needs Follow-Up' | 'Curious Anomaly';
  spectralNote?: string;
}

export interface MeasurementPoint {
  x: number;
  y: number;
  ra: number;
  dec: number;
  epoch: number;
}
