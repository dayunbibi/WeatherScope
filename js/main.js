import {
  fetchLocationSuggestions,
  fetchWeatherDashboardByCity,
  fetchWeatherDashboardByCoords,
} from "./api.js";
import { createCityAutocomplete } from "./autocomplete.js";
import { createFiveDayForecast, createHourlyForecast, WeatherData } from "./models.js";
import { hideWeatherMap, renderWeatherMap } from "./map.js";
import {
  addRecentCity,
  clearRecentCities,
  loadFavoriteCities,
  loadRecentCities,
  loadTheme,
  loadUnit,
  removeRecentCity,
  saveFavoriteCities,
  saveRecentCities,
  saveTheme,
  saveUnit,
  toggleFavoriteCity,
} from "./storage.js";
import {
  applyTheme,
  clearForecast,
  clearStatus,
  renderFavoriteCities,
  renderForecast,
  renderHourly,
  renderRecentCities,
  renderWeather,
  setLoading,
  showError,
  showSuccess,
  updateUnitButtons,
} from "./ui.js";

const elements = {
  searchForm: document.getElementById("searchForm"),
  cityInput: document.getElementById("cityInput"),
  citySuggestions: document.getElementById("citySuggestions"),
  searchButton: document.getElementById("searchBtn"),

  locationButton: document.getElementById("locationBtn"),
  metricButton: document.getElementById("metricBtn"),
  imperialButton: document.getElementById("imperialBtn"),

  themeButton: document.getElementById("themeBtn"),
  status: document.getElementById("status"),
  weatherResult: document.getElementById("weatherResult"),

  mapSection: document.getElementById("mapSection"),
  weatherMap: document.getElementById("weatherMap"),

  hourlySection: document.getElementById("hourlySection"),
  hourlyList: document.getElementById("hourlyList"),

  forecastSection: document.getElementById("forecastSection"),
  forecastList: document.getElementById("forecastList"),

  recentList: document.getElementById("recentList"),
  recentEmpty: document.getElementById("recentEmpty"),
  clearRecentButton: document.getElementById("clearRecentBtn"),

  favoriteList: document.getElementById("favoriteList"),
  favoriteEmpty: document.getElementById("favoriteEmpty"),
};

let recentCities = loadRecentCities();
let favoriteCities = loadFavoriteCities();
let unit = loadUnit();
let theme = loadTheme();
let currentDashboard = null;
let activeRequestId = 0;

function isCurrentFavorite() {
  return currentDashboard && favoriteCities.some((city) => city.toLowerCase() === currentDashboard.weather.city.toLowerCase());
}

function renderAllWeather() {
  if (!currentDashboard) {
    return;
  }

  renderWeather(
    elements.weatherResult,
    currentDashboard.weather,
    unit,
    isCurrentFavorite()
  );

  renderWeatherMap({
    mapElement: elements.weatherMap,
    mapSection: elements.mapSection,
    weather: currentDashboard.weather,
  });

  renderHourly(
    elements.hourlySection,
    elements.hourlyList,
    currentDashboard.hourly,
    unit
  );

  renderForecast(
    elements.forecastSection,
    elements.forecastList,
    currentDashboard.daily,
    unit
  );
}

function renderSavedCities() {
  renderRecentCities({ listElement: elements.recentList, emptyElement: elements.recentEmpty, clearButton: elements.clearRecentButton, cities: recentCities });
  renderFavoriteCities({ listElement: elements.favoriteList, emptyElement: elements.favoriteEmpty, cities: favoriteCities });
}

