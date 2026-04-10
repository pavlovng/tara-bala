// Tara Bala/js/swiss.js

let swe = null;

export async function initSwissEph() {
  const { default: SwissEph } = await import(
    'https://cdn.jsdelivr.net/gh/prolaxu/swisseph-wasm@main/src/swisseph.js'
  );
  swe = new SwissEph();
  await swe.initSwissEph();
  swe.set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0);
}

export function getMoonSiderealLongitude(jd) {
  const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SIDEREAL;
  const result = swe.calc_ut(jd, swe.SE_MOON, flags);
  return result[0]; // longitude in degrees
}

export function getMoonSiderealLongitudeWithSpeed(jd) {
  const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SIDEREAL | swe.SEFLG_SPEED;
  const result = swe.calc_ut(jd, swe.SE_MOON, flags);
  return { longitude: result[0], speed: result[3] };
}

export function getAyanamsa(jd) {
  return swe.get_ayanamsa(jd);
}

export function julday(year, month, day, hour) {
  return swe.julday(year, month, day, hour);
}

export function isReady() {
  return swe !== null;
}
