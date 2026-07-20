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
  loadUnit,
  removeRecentCity,
  resetRecommendationPreferences,
  saveFavoriteCities,
  saveRecentCities,
  saveRecommendationPreferences,
  saveUnit,
  toggleFavoriteCity,
} from "./storage.js";

import {
  applyTheme, 
  applyWeatherTheme,
  clearForecast,
  clearRecommendations,
  clearStatus,
  hideDashboardSkeleton,
  renderFavoriteCities,
  renderForecast,
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

/* ================= APP ROOT ================= */

const app =
  document.getElementById("weatherApp");

/* ================= DOM ELEMENTS ================= */

const elements = {
  homeButton:
    document.getElementById("homeButton"),

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

  resultSection:
    document.getElementById("resultSection"),

  weatherResult:
    document.getElementById("weatherResult"),

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
    themeButton:
  document.getElementById("themeBtn"),
};


/* ================= APP STATE ================= */

let recentCities =
  loadRecentCities();

let favoriteCities =
  loadFavoriteCities();

let unit =
  loadUnit();

let recommendationPreferences =
  loadRecommendationPreferences();

let currentDashboard = null;
let activeRequestId = 0;
let deferredInstallPrompt = null;

const favoriteWeatherCache =
  new Map();

/* ================= HELPERS ================= */

function isCurrentFavorite() {
  if (!currentDashboard) {
    return false;
  }

  const currentCity =
    currentDashboard.weather.city
      .toLowerCase();

  return favoriteCities.some(
    (city) =>
      city.toLowerCase() ===
      currentCity
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

  checkboxes.forEach(
    (checkbox) => {
      const preferenceKey =
        checkbox.dataset
          .recommendationPreference;

      checkbox.checked =
        recommendationPreferences[
          preferenceKey
        ] !== false;
    }
  );
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

async function loadSavedCityWeather() {
  const favoriteCards =
    elements.favoriteList
      ? [
          ...elements.favoriteList.querySelectorAll(
            ".favorite-weather-card"
          ),
        ]
      : [];

  const recentCards =
    elements.recentList
      ? [
          ...elements.recentList.querySelectorAll(
            ".recent-item"
          ),
        ]
      : [];

  const cards = [
    ...favoriteCards,
    ...recentCards,
  ];

  if (cards.length === 0) {
    return;
  }

  await Promise.all(
    cards.map(
      async (card) => {
        const searchButton =
  card.querySelector(
    'button[data-action="search"]'
  );

const iconContainer =
  card.querySelector(
    ".favorite-card-icon, .recent-card-icon"
  );

const information =
  card.querySelector(
    ".favorite-card-info span, .recent-card-info"
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

          const weatherMain =
  current?.weather?.[0]?.main ||
  "";

const description =
  current?.weather?.[0]
    ?.description ||
  "Weather unavailable";

          const temperature =
            current?.main?.temp;

          const normalizedCondition =
  weatherMain
    .trim()
    .toLowerCase();

let iconName =
  "partly_cloudy_day";

if (
  normalizedCondition.includes(
    "clear"
  )
) {
  iconName = "clear_day";
} else if (
  normalizedCondition.includes(
    "cloud"
  )
) {
  iconName =
    "partly_cloudy_day";
} else if (
  normalizedCondition.includes(
    "rain"
  ) ||
  normalizedCondition.includes(
    "drizzle"
  )
) {
  iconName = "rainy";
} else if (
  normalizedCondition.includes(
    "thunder"
  )
) {
  iconName =
    "thunderstorm";
} else if (
  normalizedCondition.includes(
    "snow"
  )
) {
  iconName = "weather_snowy";
} else if (
  normalizedCondition.includes(
    "mist"
  ) ||
  normalizedCondition.includes(
    "fog"
  ) ||
  normalizedCondition.includes(
    "haze"
  )
) {
  iconName = "foggy";
}

iconContainer.innerHTML = `
  <span
    class="material-symbols-outlined text-[28px] text-primary"
    aria-label="${description}"
    role="img"
    style="
      font-variation-settings:
        'FILL' 0,
        'wght' 300,
        'GRAD' 0,
        'opsz' 32;
    "
  >
    ${iconName}
  </span>
`;

          information.innerHTML = Number.isFinite(temperature)
  ? `
      <span class="block text-sm font-extrabold text-on-surface">
        ${formatTemperature(temperature, unit)}
      </span>

      <span class="block text-[11px] text-on-surface-variant">
        ${description}
      </span>
    `
  : `
      <span class="block text-[11px] text-on-surface-variant">
        Weather unavailable
      </span>
    `;
        } catch (error) {
          console.error(
            `Unable to load favourite weather for ${city}:`,
            error
          );

         iconContainer.innerHTML = `
  <span
    class="material-symbols-outlined text-[28px] text-outline"
    aria-hidden="true"
  >
    partly_cloudy_day
  </span>
`;

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

  app?.classList.remove(
    "is-home"
  );

  if (elements.resultSection) {
    elements.resultSection.hidden =
      false;
  }

  renderWeather(
    elements.weatherResult,
    weather,
    unit,
    isCurrentFavorite()
  );

  applyWeatherTheme(weather);

  renderCurrentRecommendations();

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

  renderWeatherMap({
    mapElement:
      elements.weatherMap,

    mapSection:
      elements.mapSection,

    weather,
  });

  if (
    elements.shareWeatherButton
  ) {
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

  loadSavedCityWeather();
}

/* ================= LOADING AND CLEARING ================= */

function showLoadingSkeleton() {
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
  elements.weatherResult
    .replaceChildren();

  if (elements.resultSection) {
    elements.resultSection.hidden =
      true;
  }

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

  if (
    elements.shareWeatherButton
  ) {
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

  if (elements.resultSection) {
    elements.resultSection.hidden =
      false;
  }

  showLoadingSkeleton();

  try {
    const data =
      await fetcher();

    if (
      requestId !==
      activeRequestId
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
      requestId !==
      activeRequestId
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
      requestId ===
      activeRequestId
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

elements.searchForm
  ?.addEventListener(
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

const AUTO_LOCATION_KEY =
  "weatherscope:auto-location-enabled";

function hasEnabledAutomaticLocation() {
  return (
    localStorage.getItem(
      AUTO_LOCATION_KEY
    ) === "true"
  );
}

function enableAutomaticLocation() {
  localStorage.setItem(
    AUTO_LOCATION_KEY,
    "true"
  );
}

function disableAutomaticLocation() {
  localStorage.removeItem(
    AUTO_LOCATION_KEY
  );
}

function loadCurrentLocationWeather({
  automatic = false,
} = {}) {
  cityAutocomplete.close();

  if (!navigator.geolocation) {
    if (!automatic) {
      showError(
        elements.status,
        "Geolocation is not supported by this browser."
      );
    }

    return;
  }

  if (!automatic) {
    showSuccess(
      elements.status,
      "Requesting your location…"
    );
  }

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      /*
       * 사용자가 버튼을 눌러 위치 요청에 성공했으면,
       * 다음 방문부터 자동으로 불러오도록 기억한다.
       */
      if (!automatic) {
        enableAutomaticLocation();
      }

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
      /*
       * 권한이 취소되었거나 차단된 경우에는
       * 다음 방문 자동 실행도 중단한다.
       */
      if (
        error.code ===
        error.PERMISSION_DENIED
      ) {
        disableAutomaticLocation();
      }

      if (automatic) {
        console.info(
          "Automatic location lookup was unavailable:",
          error.message
        );

        return;
      }

      if (
        error.code ===
        error.PERMISSION_DENIED
      ) {
        showError(
          elements.status,
          "Location permission was denied. Enable it in your browser settings or search for a city."
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
      timeout: 15000,
      maximumAge: 600000,
    }
  );
}

elements.locationButton
  ?.addEventListener(
    "click",
    () => {
      loadCurrentLocationWeather({
        automatic: false,
      });
    }
  );

  /* ================= TEMPERATURE UNIT ================= */

function setUnit(nextUnit) {
  unit = nextUnit;

  saveUnit(unit);

  renderAllWeather();
  renderSavedCities();
}

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
      navigator.clipboard
        ?.writeText
    ) {
      await navigator.clipboard
        .writeText(
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

/* ================= RECOMMENDATION SETTINGS ================= */

elements.customizeRecommendationsButton
  ?.addEventListener(
    "click",
    () => {
      if (
        !elements.recommendationSettings
      ) {
        return;
      }

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
  action === "favorite"
) {
  favoriteCities =
    toggleFavoriteCity(
      favoriteCities,
      city
    );

  saveFavoriteCities(
    favoriteCities
  );

  renderSavedCities();

  showSuccess(
    elements.status,
    `${city} favourites updated.`
  );

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
}
}

elements.recentList
  ?.addEventListener(
    "click",
    (event) => {
      handleCityListClick(
        event,
        false
      );
    }
  );

elements.favoriteList
  ?.addEventListener(
    "click",
    (event) => {
      handleCityListClick(
        event,
        true
      );
    }
  );

elements.clearRecentButton
  ?.addEventListener(
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

elements.weatherResult
  ?.addEventListener(
    "click",
    (event) => {
      const metricButton =
        event.target.closest(
          "#weatherMetricBtn"
        );

      if (metricButton) {
        setUnit("metric");
        return;
      }

      const imperialButton =
        event.target.closest(
          "#weatherImperialBtn"
        );

      if (imperialButton) {
        setUnit("imperial");
        return;
      }

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
          currentDashboard
            .weather
            .city
        );

      saveFavoriteCities(
        favoriteCities
      );

      renderSavedCities();
      renderAllWeather();
    }
  );
/* ================= HOME BUTTON ================= */

elements.homeButton
  ?.addEventListener(
    "click",
    () => {
      currentDashboard = null;

      activeRequestId += 1;

      clearWeatherResults();
      clearStatus(
        elements.status
      );

      cityAutocomplete.close();

      elements.cityInput.value =
        "";

      if (
        elements.recommendationSettings
      ) {
        elements.recommendationSettings.hidden =
          true;
      }

      elements.customizeRecommendationsButton
        ?.setAttribute(
          "aria-expanded",
          "false"
        );

      app?.classList.add(
        "is-home"
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      window.setTimeout(
        () => {
          elements.cityInput.focus();
        },
        300
      );
    }
  );

/* ================= THEME ================= */

const THEME_KEY = "weatherscope:theme";

function setTheme(theme) {
  const isDark = theme === "dark";

  document.documentElement.classList.toggle(
    "dark",
    isDark
  );

  document.documentElement.classList.toggle(
    "light",
    !isDark
  );

  localStorage.setItem(
    THEME_KEY,
    theme
  );

  const icon =
    elements.themeButton?.querySelector(
      ".material-symbols-outlined"
    );

  if (icon) {
    icon.textContent =
      isDark
        ? "light_mode"
        : "dark_mode";
  }
}

const savedTheme =
  localStorage.getItem(
    THEME_KEY
  ) || "light";

setTheme(savedTheme);

elements.themeButton
  ?.addEventListener(
    "click",
    () => {
      const nextTheme =
        document.documentElement.classList.contains(
          "dark"
        )
          ? "light"
          : "dark";

      setTheme(nextTheme);
    }
  );
/* ================= INITIAL SETTINGS ================= */


renderSavedCities();
syncRecommendationSettings();

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

    const params = new URLSearchParams(
      window.location.search
    );

    const city = params.get("city");

    if (city) {
      elements.cityInput.value = city;
      searchWeather(city);
      return;
    }

    if (
      hasEnabledAutomaticLocation()
    ) {
      loadCurrentLocationWeather({
        automatic: true,
      });

      return;
    }

    elements.cityInput?.focus();
  },
  {
    once: true,
  }
);
}

/* ================= AUTOMATIC START LOCATION ================= */

window.addEventListener(
  "load",
  () => {
    if (
      hasEnabledAutomaticLocation()
    ) {
      loadCurrentLocationWeather({
        automatic: true,
      });

      return;
    }

    elements.cityInput?.focus();
  },
  {
    once: true,
  }
);

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

      deferredInstallPrompt
        .prompt();

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
      activeElement
        ?.isContentEditable;

    const isSearchShortcut =
      event.key === "/" ||
      (
        (
          event.ctrlKey ||
          event.metaKey
        ) &&
        event.key
          .toLowerCase() ===
          "k"
      );

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