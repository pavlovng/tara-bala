// Tara Bala/js/data.js

export const NAKSHATRA_SIZE = 360 / 27;

export const NAKSHATRAS = [
  { id: 0,  nameRu: 'Ашвини',          nameSanskrit: 'Ashwini' },
  { id: 1,  nameRu: 'Бхарани',          nameSanskrit: 'Bharani' },
  { id: 2,  nameRu: 'Криттика',         nameSanskrit: 'Krittika' },
  { id: 3,  nameRu: 'Рохини',           nameSanskrit: 'Rohini' },
  { id: 4,  nameRu: 'Мригашира',        nameSanskrit: 'Mrigashira' },
  { id: 5,  nameRu: 'Ардра',            nameSanskrit: 'Ardra' },
  { id: 6,  nameRu: 'Пунарвасу',        nameSanskrit: 'Punarvasu' },
  { id: 7,  nameRu: 'Пушья',            nameSanskrit: 'Pushya' },
  { id: 8,  nameRu: 'Ашлеша',           nameSanskrit: 'Ashlesha' },
  { id: 9,  nameRu: 'Магха',            nameSanskrit: 'Magha' },
  { id: 10, nameRu: 'Пурва-Пхалгуни',   nameSanskrit: 'Purva Phalguni' },
  { id: 11, nameRu: 'Уттара-Пхалгуни',  nameSanskrit: 'Uttara Phalguni' },
  { id: 12, nameRu: 'Хаста',            nameSanskrit: 'Hasta' },
  { id: 13, nameRu: 'Читра',            nameSanskrit: 'Chitra' },
  { id: 14, nameRu: 'Свати',            nameSanskrit: 'Swati' },
  { id: 15, nameRu: 'Вишакха',          nameSanskrit: 'Vishakha' },
  { id: 16, nameRu: 'Анурадха',         nameSanskrit: 'Anuradha' },
  { id: 17, nameRu: 'Джиештха',         nameSanskrit: 'Jyeshtha' },
  { id: 18, nameRu: 'Мула',             nameSanskrit: 'Mula' },
  { id: 19, nameRu: 'Пурва-Ашадха',     nameSanskrit: 'Purva Ashadha' },
  { id: 20, nameRu: 'Уттара-Ашадха',    nameSanskrit: 'Uttara Ashadha' },
  { id: 21, nameRu: 'Шравана',          nameSanskrit: 'Shravana' },
  { id: 22, nameRu: 'Дхаништха',        nameSanskrit: 'Dhanishta' },
  { id: 23, nameRu: 'Шатабхиша',        nameSanskrit: 'Shatabhisha' },
  { id: 24, nameRu: 'Пурва-Бхадрапада', nameSanskrit: 'Purva Bhadrapada' },
  { id: 25, nameRu: 'Уттара-Бхадрапада',nameSanskrit: 'Uttara Bhadrapada' },
  { id: 26, nameRu: 'Ревати',           nameSanskrit: 'Revati' },
];

export const TARA_CLASSES = [
  { id: 0, nameRu: 'Джанма',      nameSanskrit: 'Janma',      favorability: 'negativ' },
  { id: 1, nameRu: 'Сампат',   nameSanskrit: 'Sampat',     favorability: 'wealth' },
  { id: 2, nameRu: 'Випат',       nameSanskrit: 'Vipat',      favorability: 'danger' },
  { id: 3, nameRu: 'Кшема',       nameSanskrit: 'Kshema',     favorability: 'prosperity' },
  { id: 4, nameRu: 'Пратьяк',     nameSanskrit: 'Pratyak',    favorability: 'obstacles' },
  { id: 5, nameRu: 'Садхана',     nameSanskrit: 'Sadhana',    favorability: 'realization' },
  { id: 6, nameRu: 'Найдхана',       nameSanskrit: 'Naidhana',      favorability: 'dangers' },
  { id: 7, nameRu: 'Митра',       nameSanskrit: 'Mitra',      favorability: 'good' },
  { id: 8, nameRu: 'Парам Митра',   nameSanskrit: 'Param Mitra',favorability: 'very_good' },
];

export function parseOffset(timezone) {
  if (!timezone.startsWith('offset:')) return null;
  const str = timezone.slice(7);
  const parts = str.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1] ? parseInt(parts[1], 10) : 0;
  return hours * 60 + minutes; // total offset in minutes
}

export const BOUNDARY_THRESHOLD_DEG = 0.033; // ~2 arcminutes
