// Tara Bala/js/app.js

import { initSwissEph, julday, getMoonSiderealLongitude, getAyanamsa } from './swiss.js';
import {
  getNakshatraIndex, getTaraNumber, getTaraClass,
  getNakshatra, getTaraClassInfo, checkBoundary, findBoundaryTime
} from './calculator.js';
import { NAKSHATRAS, TIMEZONES, parseOffset } from './data.js';

// --- DOM refs ---
const loading = document.getElementById('loading');
const app = document.getElementById('app');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const birthDate = document.getElementById('birth-date');
const birthTime = document.getElementById('birth-time');
const timeError = document.getElementById('time-error');
const timezoneSelect = document.getElementById('timezone');
const latitude = document.getElementById('latitude');
const longitude = document.getElementById('longitude');
const nakshatraSelect = document.getElementById('nakshatra-select');
const btnCalcAuto = document.getElementById('btn-calc-auto');
const btnCalcManual = document.getElementById('btn-calc-manual');
const resultDiv = document.getElementById('result');
const resultMeta = document.getElementById('result-meta');
const resultJanma = document.getElementById('result-janma');
const resultCurrent = document.getElementById('result-current');
const resultTaraNum = document.getElementById('result-tara-num');
const resultTaraClass = document.getElementById('result-tara-class');
const resultBoundary = document.getElementById('result-boundary');

// --- Init ---
async function init() {
  try {
    await initSwissEph();
  } catch (e) {
    loading.innerHTML = `<p style="color:red">Ошибка загрузки эфемерид: ${e.message}</p>`;
    return;
  }

  loading.classList.add('hidden');
  app.classList.remove('hidden');
  populateTimezones();
  populateNakshatras();

  // Set default timezone to browser timezone
  const browserTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
  timezoneSelect.value = browserTZ;
}

function populateTimezones() {
  TIMEZONES.forEach(tz => {
    const opt = document.createElement('option');
    opt.value = tz.value;
    opt.textContent = tz.label;
    if (tz.disabled) {
      opt.disabled = true;
      opt.selected = false;
    }
    timezoneSelect.appendChild(opt);
  });
}

function populateNakshatras() {
  NAKSHATRAS.forEach(n => {
    const opt = document.createElement('option');
    opt.value = n.id;
    opt.textContent = `${n.id + 1} — ${n.nameRu} (${n.nameSanskrit})`;
    nakshatraSelect.appendChild(opt);
  });
}

// --- Tabs ---
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(tc => tc.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    resultDiv.classList.add('hidden');
  });
});

// --- Timezone conversion ---
function getDateTimeParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = {};
  fmt.formatToParts(date).forEach(p => {
    if (p.type !== 'literal') parts[p.type] = parseInt(p.value, 10);
  });
  return {
    year: parts.year,
    month: parts.month - 1,
    day: parts.day,
    hour: parts.hour === 24 ? 0 : parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

function localToUTC(dateStr, timeStr, timezone) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const timeParts = timeStr.split(':');
  const h = Number(timeParts[0]);
  const min = Number(timeParts[1]);
  const sec = timeParts[2] ? Number(timeParts[2]) : 0;

  if (timezone === 'auto') {
    return new Date(y, m - 1, d, h, min, sec);
  }

  const localAsUTC = Date.UTC(y, m - 1, d, h, min, sec);

  // Fixed offset (e.g. "offset:+4")
  const offset = parseOffset(timezone);
  if (offset !== null) {
    return new Date(localAsUTC - offset * 60000);
  }

  // IANA timezone — use formatToParts for accurate historical offsets
  const testDate = new Date(localAsUTC);

  const utcParts = getDateTimeParts(testDate, 'UTC');
  const tzParts = getDateTimeParts(testDate, timezone);

  const utcMs = Date.UTC(utcParts.year, utcParts.month, utcParts.day, utcParts.hour, utcParts.minute, utcParts.second);
  const tzMs = Date.UTC(tzParts.year, tzParts.month, tzParts.day, tzParts.hour, tzParts.minute, tzParts.second);

  const tzOffset = tzMs - utcMs;
  return new Date(localAsUTC - tzOffset);
}

