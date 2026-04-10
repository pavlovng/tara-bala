// Tara Bala/js/calculator.js

import { NAKSHATRAS, TARA_CLASSES, NAKSHATRA_SIZE, BOUNDARY_THRESHOLD_DEG } from './data.js';

export function normalize360(x) {
  return ((x % 360) + 360) % 360;
}

export function getNakshatraIndex(longitude) {
  return Math.floor(normalize360(longitude) / NAKSHATRA_SIZE);
}

export function getTaraNumber(janmaIndex, currentIndex) {
  return ((currentIndex - janmaIndex + 27) % 27) + 1;
}

export function getTaraClass(taraNumber) {
  return ((taraNumber - 1) % 9); // 0-based index into TARA_CLASSES
}

export function getNakshatra(index) {
  return NAKSHATRAS[index];
}

export function getTaraClassInfo(classIndex) {
  return TARA_CLASSES[classIndex];
}

export function checkBoundary(longitude) {
  const pos = normalize360(longitude) % NAKSHATRA_SIZE;
  const distFromStart = pos;
  const distFromEnd = NAKSHATRA_SIZE - pos;

  if (distFromStart < BOUNDARY_THRESHOLD_DEG) {
    return { isNearBoundary: true, direction: 'entering' };
  }
  if (distFromEnd < BOUNDARY_THRESHOLD_DEG) {
    return { isNearBoundary: true, direction: 'leaving' };
  }
  return { isNearBoundary: false, direction: null };
}

export async function findBoundaryTime(jdApprox, direction, getMoonLongitude) {
  // jdApprox — Julian Day near the boundary
  // direction — 'entering' (moon just entered) or 'leaving' (moon about to leave)
  // getMoonLongitude — async function(jd) => sidereal longitude

  const step = 1 / 1440; // 1 minute in JD

  let jdLow = jdApprox - 15 * step;
  let jdHigh = jdApprox + 15 * step;

  // Coarse: find the minute where the boundary is crossed
  let crossJD = null;
  for (let jd = jdLow; jd <= jdHigh; jd += step) {
    const prevLon = normalize360(await getMoonLongitude(jd - step));
    const currLon = normalize360(await getMoonLongitude(jd));
    const prevIdx = Math.floor(prevLon / NAKSHATRA_SIZE);
    const currIdx = Math.floor(currLon / NAKSHATRA_SIZE);

    if (prevIdx !== currIdx) {
      crossJD = jd;
      break;
    }
  }

  if (crossJD === null) return null;

  // Fine: binary search to second precision (~1/86400 JD)
  let lo = crossJD - step;
  let hi = crossJD;
  for (let i = 0; i < 20; i++) { // 20 iterations = sub-second precision
    const mid = (lo + hi) / 2;
    const midLon = normalize360(await getMoonLongitude(mid));
    const loLon = normalize360(await getMoonLongitude(lo));
    const loIdx = Math.floor(loLon / NAKSHATRA_SIZE);
    const midIdx = Math.floor(midLon / NAKSHATRA_SIZE);
    if (loIdx === midIdx) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return (lo + hi) / 2;
}
