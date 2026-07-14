import {
  fetchLocationSuggestions,
  fetchWeatherDashboardByCity,
  fetchWeatherDashboardByCoords,
} from "./api.js";

import {
  createCityAutocomplete,
} from "./autocomplete.js";

import {
  createFiveDayForecast,
  createHourlyForecast,
  WeatherData,
} from "./models.js";

import {
  hideWeatherMap,
  renderWeatherMap,
} from "./map.js";

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
  applyWeatherTheme,
  clearForecast,
  clearHighlights,
  clearStatus,
  hideDashboardSkeleton,
  renderFavoriteCities,
  renderForecast,
  renderHighlights,
  renderHourly,
  renderRecentCities,
  renderWeather,
  setLoading,
  showDashboardSkeleton,
  showError,
  showSuccess,
  updateUnitButtons,
} from "./ui.js";

/* ================= DOM ELEMENTS ================= */

const elements = {
  searchForm: document.getElementById("searchForm"),
  cityInput: document.getElementById("cityInput"),
  citySuggestions:
    document.getElementById("citySuggestions"),
  searchButton: document.getElementById("searchBtn"),

  locationButton:
    document.getElementById("locationBtn"),
  metricButton:
    document.getElementById("metricBtn"),
  imperialButton:
    document.getElementById("imperialBtn"),

  themeButton:
    document.getElementById("themeBtn"),
  installAppButton:
    document.getElementById("installAppBtn"),

  status: document.getElementById("status"),
  weatherResult:
    document.getElementById("weatherResult"),

  highlightsSection:
    document.getElementById("highlightsSection"),
  highlightsGrid:
    document.getElementById("highlightsGrid"),

  mapSection:
    document.getElementById("mapSection"),
  weatherMap:
    document.getElementById("weatherMap"),

  hourlySection:
    document.getElementById("hourlySection"),
  hourlyList:
    document.getElementById("hourlyList"),

  forecastSection:
    document.getElementById("forecastSection"),
  forecastList:
    document.getElementById("forecastList"),

  recentList:
    document.getElementById("recentList"),
  recentEmpty:
    document.getElementById("recentEmpty"),
  clearRecentButton:
    document.getElementById("clearRecentBtn"),

  favoriteList:
    document.getElementById("favoriteList"),
  favoriteEmpty:
    document.getElementById("favoriteEmpty"),
};

/* ================= APP STATE ================= */

let recentCities = loadRecentCities();
let favoriteCities = loadFavoriteCities();
let unit = loadUnit();
let theme = loadTheme();

let currentDashboard = null;
let activeRequestId = 0;

/* ================= WEATHER RENDERING ================= */

function isCurrentFavorite() {
  if (!currentDashboard) {
    return false;
  }

  const currentCity =
    currentDashboard.weather.city.toLowerCase();

  return favoriteCities.some(
    (city) =>
      city.toLowerCase() === currentCity
  );
}

function renderAllWeather() {
  if (!currentDashboard) {
    return;
  }

  const { weather, hourly, daily } =
    currentDashboard;

  renderWeather(
    elements.weatherResult,
    weather,
    unit,
    isCurrentFavorite()
  );

  applyWeatherTheme(weather);

  renderHighlights({
    section: elements.highlightsSection,
    container: elements.highlightsGrid,
    weather,
    unit,
  });

  renderWeatherMap({
    mapElement: elements.weatherMap,
    mapSection: elements.mapSection,
    weather,
  });

  renderHourly(
    elements.hourlySection,
    elements.hourlyList,
    hourly,
    unit
  );

  renderForecast(
    elements.forecastSection,
    elements.forecastList,
    daily,
    unit
  );
}

/* ================= SAVED CITIES ================= */

function renderSavedCities() {
  renderRecentCities({
    listElement: elements.recentList,
    emptyElement: elements.recentEmpty,
    clearButton: elements.clearRecentButton,
    cities: recentCities,
  });

  renderFavoriteCities({
    listElement: elements.favoriteList,
    emptyElement: elements.favoriteEmpty,
    cities: favoriteCities,
  });
}

/* ================= LOADING AND CLEARING ================= */