function dateToJDElements(utcDate) {
  return {
    year: utcDate.getUTCFullYear(),
    month: utcDate.getUTCMonth() + 1,
    day: utcDate.getUTCDate(),
    hour: utcDate.getUTCHours() + utcDate.getUTCMinutes() / 60 + utcDate.getUTCSeconds() / 3600,
  };
}

// --- Validation ---
function validateAuto() {
  let valid = true;

  if (!birthDate.value) {
    birthDate.focus();
    return false;
  }

  if (!birthTime.value) {
    timeError.classList.remove('hidden');
    birthTime.focus();
    return false;
  }
  timeError.classList.add('hidden');

  if (!timezoneSelect.value) return false;
  if (!latitude.value || latitude.value < -90 || latitude.value > 90) return false;
  if (!longitude.value || longitude.value < -180 || longitude.value > 180) return false;

  return valid;
}

// --- Calculate AUTO ---
async function calculateAuto() {
  if (!validateAuto()) return;

  const tz = timezoneSelect.value;
  const utcDate = localToUTC(birthDate.value, birthTime.value, tz);
  const d = dateToJDElements(utcDate);
  const birthJD = julday(d.year, d.month, d.day, d.hour);

  const now = new Date();
  const nd = dateToJDElements(now);
  const nowJD = julday(nd.year, nd.month, nd.day, nd.hour);

  const birthLon = getMoonSiderealLongitude(birthJD);
  const currentLon = getMoonSiderealLongitude(nowJD);

  const janmaIdx = getNakshatraIndex(birthLon);
  const currentIdx = getNakshatraIndex(currentLon);
  const taraNum = getTaraNumber(janmaIdx, currentIdx);
  const taraClassIdx = getTaraClass(taraNum);

  resultMeta.textContent = `Расчёт: ${now.toLocaleString('ru-RU')}`;
  resultJanma.textContent = `${getNakshatra(janmaIdx).id + 1} — ${getNakshatra(janmaIdx).nameRu} (${getNakshatra(janmaIdx).nameSanskrit})`;
  resultCurrent.textContent = `${getNakshatra(currentIdx).id + 1} — ${getNakshatra(currentIdx).nameRu} (${getNakshatra(currentIdx).nameSanskrit})`;
  resultTaraNum.textContent = taraNum;

  const classInfo = getTaraClassInfo(taraClassIdx);
  resultTaraClass.innerHTML = `${taraClassIdx + 1} — ${classInfo.nameRu} (${classInfo.nameSanskrit}) <span class="${classInfo.favorability}">(${favorabilityLabel(classInfo.favorability)})</span>`;

  await handleBoundary(birthLon, birthJD, currentLon, nowJD, janmaIdx, currentIdx, tz);

  resultDiv.classList.remove('hidden');
}

// --- Calculate MANUAL ---
async function calculateManual() {
  const janmaIdx = parseInt(nakshatraSelect.value, 10);

  const now = new Date();
  const nowUTC = now;
  const nd = dateToJDElements(nowUTC);
  const nowJD = julday(nd.year, nd.month, nd.day, nd.hour);

  const currentLon = getMoonSiderealLongitude(nowJD);
  const currentIdx = getNakshatraIndex(currentLon);
  const taraNum = getTaraNumber(janmaIdx, currentIdx);
  const taraClassIdx = getTaraClass(taraNum);

  resultMeta.textContent = `Расчёт: ${now.toLocaleString('ru-RU')}`;
  resultJanma.textContent = `${getNakshatra(janmaIdx).id + 1} — ${getNakshatra(janmaIdx).nameRu} (${getNakshatra(janmaIdx).nameSanskrit})`;
  resultCurrent.textContent = `${getNakshatra(currentIdx).id + 1} — ${getNakshatra(currentIdx).nameRu} (${getNakshatra(currentIdx).nameSanskrit})`;
  resultTaraNum.textContent = taraNum;

  const classInfo = getTaraClassInfo(taraClassIdx);
  resultTaraClass.innerHTML = `${taraClassIdx + 1} — ${classInfo.nameRu} (${classInfo.nameSanskrit}) <span class="${classInfo.favorability}">(${favorabilityLabel(classInfo.favorability)})</span>`;

  await handleBoundary(null, null, currentLon, nowJD, null, currentIdx);

  resultDiv.classList.remove('hidden');
}

