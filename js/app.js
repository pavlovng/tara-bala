// Tara Bala/js/app.js

import { initSwissEph, julday, getMoonSiderealLongitude, getAyanamsa } from './swiss.js';
import {
  getNakshatraIndex, getTaraNumber, getTaraClass,
  getNakshatra, getTaraClassInfo, checkBoundary, findBoundaryTime
} from './calculator.js';
import { NAKSHATRAS, parseOffset } from './data.js';
import { createCitySearchHandler } from './geocoding.js';

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
const btnCalculate = document.getElementById('btn-calculate');
const tabAuto = document.getElementById('tab-auto');
const tabManual = document.getElementById('tab-manual');
const resultDiv = document.getElementById('result');
const resultMeta = document.getElementById('result-meta');
const resultJanma = document.getElementById('result-janma');
const resultCurrent = document.getElementById('result-current');
const resultTaraNum = document.getElementById('result-tara-num');
const resultTaraClass = document.getElementById('result-tara-class');
const resultBoundary = document.getElementById('result-boundary');
const resultTaraRow = document.getElementById('result-tara-row');
const calcTimeMode = document.getElementById('calc-time-mode');
const calcCustomFields = document.getElementById('calc-custom-fields');
const calcDate = document.getElementById('calc-date');
const calcTime = document.getElementById('calc-time');
const calcTimezone = document.getElementById('calc-timezone');

let birthCitySelected = false;
let calcCitySelected = false;

function updateButtonState() {
  const isAuto = tabAuto.classList.contains('active');
  const isCustomCalc = calcTimeMode.value === 'custom';

  let ready;
  if (isAuto) {
    ready = !!birthDate.value && !!birthTime.value && birthCitySelected && !!timezoneSelect.value;
  } else {
    ready = true;
  }

  if (isCustomCalc) {
    ready = ready && !!calcDate.value && !!calcTime.value;
  }

  btnCalculate.disabled = !ready;
}

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
  populateNakshatras();

  // Default timezone from browser IANA
  const browserTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
  timezoneSelect.value = browserTZ;
  calcTimezone.value = browserTZ;

  // Toggle calc custom fields visibility + prefill current date/time
  calcTimeMode.addEventListener('change', () => {
    calcCustomFields.classList.toggle('hidden', calcTimeMode.value !== 'custom');
    if (calcTimeMode.value === 'custom') {
      const now = new Date();
      calcDate.value = now.toISOString().slice(0, 10);
      calcTime.value = now.toTimeString().slice(0, 5);
    }
    updateButtonState();
  });

  // City search — birth
  const citySearch = document.getElementById('city-search');
  const cityDropdown = document.getElementById('city-dropdown');
  createCitySearchHandler(citySearch, cityDropdown, (city) => {
    latitude.value = city.latitude.toFixed(2);
    longitude.value = city.longitude.toFixed(2);
    if (city.timezone) timezoneSelect.value = city.timezone;
    birthCitySelected = true;
    updateButtonState();
  });
  citySearch.addEventListener('input', () => {
    birthCitySelected = false;
    updateButtonState();
  });

  // City search — calc
  const calcCitySearch = document.getElementById('calc-city-search');
  const calcCityDropdown = document.getElementById('calc-city-dropdown');
  createCitySearchHandler(calcCitySearch, calcCityDropdown, (city) => {
    if (city.timezone) calcTimezone.value = city.timezone;
    calcCitySelected = true;
    updateButtonState();
  });
  calcCitySearch.addEventListener('input', () => {
    calcCitySelected = false;
    updateButtonState();
  });

  // Wire up field changes to button state
  birthDate.addEventListener('change', updateButtonState);
  birthTime.addEventListener('change', updateButtonState);
  nakshatraSelect.addEventListener('change', updateButtonState);
  calcDate.addEventListener('change', updateButtonState);
  calcTime.addEventListener('change', updateButtonState);
  updateButtonState();
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
    updateButtonState();
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

function validateCalcTime() {
  if (calcTimeMode.value === 'now') return true;
  if (!calcDate.value || !calcTime.value) return false;
  return true;
}

function getCalcDateTime() {
  const tz = calcTimezone.value;
  const tzLabel = tz;

  if (calcTimeMode.value === 'now') {
    const now = new Date();
    if (tz) {
      const localParts = getDateTimeParts(now, tz);
      const localDate = new Date(Date.UTC(localParts.year, localParts.month, localParts.day, localParts.hour, localParts.minute, localParts.second));
      const nd = dateToJDElements(localDate);
      const label = `Текущее время (${tzLabel}): ${localParts.year}-${String(localParts.month + 1).padStart(2, '0')}-${String(localParts.day).padStart(2, '0')} ${String(localParts.hour).padStart(2, '0')}:${String(localParts.minute).padStart(2, '0')}`;
      return { jd: julday(nd.year, nd.month, nd.day, nd.hour), label, now: true };
    }
    const nd = dateToJDElements(now);
    return { jd: julday(nd.year, nd.month, nd.day, nd.hour), label: `Текущее время: ${now.toLocaleString('ru-RU')}`, now: true };
  }

  const utcDate = localToUTC(calcDate.value, calcTime.value, tz);
  const d = dateToJDElements(utcDate);
  const jd = julday(d.year, d.month, d.day, d.hour);
  return { jd, label: `Произвольное: ${calcDate.value} ${calcTime.value} (${tzLabel})`, now: false };
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

  return valid;
}

