/**
 * NASA SPHEREx SkyShift - Benchmark Test Objects & Scientific Target Library
 * Specifically includes:
 * 1. Barnard's Star (Fastest known proper motion star)
 * 2. Epsilon Indi B (Binary brown dwarfs orbiting a star)
 * 3. WISE 0855-0714 (Fast-moving coldest sub-brown dwarf: RA 08h55m10.831s, Dec -7d14m42.53s)
 * 4. RW Aurigae (Young stellar object with dramatic disk obscuration variability)
 * 5. R Draconis (Mira-type pulsating red giant variable star)
 * Plus bonus planetary defense and transient targets.
 */

import { TargetPreset } from '../types/astronomy';

export const BENCHMARK_TARGETS: TargetPreset[] = [
  {
    id: 'barnards-star',
    name: "Barnard's Star",
    subtitle: 'High Proper Motion M-Dwarf Benchmark',
    type: 'proper_motion',
    ra: 269.45207, // 17h 57m 48.498s
    dec: 4.69339, // +04° 41' 36.208"
    raStr: '17h 57m 48.50s',
    decStr: "+04° 41' 36.21\"",
    fovArcmin: 7,
    properMotionRa: -802.8, // mas/yr
    properMotionDec: 10362.5, // mas/yr (10.36 arcsec/yr northward!)
    parallax: 546.98, // mas
    distanceLy: 5.96,
    spectralClass: 'M4.0V Red Dwarf',
    magnitudeNIR: 5.24, // J-band
    description:
      "The runaway star of the solar neighborhood. At 10.36 arcseconds per year, Barnard's Star possesses the highest apparent proper motion of any star in Earth's sky. Over SPHEREx's 6-month survey cadence, it jumps ~5.18 arcseconds between passes.",
    scientificSignificance:
      'Crucial astrometric calibration standard. Comparing Pass 1 to Pass 4 demonstrates an unmistakable 15+ arcsecond displacement against distant background galaxies.',
    features: ['Highest proper motion', 'Rapid northward drift', 'M-dwarf molecular TiO/H2O absorption'],
    temperatureK: 3130,
    spectralAbsorptionLines: ['H2O Vapor (1.4µm)', 'CO bandhead (2.3µm)', 'TiO optical bands'],
  },
  {
    id: 'epsilon-indi-b',
    name: 'Epsilon Indi B',
    subtitle: 'Binary Brown Dwarf System (T1 + T6)',
    type: 'brown_dwarf',
    ra: 331.04379, // 22h 04m 10.51s
    dec: -56.78272, // -56° 46' 57.8"
    raStr: '22h 04m 10.51s',
    decStr: "-56° 46' 57.80\"",
    fovArcmin: 7,
    properMotionRa: 3961.4, // mas/yr
    properMotionDec: -2538.3, // mas/yr (~4.7 arcsec/yr)
    parallax: 275.8, // mas
    distanceLy: 11.83,
    spectralClass: 'T1.5 + T6 Brown Dwarf Pair',
    magnitudeNIR: 11.2,
    description:
      'A tight binary system of two cold brown dwarfs (Ba and Bb) orbiting the K-dwarf star Epsilon Indi. Both components have masses below the hydrogen-burning limit (~47 and ~28 Jupiter masses).',
    scientificSignificance:
      'Spectacular test of SPHEREx near-infrared sensitivity. In Band 3 & 4 (1.6-3.3 µm), profound methane (CH4) and water vapor absorption troughs distinguish these brown dwarfs from ordinary stars.',
    features: ['High proper motion binary', 'Strong 1.66µm & 2.2µm CH4 absorption', 'Deep 3.0µm water absorption'],
    temperatureK: 1300,
    spectralAbsorptionLines: ['CH4 Methane (1.66µm)', 'CH4 Methane (2.2µm)', 'H2O (1.4µm & 1.9µm)', 'H2O Ice (3.05µm)'],
  },
  {
    id: 'wise-0855',
    name: 'WISE 0855-0714',
    subtitle: 'Coldest Sub-Brown Dwarf (Y2 Dwarf)',
    type: 'brown_dwarf',
    ra: 133.79513, // 08h 55m 10.831s
    dec: -7.24515, // -07° 14' 42.53"
    raStr: '08h 55m 10.83s',
    decStr: "-07° 14' 42.53\"",
    fovArcmin: 7,
    properMotionRa: -8132.0, // mas/yr (enormous motion!)
    properMotionDec: 684.0, // mas/yr
    parallax: 433.0, // mas
    distanceLy: 7.53,
    spectralClass: 'Y2 Cold Sub-Brown Dwarf',
    magnitudeNIR: 13.9, // Extremely faint in J/H, peaks in 4.5-5.0 µm!
    description:
      'Discovered by WISE in 2014, this is the coldest known astronomical body outside the solar system, with a temperature near freezing (250 K / -23°C). It is completely invisible in optical light but radiates strongly in SPHEREx Arrays 5 & 6 (4.0–5.0 µm).',
    scientificSignificance:
      'With ~8.1 arcsec/yr proper motion and massive parallax shift, WISE 0855 exhibits a dramatic looping trajectory between May and November SPHEREx passes. Its spectrum shows atmospheric water ice clouds!',
    features: ['Sub-freezing temperature (250 K)', 'Extreme proper motion', 'Atmospheric water ice clouds', 'Bright only in SPHEREx Bands 70-102'],
    temperatureK: 250,
    spectralAbsorptionLines: ['H2O Ice Clouds (3.05µm)', 'CH4 Methane (3.3µm)', 'CO2 (4.27µm trace)'],
  },
  {
    id: 'rw-aurigae',
    name: 'RW Aurigae',
    subtitle: 'T Tauri Binary with Circumstellar Tidal Disruption',
    type: 'variable_star',
    ra: 76.95642, // 05h 07m 49.54s
    dec: 30.40142, // +30° 24' 05.1"
    raStr: '05h 07m 49.54s',
    decStr: "+30° 24' 05.10\"",
    fovArcmin: 7,
    properMotionRa: 1.2,
    properMotionDec: -20.4,
    parallax: 6.12,
    distanceLy: 532,
    spectralClass: 'K1e Classical T Tauri',
    magnitudeNIR: 8.8,
    isVariable: true,
    variabilityPeriodDays: 450,
    variabilityAmplitudeMag: 2.4, // Dramatic 2.4 magnitude drop during occultations
    variabilityPhaseOffset: 0.25,
    description:
      'A young interacting binary system surrounded by complex protoplanetary gas streams and a tidally stripped circumstellar disk. RW Aurigae undergoes prolonged, multi-magnitude dimming events as inner dust filaments occult the central star.',
    scientificSignificance:
      'Difference imaging between SPHEREx passes highlights dramatic NIR flux swings. Mid-infrared bands capture the heated dust envelope and silicate grain evolution at 3–5 µm.',
    features: ['Protoplanetary disk occultation', 'Multi-magnitude NIR swings', 'Accretion Brackett-gamma line (2.166µm)'],
    temperatureK: 4800,
    spectralAbsorptionLines: ['Br-γ Accretion Emission (2.166µm)', 'Silicate Dust Absorption (9.7µm wing)', 'CO gas (2.3µm)'],
  },
  {
    id: 'r-draconis',
    name: 'R Draconis',
    subtitle: 'Mira-Type Pulsating Red Giant Variable',
    type: 'variable_star',
    ra: 248.16763, // 16h 32m 40.23s
    dec: 66.75506, // +66° 45' 18.2"
    raStr: '16h 32m 40.23s',
    decStr: "+66° 45' 18.20\"",
    fovArcmin: 7,
    properMotionRa: -8.8,
    properMotionDec: 12.4,
    parallax: 1.48,
    distanceLy: 2200,
    spectralClass: 'M5e - M8e Mira Variable',
    magnitudeNIR: 4.8,
    isVariable: true,
    variabilityPeriodDays: 245.6,
    variabilityAmplitudeMag: 3.5, // Enormous pulsation
    variabilityPhaseOffset: 0.7,
    description:
      'A classical Mira long-period pulsating red giant star. Over its 245.6-day pulsation cycle, its diameter expands and contracts by tens of millions of kilometers, creating spectacular infrared brightness swings across consecutive 6-month SPHEREx passes.',
    scientificSignificance:
      'In difference mode (Epoch 2 minus Epoch 1), R Draconis flashes with extreme positive or negative intensity. Its 102-band spectrum illustrates temperature-dependent TiO and water vapor opacity.',
    features: ['245-day Mira pulsation', '3.5 mag brightness swing', 'Molecular envelope oscillations'],
    temperatureK: 2600,
    spectralAbsorptionLines: ['H2O Vapor Bands (1.4µm & 1.9µm)', 'CO Bandhead (2.3µm - 2.4µm)', 'Deep TiO absorption'],
  },
  {
    id: 'asteroid-2024-yr4',
    name: 'Asteroid 2024 YR4',
    subtitle: 'Near-Earth Apollo Asteroid Rapid Crossing',
    type: 'asteroid',
    ra: 104.25000,
    dec: 18.80000,
    raStr: '06h 57m 00.00s',
    decStr: "+18° 48' 00.00\"",
    fovArcmin: 15,
    properMotionRa: 0,
    properMotionDec: 0,
    parallax: 0,
    distanceLy: 0.000018, // 1.1 million km
    spectralClass: 'S-Type Near-Earth Asteroid',
    magnitudeNIR: 13.5,
    isSolarSystem: true,
    dailyMotionArcsec: 420.0, // Moves hundreds of arcseconds per day!
    description:
      'A fast-moving near-Earth asteroid traversing the inner solar system. Between consecutive SPHEREx survey sweeps, solar system bodies traverse broad arcs across the celestial background.',
    scientificSignificance:
      'SPHEREx can discover hundreds of thousands of asteroids by their fast motion and determine their mineral composition and water/ice content from near-IR reflectance.',
    features: ['Solar system orbit', 'Linear trajectory across passes', 'Silicate & metal surface reflectance'],
    temperatureK: 290,
    spectralAbsorptionLines: ['Silicate Absorption (1.0µm & 2.0µm)', 'Hydroxide/Hydration band (2.7µm)'],
  },
  {
    id: 'supernova-sn2025pht',
    name: 'SN 2025pht Candidate',
    subtitle: 'Extragalactic Type Ia Supernova Transient',
    type: 'supernova',
    ra: 189.20000,
    dec: 13.15000,
    raStr: '12h 36m 48.00s',
    decStr: "+13° 09' 00.00\"",
    fovArcmin: 7,
    properMotionRa: 0,
    properMotionDec: 0,
    parallax: 0,
    distanceLy: 65000000, // Virgo Cluster galaxy
    spectralClass: 'Type Ia Supernova',
    magnitudeNIR: 14.1,
    isVariable: true,
    variabilityType: 'supernova',
    variabilityPeriodDays: 120,
    variabilityAmplitudeMag: 5.0, // Explodes and fades
    description:
      'A thermonuclear runaway explosion of a carbon-oxygen white dwarf in a distant spiral galaxy. Quiescent in Pass 1, explodes to peak brightness in Pass 2, and steadily declines through Passes 3 & 4.',
    scientificSignificance:
      'Difference imaging is the gold standard for discovering transient events like supernovae. Subtraction cleanly reveals the point-source flash atop the host galaxy.',
    features: ['Cosmological distance indicator', 'Transient light curve', 'Silicon II & Iron-peak NIR lines'],
    temperatureK: 8500,
    spectralAbsorptionLines: ['Si II (0.63µm)', 'Fe II & Co II NIR emission', 'Unreddened continuum'],
  },
];
