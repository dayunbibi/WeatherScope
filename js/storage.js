const RECENT_CITIES_KEY = "weather-finder:recent-cities";
const FAVORITE_CITIES_KEY = "weather-finder:favorite-cities";
const UNIT_KEY = "weather-finder:unit";
const THEME_KEY = "weather-finder:theme";
const MAX_RECENT_CITIES = 5;

function loadStringArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export const loadRecentCities = () => loadStringArray(RECENT_CITIES_KEY).slice(0, 5);
export const saveRecentCities = (cities) => localStorage.setItem(RECENT_CITIES_KEY, JSON.stringify(cities));
export const clearRecentCities = () => localStorage.removeItem(RECENT_CITIES_KEY);

export function addRecentCity(cities, city) {
  const normalized = city.trim();
  return [normalized, ...cities.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, MAX_RECENT_CITIES);
}

export function removeRecentCity(cities, city) {
  return cities.filter((item) => item.toLowerCase() !== city.toLowerCase());
}

export const loadFavoriteCities = () => loadStringArray(FAVORITE_CITIES_KEY);
export const saveFavoriteCities = (cities) => localStorage.setItem(FAVORITE_CITIES_KEY, JSON.stringify(cities));

export function toggleFavoriteCity(cities, city) {
  const exists = cities.some((item) => item.toLowerCase() === city.toLowerCase());
  return exists
    ? cities.filter((item) => item.toLowerCase() !== city.toLowerCase())
    : [city, ...cities];
}

export const loadUnit = () => localStorage.getItem(UNIT_KEY) === "imperial" ? "imperial" : "metric";
export const saveUnit = (unit) => localStorage.setItem(UNIT_KEY, unit);