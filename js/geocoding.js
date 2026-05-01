// Tara Bala/js/geocoding.js

const API_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const MIN_QUERY_LEN = 3;
const DEBOUNCE_MS = 300;
const MAX_RESULTS = 8;

export async function searchCities(query, signal) {
  if (!query || query.length < MIN_QUERY_LEN) return [];

  const params = new URLSearchParams({
    name: query,
    count: String(MAX_RESULTS),
    language: 'ru',
    format: 'json',
  });

  const response = await fetch(`${API_URL}?${params}`, { signal });
  if (!response.ok) return [];

  const data = await response.json();
  if (!data.results) return [];

  return data.results.map(r => ({
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone || null,
    country: r.country || '',
    admin1: r.admin1 || '',
  }));
}

export function createCitySearchHandler(inputEl, dropdownEl, onCitySelect) {
  let timeout;
  let abortController = null;
  let items = [];
  let highlightedIdx = -1;
  let suppressInput = false;

  function highlightItem(idx) {
    const elements = dropdownEl.children;
    for (let i = 0; i < elements.length; i++) {
      elements[i].classList.toggle('active', i === idx);
    }
  }

  function selectCity(city) {
    suppressInput = true;
    inputEl.value = city.name;
    dropdownEl.classList.add('hidden');
    dropdownEl.innerHTML = '';
    items = [];
    highlightedIdx = -1;
    onCitySelect(city);
  }

  inputEl.addEventListener('input', () => {
    if (suppressInput) {
      suppressInput = false;
      return;
    }
    clearTimeout(timeout);
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    highlightedIdx = -1;
    const query = inputEl.value.trim();
    if (query.length < MIN_QUERY_LEN) {
      dropdownEl.classList.add('hidden');
      dropdownEl.innerHTML = '';
      items = [];
      return;
    }
    timeout = setTimeout(async () => {
      const controller = new AbortController();
      abortController = controller;

      let cities;
      try {
        cities = await searchCities(query, controller.signal);
      } catch (e) {
        if (e.name !== 'AbortError') {
          dropdownEl.classList.add('hidden');
          dropdownEl.innerHTML = '';
          items = [];
        }
        return;
      } finally {
        if (abortController === controller) abortController = null;
      }

      if (controller.signal.aborted || inputEl.value.trim() !== query) return;

      if (cities.length === 0) {
        dropdownEl.classList.add('hidden');
        dropdownEl.innerHTML = '';
        items = [];
        return;
      }
      items = cities;
      renderDropdown(dropdownEl, cities, selectCity);
    }, DEBOUNCE_MS);
  });

  inputEl.addEventListener('keydown', (e) => {
    if (items.length === 0) {
      if (e.key === 'Escape') {
        dropdownEl.classList.add('hidden');
        dropdownEl.innerHTML = '';
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightedIdx = (highlightedIdx + 1) % items.length;
      highlightItem(highlightedIdx);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightedIdx = highlightedIdx <= 0 ? items.length - 1 : highlightedIdx - 1;
      highlightItem(highlightedIdx);
    } else if (e.key === 'Enter' && highlightedIdx >= 0) {
      e.preventDefault();
      e.stopPropagation();
      selectCity(items[highlightedIdx]);
    } else if (e.key === 'Escape') {
      dropdownEl.classList.add('hidden');
      dropdownEl.innerHTML = '';
      items = [];
      highlightedIdx = -1;
    }
  });

  inputEl.addEventListener('focus', () => {
    if (!dropdownEl.classList.contains('hidden')) return;
    if (inputEl.value.trim().length >= MIN_QUERY_LEN) {
      inputEl.dispatchEvent(new Event('input'));
    }
  });

  document.addEventListener('click', (e) => {
    if (!inputEl.contains(e.target) && !dropdownEl.contains(e.target)) {
      dropdownEl.classList.add('hidden');
      dropdownEl.innerHTML = '';
      items = [];
      highlightedIdx = -1;
    }
  });
}

function renderDropdown(dropdownEl, cities, onSelect) {
  dropdownEl.innerHTML = '';
  cities.forEach(city => {
    const item = document.createElement('div');
    item.className = 'city-item';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'city-item-name';
    nameSpan.textContent = city.name;

    item.appendChild(nameSpan);

    const subtitle = [city.admin1, city.country].filter(Boolean).join(', ');
    if (subtitle) {
      const subSpan = document.createElement('span');
      subSpan.className = 'city-item-sub';
      subSpan.textContent = subtitle;
      item.appendChild(subSpan);
    }

    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      onSelect(city);
    });

    dropdownEl.appendChild(item);
  });
  dropdownEl.classList.remove('hidden');
}
