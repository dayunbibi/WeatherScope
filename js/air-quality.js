const SELECTED_LOCATION_KEY = "weatherscope:selected-location";
const RECENT_CITIES_KEY = "weather-finder:recent-cities";
const THEME_KEY = "weather-finder:theme";
const REQUEST_TIMEOUT_MS = 12000;

const elements = {
  locationName: document.getElementById("locationName"),
  statusMessage: document.getElementById("statusMessage"),
  content: document.getElementById("airQualityContent"),
  refreshButton: document.getElementById("refreshBtn"),
  themeButton: document.getElementById("themeBtn"),
  aqiRing: document.getElementById("aqiRing"),
  aqiValue: document.getElementById("aqiValue"),
  aqiBadge: document.getElementById("aqiBadge"),
  aqiStatus: document.getElementById("aqiStatus"),
  aqiDescription: document.getElementById("aqiDescription"),
  healthAdvice: document.getElementById("healthAdvice"),
  updatedTime: document.getElementById("updatedTime"),
  localTime: document.getElementById("localTime"),
  pm25: document.getElementById("pm25Value"),
  pm10: document.getElementById("pm10Value"),
  o3: document.getElementById("o3Value"),
  no2: document.getElementById("no2Value"),
  so2: document.getElementById("so2Value"),
  co: document.getElementById("coValue")
};

function loadSelectedLocation() {
  try {
    const saved = JSON.parse(localStorage.getItem(SELECTED_LOCATION_KEY) || "null");
    if (saved && typeof saved === "object") return saved;
  } catch {
    // Ignore malformed stored data.
  }

  try {
    const recentCities = JSON.parse(localStorage.getItem(RECENT_CITIES_KEY) || "[]");
    if (Array.isArray(recentCities) && typeof recentCities[0] === "string") {
      return { city: recentCities[0] };
    }
  } catch {
    // Ignore malformed stored data.
  }

  return null;
}

function setStatus(message, type = "info") {
  elements.statusMessage.textContent = message;
  elements.statusMessage.hidden = false;
  elements.statusMessage.classList.remove(
    "text-error",
    "border-error/30",
    "bg-error-container/40"
  );

  if (type === "error") {
    elements.statusMessage.classList.add(
      "text-error",
      "border-error/30",
      "bg-error-container/40"
    );
  }
}

function hideStatus() {
  elements.statusMessage.hidden = true;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Unable to load air quality data.");
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The request timed out. Check your connection and try again.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function buildWeatherUrl(location) {
  const params = new URLSearchParams();

  if (Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude)) {
    params.set("lat", String(location.latitude));
    params.set("lon", String(location.longitude));
  } else if (typeof location?.city === "string" && location.city.trim()) {
    params.set("city", location.city.trim());
  } else {
    throw new Error("Choose a city on the Dashboard first.");
  }

  return `/api/weather?${params.toString()}`;
}

function getAqiMeta(aqi) {
  const categories = {
    1: {
      label: "Good",
      description: "Air quality is considered satisfactory, and air pollution poses little or no risk.",
      advice: "Outdoor activities are suitable for most people. Enjoy normal ventilation and exercise.",
      badgeClasses: ["bg-emerald-100", "text-emerald-700"]
    },
    2: {
      label: "Fair",
      description: "Air quality is generally acceptable, although very sensitive people may notice minor effects.",
      advice: "Most people can continue normal outdoor activities. Sensitive individuals can take breaks if irritation occurs.",
      badgeClasses: ["bg-lime-100", "text-lime-700"]
    },
    3: {
      label: "Moderate",
      description: "Pollution levels are elevated. Sensitive groups may experience mild health effects.",
      advice: "Children, older adults, and people with respiratory conditions should consider reducing prolonged outdoor exertion.",
      badgeClasses: ["bg-amber-100", "text-amber-700"]
    },
    4: {
      label: "Poor",
      description: "Air pollution is high enough to affect sensitive groups and may affect the general population.",
      advice: "Reduce strenuous outdoor activity. Keep windows closed when practical and monitor symptoms.",
      badgeClasses: ["bg-orange-100", "text-orange-700"]
    },
    5: {
      label: "Very Poor",
      description: "Air pollution is very high and can pose a health risk to everyone.",
      advice: "Avoid strenuous outdoor activity. Sensitive groups should remain indoors where air is filtered when possible.",
      badgeClasses: ["bg-red-100", "text-red-700"]
    }
  };

  return categories[aqi] || {
    label: "Unavailable",
    description: "The air quality category is not available for this location.",
    advice: "Check again later for updated health guidance.",
    badgeClasses: ["bg-surface-container", "text-on-surface-variant"]
  };
}