function showLoadingSkeleton() {
  clearHighlights(
    elements.highlightsSection,
    elements.highlightsGrid
  );

  showDashboardSkeleton({
    weatherContainer: elements.weatherResult,
    hourlySection: elements.hourlySection,
    hourlyContainer: elements.hourlyList,
    forecastSection: elements.forecastSection,
    forecastContainer: elements.forecastList,
    mapSection: elements.mapSection,
  });
}

function clearWeatherResults() {
  elements.weatherResult.replaceChildren();

  clearHighlights(
    elements.highlightsSection,
    elements.highlightsGrid
  );

  clearForecast(
    elements.hourlySection,
    elements.hourlyList,
    elements.forecastSection,
    elements.forecastList
  );

  hideWeatherMap(elements.mapSection);

  document.body.dataset.weather = "default";
}

/* ================= LOAD WEATHER ================= */

async function loadWeather(
  fetcher,
  successLabel
) {
  const requestId = ++activeRequestId;

  clearStatus(elements.status);
  setLoading(elements.searchButton, true);

  elements.locationButton.disabled = true;

  showLoadingSkeleton();

  try {
    const data = await fetcher();

    if (requestId !== activeRequestId) {
      return;
    }

    const weather = new WeatherData(
      data.currentWeather,
      data.airQuality,
      data.uvIndex
    );

    currentDashboard = {
      weather,
      hourly:
        createHourlyForecast(data.forecast),
      daily:
        createFiveDayForecast(data.forecast),
    };

    renderAllWeather();

    recentCities = addRecentCity(
      recentCities,
      weather.city
    );

    saveRecentCities(recentCities);
    renderSavedCities();

    elements.cityInput.value =
      weather.city;

    showSuccess(
      elements.status,
      successLabel ||
        `Weather loaded for ${weather.locationName}.`
    );
  } catch (error) {
    if (requestId !== activeRequestId) {
      return;
    }

    currentDashboard = null;

    clearWeatherResults();

    showError(
      elements.status,
      error instanceof Error
        ? error.message
        : "Unable to load weather."
    );
  } finally {
    if (requestId === activeRequestId) {
      hideDashboardSkeleton(
        elements.weatherResult
      );

      setLoading(
        elements.searchButton,
        false
      );

      elements.locationButton.disabled =
        false;
    }
  }
}

/* ================= SEARCH ================= */

function searchWeather(city) {
  const normalizedCity = city.trim();

  if (!normalizedCity) {
    showError(
      elements.status,
      "Enter a city name before searching."
    );

    elements.cityInput.focus();
    return;
  }

  loadWeather(() =>
    fetchWeatherDashboardByCity(
      normalizedCity
    )
  );
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

/* ================= AUTOCOMPLETE ================= */

const cityAutocomplete =
  createCityAutocomplete({
    inputElement: elements.cityInput,
    panelElement:
      elements.citySuggestions,
    fetchSuggestions:
      fetchLocationSuggestions,
    onSelect:
      searchWeatherByLocation,
  });

elements.searchForm.addEventListener(
  "submit",
  (event) => {
    event.preventDefault();

    cityAutocomplete.close();

    searchWeather(
      elements.cityInput.value
    );
  }
);

/* ================= GEOLOCATION ================= */

elements.locationButton.addEventListener(
  "click",
  () => {
    cityAutocomplete.close();

    if (!navigator.geolocation) {
      showError(
        elements.status,
        "Geolocation is not supported by this browser."
      );

      return;
    }

    showSuccess(
      elements.status,
      "Requesting your location…"
    );

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        loadWeather(
          () =>
            fetchWeatherDashboardByCoords(
              coords.latitude,
              coords.longitude
            ),
          "Weather loaded for your current location."
        );
      },
      (error) => {
        if (
          error.code ===
          error.PERMISSION_DENIED
        ) {
          showError(
            elements.status,
            "Location permission was denied. Enable it in your browser settings."
          );

          return;
        }

        if (
          error.code ===
          error.POSITION_UNAVAILABLE
        ) {
          showError(
            elements.status,
            "Your location is currently unavailable. Try again or search for your city."
          );

          return;
        }

        if (
          error.code === error.TIMEOUT
        ) {
          showError(
            elements.status,
            "Location request timed out. Try again or search for your city."
          );

          return;
        }

        showError(
          elements.status,
          "Unable to determine your location."
        );
      },
      {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 600000,
      }
    );
  }
);