// --- Boundary handling ---
async function handleBoundary(birthLon, birthJD, currentLon, nowJD, janmaIdx, currentIdx, birthTimezone) {
  const warnings = [];

  if (janmaIdx !== null) {
    const birthBound = checkBoundary(birthLon);
    if (birthBound.isNearBoundary) {
      const boundJD = await findBoundaryTime(birthJD, birthBound.direction, getMoonSiderealLongitude);
      if (boundJD) {
        const boundDate = jdToDate(boundJD);
        const fromIdx = birthBound.direction === 'entering' ? janmaIdx - 1 : janmaIdx;
        const toIdx = birthBound.direction === 'entering' ? janmaIdx : janmaIdx + 1;
        const from = getNakshatra((fromIdx + 27) % 27);
        const to = getNakshatra((toIdx + 27) % 27);
        warnings.push(`Луна при рождении находилась на границе накшатр <b>${from.nameRu}</b> и <b>${to.nameRu}</b>. Смена произошла в ${formatTime(boundDate, birthTimezone)}.`);
      }
    }
  }

  const currentBound = checkBoundary(currentLon);
  if (currentBound.isNearBoundary) {
    const boundJD = await findBoundaryTime(nowJD, currentBound.direction, getMoonSiderealLongitude);
    if (boundJD) {
      const boundDate = jdToDate(boundJD);
      const fromIdx = currentBound.direction === 'entering' ? currentIdx - 1 : currentIdx;
      const toIdx = currentBound.direction === 'entering' ? currentIdx : currentIdx + 1;
      const from = getNakshatra((fromIdx + 27) % 27);
      const to = getNakshatra((toIdx + 27) % 27);
      warnings.push(`Луна сейчас находится на границе накшатр <b>${from.nameRu}</b> и <b>${to.nameRu}</b>. Смена произойдёт в ${formatTime(boundDate)}.`);
    }
  }

  if (warnings.length > 0) {
    resultBoundary.innerHTML = warnings.join('<br>');
    resultBoundary.classList.remove('hidden');
  } else {
    resultBoundary.classList.add('hidden');
  }
}

// --- Helpers ---
function favorabilityLabel(f) {
  switch (f) {
    case 'favorable': return 'Благоприятная';
    case 'very_favorable': return 'Очень благоприятная';
    case 'unfavorable': return 'Неблагоприятная';
    case 'neutral': return 'Нейтральная';
	
	case 'negativ': return 'Негатив, опасность для тела';
	case 'wealth': return 'Богатство, процветание';
	case 'danger': return 'Опасно, потери, несчастные случаи';
	case 'prosperity': return 'Процветание';
	case 'obstacles': return 'Препятствия';
	case 'realization': return 'Реализация притязаний';
	case 'dangers': return 'Опасности';
	case 'good': return 'Хорошее';
	case 'very_good': return 'Очень благоприятно';
  }
}

function jdToDate(jd) {
  return new Date((jd - 2440587.5) * 86400000);
}

function formatTime(date, timezone) {
  // Fixed offset — manual calculation
  const offset = parseOffset(timezone);
  if (offset !== null) {
    const adjusted = new Date(date.getTime() + offset * 60000);
    const hh = String(adjusted.getUTCHours()).padStart(2, '0');
    const mm = String(adjusted.getUTCMinutes()).padStart(2, '0');
    const ss = String(adjusted.getUTCSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  // IANA timezone
  const opts = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
  if (timezone && timezone !== 'auto') {
    opts.timeZone = timezone;
  }
  return date.toLocaleTimeString('ru-RU', opts);
}

// --- Event listeners ---
btnCalcAuto.addEventListener('click', calculateAuto);
btnCalcManual.addEventListener('click', calculateManual);

// Enter key submits active tab form
document.getElementById('tab-auto').addEventListener('keydown', e => {
  if (e.key === 'Enter') calculateAuto();
});
document.getElementById('tab-manual').addEventListener('keydown', e => {
  if (e.key === 'Enter') calculateManual();
});

// --- Start ---
init();