function formatReading(value) {
  return Number.isFinite(value) ? value.toFixed(value >= 100 ? 0 : 1) : "--";
}

function formatLocation(currentWeather) {
  const city = currentWeather?.name || "Selected city";
  const country = currentWeather?.sys?.country || "";
  return country ? `${city}, ${country}` : city;
}

function formatLocalTime(timezoneOffsetSeconds) {
  if (!Number.isFinite(timezoneOffsetSeconds)) return "--:--";

  const utcMilliseconds = Date.now() + new Date().getTimezoneOffset() * 60_000;
  const localDate = new Date(utcMilliseconds + timezoneOffsetSeconds * 1000);

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(localDate);
}

function renderAirQuality(data) {
  const currentWeather = data?.currentWeather;
  const airQuality = data?.airQuality;
  const aqi = Number(airQuality?.main?.aqi);
  const components = airQuality?.components || {};
  const meta = getAqiMeta(aqi);

  elements.locationName.textContent = formatLocation(currentWeather);
  elements.aqiValue.textContent = Number.isFinite(aqi) ? `${aqi}/5` : "--";
  elements.aqiStatus.textContent = meta.label;
  elements.aqiDescription.textContent = meta.description;
  elements.healthAdvice.textContent = meta.advice;
  elements.aqiBadge.textContent = Number.isFinite(aqi) ? `Level ${aqi}` : "Unavailable";

  elements.aqiBadge.className = "rounded-full px-3 py-1.5 text-xs font-extrabold";
  elements.aqiBadge.classList.add(...meta.badgeClasses);

  const progress = Number.isFinite(aqi) ? Math.max(0, Math.min(5, aqi)) * 72 : 0;
  elements.aqiRing.style.setProperty("--progress", `${progress}deg`);

  elements.pm25.textContent = formatReading(components.pm2_5);
  elements.pm10.textContent = formatReading(components.pm10);
  elements.o3.textContent = formatReading(components.o3);
  elements.no2.textContent = formatReading(components.no2);
  elements.so2.textContent = formatReading(components.so2);
  elements.co.textContent = formatReading(components.co);

  elements.localTime.textContent = formatLocalTime(currentWeather?.timezone);
  elements.updatedTime.textContent = `Updated ${new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date())}`;

  elements.content.hidden = false;
  hideStatus();
}

async function loadAirQuality() {
  const location = loadSelectedLocation();

  if (!location) {
    elements.content.hidden = true;
    elements.locationName.textContent = "no city selected";
    setStatus("Choose a city on the Dashboard first, then open Air Quality.", "error");
    return;
  }

  setStatus("Loading air quality data…");
  elements.refreshButton.disabled = true;
  elements.refreshButton.classList.add("loading-pulse");

  try {
    const data = await fetchJson(buildWeatherUrl(location));
    renderAirQuality(data);
  } catch (error) {
    elements.content.hidden = true;
    setStatus(error instanceof Error ? error.message : "Unable to load air quality data.", "error");
  } finally {
    elements.refreshButton.disabled = false;
    elements.refreshButton.classList.remove("loading-pulse");
  }
}

function applyTheme(theme) {
  const useDark = theme === "dark";
  document.documentElement.classList.toggle("dark", useDark);
  document.documentElement.classList.toggle("light", !useDark);

  const icon = elements.themeButton?.querySelector(".material-symbols-outlined");
  if (icon) icon.textContent = useDark ? "light_mode" : "dark_mode";
}

function initializeTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(savedTheme);
}

elements.refreshButton?.addEventListener("click", loadAirQuality);

elements.themeButton?.addEventListener("click", () => {
  const isDark = document.documentElement.classList.contains("dark");
  const nextTheme = isDark ? "light" : "dark";
  localStorage.setItem(THEME_KEY, nextTheme);
  applyTheme(nextTheme);
});

initializeTheme();
loadAirQuality();