/* ================= TEMPERATURE UNIT ================= */

function setUnit(nextUnit) {
  unit = nextUnit;

  saveUnit(unit);

  updateUnitButtons(
    elements.metricButton,
    elements.imperialButton,
    unit
  );

  renderAllWeather();
}

elements.metricButton.addEventListener(
  "click",
  () => {
    setUnit("metric");
  }
);

elements.imperialButton.addEventListener(
  "click",
  () => {
    setUnit("imperial");
  }
);

/* ================= THEME ================= */

elements.themeButton.addEventListener(
  "click",
  () => {
    theme =
      document.documentElement.dataset
        .theme === "dark"
        ? "light"
        : "dark";

    saveTheme(theme);
    applyTheme(theme);
  }
);

/* ================= SAVED CITY ACTIONS ================= */

function handleCityListClick(
  event,
  isFavorites
) {
  const button = event.target.closest(
    "button[data-action]"
  );

  if (!button) {
    return;
  }

  const city = button.dataset.city;
  const action = button.dataset.action;

  if (!city) {
    return;
  }

  if (action === "search") {
    searchWeather(city);
    return;
  }

  if (
    !isFavorites &&
    action === "remove"
  ) {
    recentCities = removeRecentCity(
      recentCities,
      city
    );

    saveRecentCities(recentCities);
    renderSavedCities();
  }
}

elements.recentList.addEventListener(
  "click",
  (event) => {
    handleCityListClick(
      event,
      false
    );
  }
);

elements.favoriteList.addEventListener(
  "click",
  (event) => {
    handleCityListClick(
      event,
      true
    );
  }
);

elements.clearRecentButton.addEventListener(
  "click",
  () => {
    clearRecentCities();

    recentCities = [];
    renderSavedCities();

    showSuccess(
      elements.status,
      "Recent searches cleared."
    );
  }
);

/* ================= FAVORITES ================= */

elements.weatherResult.addEventListener(
  "click",
  (event) => {
    const favoriteButton =
      event.target.closest(
        "#favoriteCurrentBtn"
      );

    if (
      !favoriteButton ||
      !currentDashboard
    ) {
      return;
    }

    favoriteCities =
      toggleFavoriteCity(
        favoriteCities,
        currentDashboard.weather.city
      );

    saveFavoriteCities(
      favoriteCities
    );

    renderSavedCities();
    renderAllWeather();
  }
);

/* ================= INITIAL SETTINGS ================= */

if (theme === "system") {
  theme = window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches
    ? "dark"
    : "light";
}

applyTheme(theme);

updateUnitButtons(
  elements.metricButton,
  elements.imperialButton,
  unit
);

renderSavedCities();

/* ================= PWA INSTALLATION ================= */

let deferredInstallPrompt = null;

function registerServiceWorker() {
  if (
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  window.addEventListener(
    "load",
    () => {
      navigator.serviceWorker
        .register(
          "/service-worker.js"
        )
        .catch((error) => {
          console.error(
            "Service worker registration failed:",
            error
          );
        });
    }
  );
}

window.addEventListener(
  "beforeinstallprompt",
  (event) => {
    event.preventDefault();

    deferredInstallPrompt = event;

    if (
      elements.installAppButton
    ) {
      elements.installAppButton.hidden =
        false;
    }
  }
);

elements.installAppButton?.addEventListener(
  "click",
  async () => {
    if (!deferredInstallPrompt) {
      return;
    }

    deferredInstallPrompt.prompt();

    const choice =
      await deferredInstallPrompt.userChoice;

    if (
      choice.outcome === "accepted"
    ) {
      showSuccess(
        elements.status,
        "WeatherScope installation started."
      );
    }

    deferredInstallPrompt = null;

    if (
      elements.installAppButton
    ) {
      elements.installAppButton.hidden =
        true;
    }
  }
);

window.addEventListener(
  "appinstalled",
  () => {
    deferredInstallPrompt = null;

    if (
      elements.installAppButton
    ) {
      elements.installAppButton.hidden =
        true;
    }

    showSuccess(
      elements.status,
      "WeatherScope was installed successfully."
    );
  }
);

registerServiceWorker();