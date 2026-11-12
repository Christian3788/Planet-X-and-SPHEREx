/**
 * Astronomical Coordinate Transformations & Utilities
 * Supports J2000 Decimal Degrees & Sexagesimal notations (HH:MM:SS.s, DD:MM:SS.s, 08h55m10.831s -7d14m42.53s)
 */

import { CelestialCoordinate } from '../types/astronomy';

/**
 * Converts decimal degrees RA to sexagesimal format: 17h 57m 48.50s
 */
export function degreesToSexagesimalRA(raDeg: number): string {
  // Normalize to 0..360
  let norm = ((raDeg % 360) + 360) % 360;
  const hours = norm / 15;
  const h = Math.floor(hours);
  const remMinutes = (hours - h) * 60;
  const m = Math.floor(remMinutes);
  const s = (remMinutes - m) * 60;

  const hStr = h.toString().padStart(2, '0');
  const mStr = m.toString().padStart(2, '0');
  const sStr = s.toFixed(2).padStart(5, '0');

  return `${hStr}h ${mStr}m ${sStr}s`;
}

/**
 * Converts decimal degrees Dec to sexagesimal format: +04° 41' 36.2"
 */
export function degreesToSexagesimalDec(decDeg: number): string {
  const sign = decDeg < 0 ? '-' : '+';
  const abs = Math.abs(decDeg);
  const d = Math.floor(abs);
  const remMinutes = (abs - d) * 60;
  const m = Math.floor(remMinutes);
  const s = (remMinutes - m) * 60;

  const dStr = d.toString().padStart(2, '0');
  const mStr = m.toString().padStart(2, '0');
  const sStr = s.toFixed(2).padStart(5, '0');

  return `${sign}${dStr}° ${mStr}' ${sStr}"`;
}

/**
 * Parses user input string for Right Ascension.
 * Accepts:
 * - Decimal degrees (e.g. "269.452", "133.795")
 * - Sexagesimal "17h 57m 48.498s" or "08h55m10.831s"
 * - Colon delimited "17:57:48.5"
 * - Space delimited "17 57 48.5"
 */
export function parseRightAscension(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try pure numeric decimal degrees
  const num = Number(trimmed);
  if (!isNaN(num) && num >= 0 && num <= 360) {
    return num;
  }

  // Regex for 08h55m10.831s or 17h 57m 48.5s
  const hmsRegex = /^(?:(\d{1,2})\s*h)?\s*(?:(\d{1,2})\s*m)?\s*(?:([\d.]+)\s*s)?$/i;
  const matchHms = trimmed.match(hmsRegex);
  if (matchHms && (matchHms[1] || matchHms[2] || matchHms[3])) {
    const h = parseFloat(matchHms[1] || '0');
    const m = parseFloat(matchHms[2] || '0');
    const s = parseFloat(matchHms[3] || '0');
    if (h >= 0 && h < 24 && m >= 0 && m < 60 && s >= 0 && s < 60) {
      return (h + m / 60 + s / 3600) * 15;
    }
  }

  // Colon or space separated e.g. "17:57:48.5" or "17 57 48.5"
  const parts = trimmed.split(/[:\s]+/).filter(Boolean);
  if (parts.length >= 2 && parts.length <= 3) {
    const h = parseFloat(parts[0]);
    const m = parseFloat(parts[1]);
    const s = parts[2] ? parseFloat(parts[2]) : 0;
    if (!isNaN(h) && !isNaN(m) && !isNaN(s) && h >= 0 && h < 24 && m >= 0 && m < 60 && s >= 0 && s < 60) {
      return (h + m / 60 + s / 3600) * 15;
    }
  }

  return null;
}

/**
 * Parses user input string for Declination.
 * Accepts:
 * - Decimal degrees (e.g. "+4.693", "-7.245")
 * - Sexagesimal "+04° 41' 36.2"" or "-7d14m42.53s" or "+04d41m36s"
 * - Colon delimited "+04:41:36.2" or "-07:14:42.5"
 * - Space delimited "-07 14 42.5"
 */
