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
  createWeatherRecommendations,
  formatTemperature,
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
  loadRecommendationPreferences,
  saveRecommendationPreferences,
  resetRecommendationPreferences,
  loadUnit,
  removeRecentCity,
  saveFavoriteCities,
  saveRecentCities,
  saveUnit,
  toggleFavoriteCity,
} from "./storage.js";

import {
  applyWeatherTheme,
  clearForecast,
  clearHighlights,
  clearRecommendations,
  clearStatus,
  hideDashboardSkeleton,
  renderFavoriteCities,
  renderForecast,
  renderHighlights,
  renderHourly,
  renderRecentCities,
  renderRecommendations,
  renderWeather,
  setLoading,
  showDashboardSkeleton,
  showError,
  showSuccess,
  updateUnitButtons,
} from "./ui.js";

/* ================= DOM ELEMENTS ================= */

const elements = {
  searchForm:
    document.getElementById("searchForm"),

  cityInput:
    document.getElementById("cityInput"),

  citySuggestions:
    document.getElementById("citySuggestions"),

  searchButton:
    document.getElementById("searchBtn"),

  locationButton:
    document.getElementById("locationBtn"),

  metricButton:
    document.getElementById("metricBtn"),

  imperialButton:
    document.getElementById("imperialBtn"),

  shareWeatherButton:
    document.getElementById("shareWeatherBtn"),

  installAppButton:
    document.getElementById("installAppBtn"),

  status:
    document.getElementById("status"),

  weatherResult:
    document.getElementById("weatherResult"),

  highlightsSection:
    document.getElementById("highlightsSection"),

  highlightsGrid:
    document.getElementById("highlightsGrid"),

  recommendationSection:
    document.getElementById(
      "recommendationSection"
    ),

  recommendationGrid:
    document.getElementById(
      "recommendationGrid"
    ),

    customizeRecommendationsButton:
  document.getElementById(
    "customizeRecommendationsBtn"
  ),

recommendationSettings:
  document.getElementById(
    "recommendationSettings"
  ),

resetRecommendationsButton:
  document.getElementById(
    "resetRecommendationsBtn"
  ),

  mapSection:
    document.getElementById("mapSection"),

  weatherMap:
    document.getElementById("weatherMap"),

  hourlySection:
    document.getElementById("hourlySection"),

  hourlyList:
    document.getElementById("hourlyList"),

  forecastSection:
    document.getElementById(
      "forecastSection"
    ),

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
let recommendationPreferences =
  loadRecommendationPreferences();

let currentDashboard = null;
let activeRequestId = 0;
let deferredInstallPrompt = null;

const favoriteWeatherCache = new Map();

/* ================= HELPERS ================= */

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

function formatShareTemperature(value) {
  if (unit === "imperial") {
    return `${Math.round(
      (value * 9) / 5 + 32
    )}°F`;
  }

  return `${Math.round(value)}°C`;
}

function buildWeatherShareText(weather) {
  return [
    `Weather in ${weather.locationName}`,
    `${formatShareTemperature(
      weather.temperature
    )} · ${weather.description}`,
    `Feels like ${formatShareTemperature(
      weather.feelsLike
    )}`,
    `Humidity ${Math.round(
      weather.humidity
    )}%`,
    `Wind ${weather.windSpeed.toFixed(
      1
    )} m/s`,
    `AQI ${
      weather.aqi !== null
        ? `${weather.aqi}/5 · ${weather.aqiLabel}`
        : "Unavailable"
    }`,
  ].join("\n");
}

function syncRecommendationSettings() {

  const checkboxes =

    document.querySelectorAll(

      "[data-recommendation-preference]"

    );

  checkboxes.forEach((checkbox) => {

    const preferenceKey =

      checkbox.dataset

        .recommendationPreference;

    checkbox.checked =

      recommendationPreferences[

        preferenceKey

      ] !== false;

  });

}

function renderCurrentRecommendations() {
  if (!currentDashboard) {
    return;
  }

  renderRecommendations(
    elements.recommendationSection,
    elements.recommendationGrid,
    createWeatherRecommendations(
      currentDashboard.weather
    ),
    recommendationPreferences
  );
}

/* ================= FAVORITE WEATHER ================= */

async function loadFavoriteCityWeather() {
  if (!elements.favoriteList) {
    return;
  }

  const favoriteCards =
    elements.favoriteList.querySelectorAll(
      ".favorite-weather-card"
    );

  await Promise.all(
    [...favoriteCards].map(
      async (card) => {
        const searchButton =
          card.querySelector(
            ".favorite-card-button"
          );

        const iconContainer =
          card.querySelector(
            ".favorite-card-icon"
          );

        const information =
          card.querySelector(
            ".favorite-card-info span"
          );

        const city =
          searchButton?.dataset.city;

        if (
          !city ||
          !iconContainer ||
          !information
        ) {
          return;
        }

        try {
          const cacheKey =
            city.trim().toLowerCase();

          let dashboardData =
            favoriteWeatherCache.get(
              cacheKey
            );

          if (!dashboardData) {
            dashboardData =
              await fetchWeatherDashboardByCity(
                city
              );

            favoriteWeatherCache.set(
              cacheKey,
              dashboardData
            );
          }

          const current =
            dashboardData.currentWeather;

          const iconCode =
            current?.weather?.[0]?.icon ||
            "";

          const description =
            current?.weather?.[0]
              ?.description ||
            "Weather unavailable";

          const temperature =
            current?.main?.temp;

          if (iconCode) {
            iconContainer.innerHTML = `
              <img
                src="https://openweathermap.org/img/wn/${iconCode}@2x.png"
                alt="${description}"
                width="54"
                height="54"
              >
            `;
          } else {
            iconContainer.textContent =
              "🌤️";
          }

          information.textContent =
            Number.isFinite(temperature)
              ? `${formatTemperature(
                  temperature,
                  unit
                )} · ${description}`
              : description;
        } catch (error) {
          console.error(
            `Unable to load favourite weather for ${city}:`,
            error
          );

          iconContainer.textContent =
            "🌤️";

          information.textContent =
            "Weather unavailable";
        }
      }
    )
  );
}

/* ================= WEATHER RENDERING ================= */

function renderAllWeather() {
  if (!currentDashboard) {
    return;
  }

  const {
    weather,
    hourly,
    daily,
  } = currentDashboard;

  renderWeather(
    elements.weatherResult,
    weather,
    unit,
    isCurrentFavorite()
  );

  applyWeatherTheme(weather);

  renderHighlights({
    section:
      elements.highlightsSection,
    container:
      elements.highlightsGrid,
    weather,
    unit,
  });

  renderWeatherMap({
    mapElement:
      elements.weatherMap,
    mapSection:
      elements.mapSection,
    weather,
  });

  renderHourly(
    elements.hourlySection,
    elements.hourlyList,
    hourly,
    unit
  );

  renderCurrentRecommendations();

  renderForecast(
    elements.forecastSection,
    elements.forecastList,
    daily,
    unit
  );

  if (elements.shareWeatherButton) {
    elements.shareWeatherButton.hidden =
      false;
  }
}

/* ================= SAVED CITIES ================= */

function renderSavedCities() {
  renderRecentCities({
    listElement:
      elements.recentList,

    emptyElement:
      elements.recentEmpty,

    clearButton:
      elements.clearRecentButton,

    cities:
      recentCities,
  });

  renderFavoriteCities({
    listElement:
      elements.favoriteList,

    emptyElement:
      elements.favoriteEmpty,

    cities:
      favoriteCities,
  });

  loadFavoriteCityWeather();
}

/* ================= LOADING AND CLEARING ================= */

function showLoadingSkeleton() {
  clearHighlights(
    elements.highlightsSection,
    elements.highlightsGrid
  );

  clearRecommendations(
    elements.recommendationSection,
    elements.recommendationGrid
  );

  showDashboardSkeleton({
    weatherContainer:
      elements.weatherResult,

    hourlySection:
      elements.hourlySection,

    hourlyContainer:
      elements.hourlyList,

    forecastSection:
      elements.forecastSection,

    forecastContainer:
      elements.forecastList,

    mapSection:
      elements.mapSection,
  });
}

function clearWeatherResults() {
  elements.weatherResult.replaceChildren();

  clearHighlights(
    elements.highlightsSection,
    elements.highlightsGrid
  );

  clearRecommendations(
    elements.recommendationSection,
    elements.recommendationGrid
  );

  clearForecast(
    elements.hourlySection,
    elements.hourlyList,
    elements.forecastSection,
    elements.forecastList
  );

  hideWeatherMap(
    elements.mapSection
  );

  if (elements.shareWeatherButton) {
    elements.shareWeatherButton.hidden =
      true;
  }

  document.body.dataset.weather =
    "default";
}

/* ================= LOAD WEATHER ================= */

async function loadWeather(
  fetcher,
  successLabel
) {
  const requestId =
    ++activeRequestId;

  clearStatus(
    elements.status
  );

  setLoading(
    elements.searchButton,
    true
  );

  elements.locationButton.disabled =
    true;

  showLoadingSkeleton();

  try {
    const data =
      await fetcher();

    if (
      requestId !== activeRequestId
    ) {
      return;
    }

    const weather =
      new WeatherData(
        data.currentWeather,
        data.airQuality,
        data.uvIndex
      );

    currentDashboard = {
      weather,

      hourly:
        createHourlyForecast(
          data.forecast
        ),

      daily:
        createFiveDayForecast(
          data.forecast
        ),
    };

    renderAllWeather();

    recentCities =
      addRecentCity(
        recentCities,
        weather.city
      );

    saveRecentCities(
      recentCities
    );

    renderSavedCities();

    elements.cityInput.value =
      weather.city;

    showSuccess(
      elements.status,
      successLabel ||
        `Weather loaded for ${weather.locationName}.`
    );
  } catch (error) {
    if (
      requestId !== activeRequestId
    ) {
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
    if (
      requestId === activeRequestId
    ) {
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
  const normalizedCity =
    city.trim();

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

function searchWeatherByLocation(
  location
) {
  if (
    !location ||
    !Number.isFinite(
      location.latitude
    ) ||
    !Number.isFinite(
      location.longitude
    )
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
    inputElement:
      elements.cityInput,

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
          error.code ===
          error.TIMEOUT
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
  loadFavoriteCityWeather();
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

/* ================= SHARE WEATHER ================= */

async function shareCurrentWeather() {
  if (!currentDashboard) {
    showError(
      elements.status,
      "Search for a city before sharing weather."
    );

    return;
  }

  const weather =
    currentDashboard.weather;

  const shareText =
    buildWeatherShareText(
      weather
    );

  const shareData = {
    title:
      `WeatherScope — ${weather.locationName}`,

    text:
      shareText,

    url:
      window.location.href,
  };

  try {
    if (navigator.share) {
      await navigator.share(
        shareData
      );

      showSuccess(
        elements.status,
        "Weather shared successfully."
      );

      return;
    }

    if (
      navigator.clipboard?.writeText
    ) {
      await navigator.clipboard.writeText(
        `${shareText}\n${window.location.href}`
      );

      showSuccess(
        elements.status,
        "Weather copied to clipboard."
      );

      return;
    }

    throw new Error(
      "Sharing is not supported."
    );
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      return;
    }

    showError(
      elements.status,
      "Unable to share weather."
    );
  }
}

elements.shareWeatherButton
  ?.addEventListener(
    "click",
    shareCurrentWeather
  );

  elements.customizeRecommendationsButton
  ?.addEventListener(
    "click",
    () => {
      const isHidden =
        elements.recommendationSettings
          .hidden;

      elements.recommendationSettings.hidden =
        !isHidden;

      elements.customizeRecommendationsButton
        .setAttribute(
          "aria-expanded",
          String(isHidden)
        );
    }
  );

  elements.recommendationSettings
  ?.addEventListener(
    "change",
    (event) => {
      const checkbox =
        event.target.closest(
          "[data-recommendation-preference]"
        );

      if (!checkbox) {
        return;
      }

      const preferenceKey =
        checkbox.dataset
          .recommendationPreference;

      recommendationPreferences = {
        ...recommendationPreferences,
        [preferenceKey]:
          checkbox.checked,
      };

      saveRecommendationPreferences(
        recommendationPreferences
      );

      renderCurrentRecommendations();
    }
  );

  elements.resetRecommendationsButton
  ?.addEventListener(
    "click",
    () => {
      recommendationPreferences =
        resetRecommendationPreferences();

      syncRecommendationSettings();
      renderCurrentRecommendations();

      showSuccess(
        elements.status,
        "Recommendation preferences reset."
      );
    }
  );
/* ================= SAVED CITY ACTIONS ================= */

function handleCityListClick(
  event,
  isFavorites
) {
  const button =
    event.target.closest(
      "button[data-action]"
    );

  if (!button) {
    return;
  }

  const city =
    button.dataset.city;

  const action =
    button.dataset.action;

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
    recentCities =
      removeRecentCity(
        recentCities,
        city
      );

    saveRecentCities(
      recentCities
    );

    renderSavedCities();
    syncRecommendationSettings();
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

elements.clearRecentButton
  .addEventListener(
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

updateUnitButtons(
  elements.metricButton,
  elements.imperialButton,
  unit
);

renderSavedCities();

/* ================= PWA INSTALLATION ================= */

function registerServiceWorker() {
  if (
    !(
      "serviceWorker" in
      navigator
    )
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

    deferredInstallPrompt =
      event;

    if (
      elements.installAppButton
    ) {
      elements.installAppButton.hidden =
        false;
    }
  }
);

elements.installAppButton
  ?.addEventListener(
    "click",
    async () => {
      if (
        !deferredInstallPrompt
      ) {
        return;
      }

      deferredInstallPrompt.prompt();

      const choice =
        await deferredInstallPrompt
          .userChoice;

      if (
        choice.outcome ===
        "accepted"
      ) {
        showSuccess(
          elements.status,
          "WeatherScope installation started."
        );
      }

      deferredInstallPrompt =
        null;

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
    deferredInstallPrompt =
      null;

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

/* ================= KEYBOARD SHORTCUTS ================= */

document.addEventListener(
  "keydown",
  (event) => {
    const activeElement =
      document.activeElement;

    const isTyping =
      activeElement instanceof
        HTMLInputElement ||
      activeElement instanceof
        HTMLTextAreaElement ||
      activeElement?.isContentEditable;

    const isSearchShortcut =
      event.key === "/" ||
      ((event.ctrlKey ||
        event.metaKey) &&
        event.key.toLowerCase() ===
          "k");

    if (
      isSearchShortcut &&
      !isTyping
    ) {
      event.preventDefault();

      elements.cityInput.focus();
      elements.cityInput.select();

      showSuccess(
        elements.status,
        "Search focused. Start typing a city."
      );

      return;
    }

    if (
      event.key === "Escape"
    ) {
      cityAutocomplete.close();

      if (
        activeElement ===
        elements.cityInput
      ) {
        elements.cityInput.blur();
      }

      clearStatus(
        elements.status
      );
    }
  }
);

registerServiceWorker();