// --- Calculate AUTO ---
async function calculateAuto() {
  if (!validateAuto()) return;
  if (!validateCalcTime()) {
    alert('Укажите дату и время расчёта.');
    return;
  }

  const tz = timezoneSelect.value;
  const utcDate = localToUTC(birthDate.value, birthTime.value, tz);
  const d = dateToJDElements(utcDate);
  const birthJD = julday(d.year, d.month, d.day, d.hour);

  const { jd: calcJD, label: calcLabel, now: isNow } = getCalcDateTime();

  const birthLon = getMoonSiderealLongitude(birthJD);
  const currentLon = getMoonSiderealLongitude(calcJD);

  const janmaIdx = getNakshatraIndex(birthLon);
  const currentIdx = getNakshatraIndex(currentLon);
  const taraNum = getTaraNumber(janmaIdx, currentIdx);
  const taraClassIdx = getTaraClass(taraNum);
  const classInfo = getTaraClassInfo(taraClassIdx);

  resultMeta.textContent = calcLabel;
  resultJanma.textContent = `${getNakshatra(janmaIdx).id + 1} — ${getNakshatra(janmaIdx).nameRu} (${getNakshatra(janmaIdx).nameSanskrit})`;
  resultCurrent.textContent = `${getNakshatra(currentIdx).id + 1} — ${getNakshatra(currentIdx).nameRu} (${getNakshatra(currentIdx).nameSanskrit})`;
  const footnote = [19, 21, 25].includes(taraNum) ? ' <span class="tara-footnote">* Минимальное влияние</span>' : '';
  resultTaraClass.innerHTML = `${taraNum} — ${classInfo.nameRu} (${classInfo.nameSanskrit}) <span class="${classInfo.favorability}">(${favorabilityLabel(classInfo.favorability)})</span>${footnote}`;
  resultTaraRow.classList.toggle('tara-danger', [0, 2, 4, 6].includes(taraClassIdx) || taraNum === 22 || taraNum === 27);

  await handleBoundary(birthLon, birthJD, currentLon, calcJD, janmaIdx, currentIdx, tz, isNow);

  resultDiv.classList.remove('hidden');
}

// --- Calculate MANUAL ---
async function calculateManual() {
  if (!validateCalcTime()) {
    alert('Укажите дату и время расчёта.');
    return;
  }

  const janmaIdx = parseInt(nakshatraSelect.value, 10);

  const { jd: calcJD, label: calcLabel, now: isNow } = getCalcDateTime();

  const currentLon = getMoonSiderealLongitude(calcJD);
  const currentIdx = getNakshatraIndex(currentLon);
  const taraNum = getTaraNumber(janmaIdx, currentIdx);
  const taraClassIdx = getTaraClass(taraNum);

  resultMeta.textContent = calcLabel;
  resultJanma.textContent = `${getNakshatra(janmaIdx).id + 1} — ${getNakshatra(janmaIdx).nameRu} (${getNakshatra(janmaIdx).nameSanskrit})`;
  resultCurrent.textContent = `${getNakshatra(currentIdx).id + 1} — ${getNakshatra(currentIdx).nameRu} (${getNakshatra(currentIdx).nameSanskrit})`;

  const classInfo = getTaraClassInfo(taraClassIdx);
  const footnote = [19, 21, 25].includes(taraNum) ? ' <span class="tara-footnote">* Минимальное влияние</span>' : '';
  resultTaraClass.innerHTML = `${taraNum} — ${classInfo.nameRu} (${classInfo.nameSanskrit}) <span class="${classInfo.favorability}">(${favorabilityLabel(classInfo.favorability)})</span>${footnote}`;
  resultTaraRow.classList.toggle('tara-danger', [0, 2, 4, 6].includes(taraClassIdx) || taraNum === 22 || taraNum === 27);

  await handleBoundary(null, null, currentLon, calcJD, null, currentIdx, null, isNow);

  resultDiv.classList.remove('hidden');
}

// --- Boundary handling ---
async function handleBoundary(birthLon, birthJD, currentLon, nowJD, janmaIdx, currentIdx, birthTimezone, isNow) {
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
      const currentLabel = isNow ? 'сейчас находится' : 'на указанный момент находится';
      warnings.push(`Луна ${currentLabel} на границе накшатр <b>${from.nameRu}</b> и <b>${to.nameRu}</b>. Смена произойдёт в ${formatTime(boundDate)}.`);
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
btnCalculate.addEventListener('click', () => {
  if (tabAuto.classList.contains('active')) calculateAuto();
  else calculateManual();
});

tabAuto.addEventListener('keydown', e => {
  if (e.key === 'Enter') calculateAuto();
});
tabManual.addEventListener('keydown', e => {
  if (e.key === 'Enter') calculateManual();
});

// --- Start ---
init();
