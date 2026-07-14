import { formatTemperature, formatWind } from "./models.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function setLoading(button, isLoading) {
  if (!button) return;
  button.disabled = isLoading;
  button.classList.toggle("is-loading", isLoading);
  button.setAttribute("aria-busy", String(isLoading));
}

export function clearStatus(element) {
  element.textContent = "";
  element.className = "status";
}

export function showError(element, message) {
  element.textContent = message;
  element.className = "status error";
}

export function showSuccess(element, message) {
  element.textContent = message;
  element.className = "status success";
}

export function renderWeather(container, weather, unit, isFavorite) {
  container.innerHTML = `
    <article class="weather-card">
      <header class="weather-card-header">
        <div>
          <p class="location-label">Current conditions</p>
          <div class="city-title-row">
            <h2 class="city-name">${escapeHtml(weather.locationName)}</h2>
            <button id="favoriteCurrentBtn" class="favorite-current-btn ${isFavorite ? "active" : ""}" type="button" aria-label="${isFavorite ? "Remove from" : "Add to"} favourites" title="Toggle favourite">${isFavorite ? "★" : "☆"}</button>
          </div>
          <p class="local-time">${escapeHtml(weather.formatLocalDateTime())}</p>
        </div>
        ${weather.iconUrl ? `<img class="weather-icon" src="${escapeHtml(weather.iconUrl)}" alt="${escapeHtml(weather.description)}">` : ""}
      </header>

      <div class="weather-primary">
        <div>
          <p class="temperature">${formatTemperature(weather.temperature, unit)}</p>
          <p class="condition">${escapeHtml(weather.description)}</p>
        </div>
        <div class="temp-range">
          <p>High: <strong>${formatTemperature(weather.maximumTemperature, unit)}</strong></p>
          <p>Low: <strong>${formatTemperature(weather.minimumTemperature, unit)}</strong></p>
        </div>
      </div>

      <dl class="weather-details">
        <div class="detail-card"><dt>Feels like</dt><dd>${formatTemperature(weather.feelsLike, unit)}</dd></div>
        <div class="detail-card"><dt>Humidity</dt><dd>${Math.round(weather.humidity)}%</dd></div>
        <div class="detail-card"><dt>Wind</dt><dd>${formatWind(weather.windSpeed, unit)}</dd></div>
        <div class="detail-card"><dt>Pressure</dt><dd>${Math.round(weather.pressure)} hPa</dd></div>
        <div class="detail-card accent-card"><dt>Air quality</dt><dd>${weather.aqi ? `${weather.aqi}/5 · ${weather.aqiLabel}` : "Unavailable"}</dd><small>${weather.pm25 !== null ? `PM2.5 ${weather.pm25.toFixed(1)} μg/m³` : ""}</small></div>
        <div class="detail-card accent-card"><dt>UV index</dt><dd>${weather.uvIndex !== null ? `${weather.uvIndex.toFixed(1)} · ${weather.uvLabel}` : "Unavailable"}</dd></div>
        <div class="detail-card"><dt>Sunrise</dt><dd>${escapeHtml(weather.formatCityTime(weather.sunriseTimestamp))}</dd></div>
        <div class="detail-card"><dt>Sunset</dt><dd>${escapeHtml(weather.formatCityTime(weather.sunsetTimestamp))}</dd></div>
      </dl>
    </article>`;
}

export function renderHourly(section, container, items, unit) {
  container.innerHTML = items.map((item) => `
    <article class="hourly-card">
      <p class="hourly-time">${escapeHtml(item.time)}</p>
      ${item.iconUrl ? `<img src="${escapeHtml(item.iconUrl)}" alt="${escapeHtml(item.description)}">` : ""}
      <strong>${formatTemperature(item.temperature, unit)}</strong>
      <span>${escapeHtml(item.description)}</span>
    </article>`).join("");
  section.hidden = items.length === 0;
}

export function renderForecast(section, container, items, unit) {
  container.innerHTML = items.map((item) => `
    <article class="forecast-card">
      <div class="forecast-date"><p class="forecast-day">${item.day}</p><p class="forecast-calendar-date">${item.date}</p></div>
      ${item.iconUrl ? `<img class="forecast-icon" src="${escapeHtml(item.iconUrl)}" alt="${escapeHtml(item.description)}">` : ""}
      <p class="forecast-description">${escapeHtml(item.description)}</p>
      <p class="forecast-temperatures"><strong>${formatTemperature(item.maximumTemperature, unit)}</strong><span>${formatTemperature(item.minimumTemperature, unit)}</span></p>
    </article>`).join("");
  section.hidden = items.length === 0;
}

export function clearForecast(...pairs) {
  for (let index = 0; index < pairs.length; index += 2) {
    const section = pairs[index];
    const container = pairs[index + 1];
    if (section && container) {
      container.innerHTML = "";
      section.hidden = true;
    }
  }
}

function renderCityPills(listElement, cities, removable, emptyElement) {
  listElement.innerHTML = "";
  emptyElement.hidden = cities.length > 0;

  cities.forEach((city) => {
    const item = document.createElement("li");
    item.className = "recent-item";
    item.innerHTML = `<button type="button" class="recent-city-button" data-action="search" data-city="${escapeHtml(city)}">${escapeHtml(city)}</button>${removable ? `<button type="button" class="remove-city-button" data-action="remove" data-city="${escapeHtml(city)}" aria-label="Remove ${escapeHtml(city)}">×</button>` : ""}`;
    listElement.appendChild(item);
  });
}

export function renderRecentCities({ listElement, emptyElement, clearButton, cities }) {
  renderCityPills(listElement, cities, true, emptyElement);
  clearButton.hidden = cities.length === 0;
}

export function renderFavoriteCities({ listElement, emptyElement, cities }) {
  renderCityPills(listElement, cities, false, emptyElement);
}

export function updateUnitButtons(metricButton, imperialButton, unit) {
  metricButton.classList.toggle("active", unit === "metric");
  imperialButton.classList.toggle("active", unit === "imperial");
  metricButton.setAttribute("aria-pressed", String(unit === "metric"));
  imperialButton.setAttribute("aria-pressed", String(unit === "imperial"));
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const button = document.getElementById("themeBtn");
  if (button) {
    button.textContent = theme === "dark" ? "☀️ Light" : "🌙 Dark";
    button.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
  }
}
