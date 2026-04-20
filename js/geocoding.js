// Tara Bala/js/geocoding.js

const API_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const MIN_QUERY_LEN = 3;
const DEBOUNCE_MS = 300;
const MAX_RESULTS = 8;

let abortController = null;

export async function searchCities(query) {
  if (!query || query.length < MIN_QUERY_LEN) return [];

  if (abortController) abortController.abort();
  abortController = new AbortController();

  const params = new URLSearchParams({
    name: query,
    count: String(MAX_RESULTS),
    language: 'ru',
    format: 'json',
  });

  const response = await fetch(`${API_URL}?${params}`, { signal: abortController.signal });
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

  inputEl.addEventListener('input', () => {
    clearTimeout(timeout);
    const query = inputEl.value.trim();
    if (query.length < MIN_QUERY_LEN) {
      dropdownEl.classList.add('hidden');
      dropdownEl.innerHTML = '';
      return;
    }
    timeout = setTimeout(async () => {
      const cities = await searchCities(query);
      if (cities.length === 0) {
        dropdownEl.classList.add('hidden');
        dropdownEl.innerHTML = '';
        return;
      }
      renderDropdown(dropdownEl, cities, (city) => {
        inputEl.value = city.name;
        dropdownEl.classList.add('hidden');
        dropdownEl.innerHTML = '';
        onCitySelect(city);
      });
    }, DEBOUNCE_MS);
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dropdownEl.classList.add('hidden');
      dropdownEl.innerHTML = '';
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