export function parseDeclination(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try pure numeric decimal degrees
  const num = Number(trimmed);
  if (!isNaN(num) && num >= -90 && num <= 90) {
    return num;
  }

  const isNegative = trimmed.startsWith('-') || /^-/.test(trimmed);
  const cleanInput = trimmed.replace(/^[+-]/, '').trim();

  // Pattern for -7d14m42.53s or 04° 41' 36"
  const dmsRegex = /^(?:(\d{1,2})\s*(?:[d°]))?\s*(?:(\d{1,2})\s*(?:[m']))?\s*(?:([\d.]+)\s*(?:[s"]))?$/i;
  const matchDms = cleanInput.match(dmsRegex);
  if (matchDms && (matchDms[1] || matchDms[2] || matchDms[3])) {
    const d = parseFloat(matchDms[1] || '0');
    const m = parseFloat(matchDms[2] || '0');
    const s = parseFloat(matchDms[3] || '0');
    if (d >= 0 && d <= 90 && m >= 0 && m < 60 && s >= 0 && s < 60) {
      const val = d + m / 60 + s / 3600;
      return isNegative ? -val : val;
    }
  }

  // Colon or space separated e.g. "+04:41:36.2" or "-07 14 42.53"
  const parts = cleanInput.split(/[:\s]+/).filter(Boolean);
  if (parts.length >= 2 && parts.length <= 3) {
    const d = parseFloat(parts[0]);
    const m = parseFloat(parts[1]);
    const s = parts[2] ? parseFloat(parts[2]) : 0;
    if (!isNaN(d) && !isNaN(m) && !isNaN(s) && d >= 0 && d <= 90 && m >= 0 && m < 60 && s >= 0 && s < 60) {
      const val = d + m / 60 + s / 3600;
      return isNegative ? -val : val;
    }
  }

  return null;
}

/**
 * Calculates great circle angular separation in arcseconds between two celestial coordinates.
 * Using Haversine formula for numerical stability at small separations.
 */
export function angularSeparationArcsec(coord1: CelestialCoordinate, coord2: CelestialCoordinate): number {
  const deg2rad = Math.PI / 180;
  const ra1 = coord1.ra * deg2rad;
  const dec1 = coord1.dec * deg2rad;
  const ra2 = coord2.ra * deg2rad;
  const dec2 = coord2.dec * deg2rad;

  const dRa = ra2 - ra1;
  const dDec = dec2 - dec1;

  const a =
    Math.sin(dDec / 2) * Math.sin(dDec / 2) +
    Math.cos(dec1) * Math.cos(dec2) * Math.sin(dRa / 2) * Math.sin(dRa / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  // Radians to arcseconds
  return c * (180 / Math.PI) * 3600;
}

/**
 * Computes Position Angle (PA) in degrees East of North from point 1 to point 2.
 */
export function positionAngleDegrees(coord1: CelestialCoordinate, coord2: CelestialCoordinate): number {
  const deg2rad = Math.PI / 180;
  const ra1 = coord1.ra * deg2rad;
  const dec1 = coord1.dec * deg2rad;
  const ra2 = coord2.ra * deg2rad;
  const dec2 = coord2.dec * deg2rad;

  const dRa = ra2 - ra1;
  const y = Math.sin(dRa);
  const x = Math.cos(dec1) * Math.tan(dec2) - Math.sin(dec1) * Math.cos(dRa);

  let paRad = Math.atan2(y, x);
  let paDeg = paRad * (180 / Math.PI);
  return (paDeg + 360) % 360;
}

/**
 * Reads initial astronomical state from URL query parameters.
 */
export function getAstronomicalParamsFromURL(): {
  ra?: number;
  dec?: number;
  fov?: number;
  target?: string;
  epoch?: number;
} {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const raParam = params.get('ra');
  const decParam = params.get('dec');
  const fovParam = params.get('fov');
  const targetParam = params.get('target');
  const epochParam = params.get('epoch');

  return {
    ra: raParam ? parseFloat(raParam) : undefined,
    dec: decParam ? parseFloat(decParam) : undefined,
    fov: fovParam ? parseFloat(fovParam) : undefined,
    target: targetParam || undefined,
    epoch: epochParam ? parseInt(epochParam, 10) : undefined,
  };
}

/**
 * Updates browser URL query parameters without reloading.
 */
export function updateURLWithCoordinates(
  ra: number,
  dec: number,
  fov: number,
  targetId?: string,
  epoch?: number
): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('ra', ra.toFixed(5));
  url.searchParams.set('dec', dec.toFixed(5));
  url.searchParams.set('fov', fov.toString());
  if (targetId) {
    url.searchParams.set('target', targetId);
  } else {
    url.searchParams.delete('target');
  }
  if (epoch) {
    url.searchParams.set('epoch', epoch.toString());
  }
  window.history.replaceState({}, '', url.toString());
}