async function loadWeather(fetcher, successLabel) {
  const requestId = ++activeRequestId;
  clearStatus(elements.status);
  setLoading(elements.searchButton, true);
  elements.locationButton.disabled = true;

  try {
    const data = await fetcher();
    if (requestId !== activeRequestId) return;

    const weather = new WeatherData(data.currentWeather, data.airQuality, data.uvIndex);
    currentDashboard = { weather, hourly: createHourlyForecast(data.forecast), daily: createFiveDayForecast(data.forecast) };
    renderAllWeather();

    recentCities = addRecentCity(recentCities, weather.city);
    saveRecentCities(recentCities);
    renderSavedCities();
    elements.cityInput.value = weather.city;
    showSuccess(elements.status, successLabel || `Weather loaded for ${weather.locationName}.`);
  } catch (error) {
  if (requestId !== activeRequestId) {
    return;
  }

  clearForecast(
    elements.hourlySection,
    elements.hourlyList,
    elements.forecastSection,
    elements.forecastList
  );

  hideWeatherMap(elements.mapSection);

  showError(
    elements.status,
    error instanceof Error
      ? error.message
      : "Unable to load weather."
  );
} finally {
    if (requestId === activeRequestId) {
      setLoading(elements.searchButton, false);
      elements.locationButton.disabled = false;
    }
  }
}

function searchWeather(city) {
  const normalized = city.trim();
  if (!normalized) {
    showError(elements.status, "Enter a city name before searching.");
    elements.cityInput.focus();
    return;
  }
  loadWeather(() => fetchWeatherDashboardByCity(normalized));
}
function searchWeatherByLocation(location) {
  if (
    !location ||
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude)
  ) {
    showError(
      elements.status,
      "The selected city has invalid coordinates."
    );

    return;
  }

  loadWeather(
    () =>
      fetchWeatherDashboardByCoords(
        location.latitude,
        location.longitude
      ),
    `Weather loaded for ${location.name}.`
  );
}
elements.searchForm.addEventListener(
  "submit",
  (event) => {
    event.preventDefault();

    cityAutocomplete.close();
    searchWeather(elements.cityInput.value);
  }
);

elements.locationButton.addEventListener("click", () => {
  if (!navigator.geolocation) return showError(elements.status, "Geolocation is not supported by this browser.");
  showSuccess(elements.status, "Requesting your location…");
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => loadWeather(() => fetchWeatherDashboardByCoords(coords.latitude, coords.longitude), "Weather loaded for your current location."),
    (error) => showError(elements.status, error.code === 1 ? "Location permission was denied. Enable it in your browser settings." : "Unable to determine your location."),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
  );
});

function setUnit(nextUnit) {
  unit = nextUnit;
  saveUnit(unit);
  updateUnitButtons(elements.metricButton, elements.imperialButton, unit);
  renderAllWeather();
}

elements.metricButton.addEventListener("click", () => setUnit("metric"));
elements.imperialButton.addEventListener("click", () => setUnit("imperial"));

elements.themeButton.addEventListener("click", () => {
  theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  saveTheme(theme);
  applyTheme(theme);
});

function handleCityListClick(event, isFavorites) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const city = button.dataset.city;
  if (button.dataset.action === "search") searchWeather(city);
  if (!isFavorites && button.dataset.action === "remove") {
    recentCities = removeRecentCity(recentCities, city);
    saveRecentCities(recentCities);
    renderSavedCities();
  }
}

elements.recentList.addEventListener("click", (event) => handleCityListClick(event, false));
elements.favoriteList.addEventListener("click", (event) => handleCityListClick(event, true));

elements.clearRecentButton.addEventListener("click", () => {
  clearRecentCities();
  recentCities = [];
  renderSavedCities();
  showSuccess(elements.status, "Recent searches cleared.");
});

elements.weatherResult.addEventListener("click", (event) => {
  if (!event.target.closest("#favoriteCurrentBtn") || !currentDashboard) return;
  favoriteCities = toggleFavoriteCity(favoriteCities, currentDashboard.weather.city);
  saveFavoriteCities(favoriteCities);
  renderSavedCities();
  renderAllWeather();
});

const cityAutocomplete = createCityAutocomplete({
  inputElement: elements.cityInput,
  panelElement: elements.citySuggestions,
  fetchSuggestions: fetchLocationSuggestions,
  onSelect: searchWeatherByLocation,
});

if (theme === "system") theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
applyTheme(theme);
updateUnitButtons(elements.metricButton, elements.imperialButton, unit);
renderSavedCities();
