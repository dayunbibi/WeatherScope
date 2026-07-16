import {
  formatTemperature,
  formatWind,
} from "./models.js";

/* ================= HELPERS ================= */

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ================= LOADING ================= */

export function setLoading(button, isLoading) {
  if (!button) {
    return;
  }

  button.disabled = isLoading;
  button.classList.toggle(
    "is-loading",
    isLoading
  );

  button.setAttribute(
    "aria-busy",
    String(isLoading)
  );
}

export function showDashboardSkeleton({
  weatherContainer,
  hourlySection,
  hourlyContainer,
  forecastSection,
  forecastContainer,
  mapSection,
}) {
  weatherContainer.innerHTML = `
    <article
      class="weather-card skeleton-card"
      aria-hidden="true"
    >
      <header class="weather-card-header">
        <div class="skeleton-header-copy">
          <div class="skeleton skeleton-label"></div>
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-subtitle"></div>
        </div>

        <div
          class="skeleton skeleton-weather-icon"
        ></div>
      </header>

      <div class="weather-primary">
        <div>
          <div
            class="skeleton skeleton-temperature"
          ></div>

          <div
            class="skeleton skeleton-condition"
          ></div>
        </div>

        <div class="skeleton-range">
          <div
            class="skeleton skeleton-range-line"
          ></div>

          <div
            class="skeleton skeleton-range-line"
          ></div>
        </div>
      </div>

      <div class="weather-details skeleton-details">
        ${Array.from(
          { length: 8 },
          () => `
            <div
              class="detail-card skeleton-detail-card"
            >
              <div
                class="skeleton skeleton-detail-label"
              ></div>

              <div
                class="skeleton skeleton-detail-value"
              ></div>
            </div>
          `
        ).join("")}
      </div>
    </article>
  `;

  hourlySection.hidden = false;

  hourlyContainer.innerHTML = Array.from(
    { length: 6 },
    () => `
      <article
        class="hourly-card skeleton-hourly-card"
        aria-hidden="true"
      >
        <div
          class="skeleton skeleton-hour"
        ></div>

        <div
          class="skeleton skeleton-hourly-icon"
        ></div>

        <div
          class="skeleton skeleton-hourly-temp"
        ></div>

        <div
          class="skeleton skeleton-hourly-text"
        ></div>
      </article>
    `
  ).join("");

  forecastSection.hidden = false;

  forecastContainer.innerHTML = Array.from(
    { length: 5 },
    () => `
      <article
        class="forecast-card skeleton-forecast-card"
        aria-hidden="true"
      >
        <div class="skeleton-forecast-date">
          <div
            class="skeleton skeleton-forecast-day"
          ></div>

          <div
            class="skeleton skeleton-forecast-calendar"
          ></div>
        </div>

        <div
          class="skeleton skeleton-forecast-icon"
        ></div>

        <div
          class="skeleton skeleton-forecast-description"
        ></div>

        <div
          class="skeleton skeleton-forecast-temperature"
        ></div>
      </article>
    `
  ).join("");

  if (mapSection) {
    mapSection.hidden = true;
  }

  weatherContainer.setAttribute(
    "aria-busy",
    "true"
  );
}

export function hideDashboardSkeleton(
  weatherContainer
) {
  weatherContainer.removeAttribute(
    "aria-busy"
  );
}

/* ================= STATUS ================= */

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

/* ================= CURRENT WEATHER ================= */

export function renderWeather(
  container,
  weather,
  unit,
  isFavorite
) {
  container.innerHTML = `
    <article class="weather-card">
      <header class="weather-card-header">
        <div>
          <p class="location-label">
            Current conditions
          </p>

          <div class="city-title-row">
            <h2 class="city-name">
              ${escapeHtml(weather.locationName)}
            </h2>

            <button
              id="favoriteCurrentBtn"
              class="favorite-current-btn ${
                isFavorite ? "active" : ""
              }"
              type="button"
              aria-label="${
                isFavorite
                  ? "Remove from favourites"
                  : "Add to favourites"
              }"
              title="Toggle favourite"
            >
              ${isFavorite ? "★" : "☆"}
            </button>
          </div>

          <p class="local-time">
            ${escapeHtml(
              weather.formatLocalDateTime()
            )}
          </p>
        </div>

        ${
          weather.iconUrl
            ? `
              <img
                class="weather-icon"
                src="${escapeHtml(
                  weather.iconUrl
                )}"
                alt="${escapeHtml(
                  weather.description
                )}"
              >
            `
            : ""
        }
      </header>

      <div class="weather-primary">
        <div>
          <p class="temperature">
            ${formatTemperature(
              weather.temperature,
              unit
            )}
          </p>

          <div class="condition-row">
  <span
    class="condition-dot condition-${document.body.dataset.weather || "default"}"
    aria-hidden="true"
  ></span>

  <p class="condition">
    ${escapeHtml(weather.description)}
  </p>
</div>
        </div>

        <div class="temp-range">
          <p>
            High:
            <strong>
              ${formatTemperature(
                weather.maximumTemperature,
                unit
              )}
            </strong>
          </p>

          <p>
            Low:
            <strong>
              ${formatTemperature(
                weather.minimumTemperature,
                unit
              )}
            </strong>
          </p>
        </div>
      </div>

      <dl class="weather-details">
        <div class="detail-card">
          <dt>Feels like</dt>

          <dd>
            ${formatTemperature(
              weather.feelsLike,
              unit
            )}
          </dd>
        </div>

        <div class="detail-card">
          <dt>Humidity</dt>

          <dd>
            ${Math.round(weather.humidity)}%
          </dd>
        </div>

        <div class="detail-card">
          <dt>Wind</dt>

          <dd>
            ${formatWind(
              weather.windSpeed,
              unit
            )}
          </dd>
        </div>

        <div class="detail-card">
          <dt>Pressure</dt>

          <dd>
            ${Math.round(
              weather.pressure
            )} hPa
          </dd>
        </div>

        <div
          class="detail-card aqi-card aqi-${escapeHtml(
            weather.aqiClass
          )}"
        >
          <div class="detail-card-heading">
            <dt>Air quality</dt>

            <span class="aqi-status">
              ${escapeHtml(
                weather.aqiLabel
              )}
            </span>
          </div>

          <dd class="aqi-value">
            ${
              weather.aqi !== null
                ? `${weather.aqi}/5`
                : "Unavailable"
            }
          </dd>

          <small class="aqi-pm25">
            ${
              weather.pm25 !== null
                ? `PM2.5 ${escapeHtml(
                    weather.formattedPm25
                  )}`
                : "PM2.5 unavailable"
            }
          </small>
        </div>

        <div class="detail-card">
          <dt>UV index</dt>

          <dd>
            ${
              weather.uvIndex !== null
                ? `${weather.uvIndex.toFixed(
                    1
                  )} · ${escapeHtml(
                    weather.uvLabel
                  )}`
                : "Unavailable"
            }
          </dd>
        </div>

        <div class="detail-card">
          <dt>Sunrise</dt>

          <dd>
            ${escapeHtml(
              weather.sunriseTime
            )}
          </dd>
        </div>

        <div class="detail-card">
          <dt>Sunset</dt>

          <dd>
            ${escapeHtml(
              weather.sunsetTime
            )}
          </dd>
        </div>
      </dl>
    </article>
  `;
}

/* ================= HOURLY FORECAST ================= */

export function renderHourly(
  section,
  container,
  items,
  unit
) {
  container.innerHTML = items
    .map(
      (item) => `
        <article class="hourly-card">
          <p class="hourly-time">
            ${escapeHtml(item.time)}
          </p>

          ${
            item.iconUrl
              ? `
                <img
                  src="${escapeHtml(
                    item.iconUrl
                  )}"
                  alt="${escapeHtml(
                    item.description
                  )}"
                >
              `
              : ""
          }

          <strong>
            ${formatTemperature(
              item.temperature,
              unit
            )}
          </strong>

          <span>
            ${escapeHtml(
              item.description
            )}
          </span>
        </article>
      `
    )
    .join("");

  section.hidden = items.length === 0;
}

/* ================= FIVE-DAY FORECAST ================= */

export function renderForecast(
  section,
  container,
  items,
  unit
) {
  container.innerHTML = items
    .map(
      (item) => `
        <article class="forecast-card">
          <div class="forecast-date">
            <p class="forecast-day">
              ${escapeHtml(item.day)}
            </p>

            <p class="forecast-calendar-date">
              ${escapeHtml(item.date)}
            </p>
          </div>

          ${
            item.iconUrl
              ? `
                <img
                  class="forecast-icon"
                  src="${escapeHtml(
                    item.iconUrl
                  )}"
                  alt="${escapeHtml(
                    item.description
                  )}"
                >
              `
              : ""
          }

          <p class="forecast-description">
            ${escapeHtml(
              item.description
            )}
          </p>

          <p class="forecast-temperatures">
            <strong>
              ${formatTemperature(
                item.maximumTemperature,
                unit
              )}
            </strong>

            <span>
              ${formatTemperature(
                item.minimumTemperature,
                unit
              )}
            </span>
          </p>
        </article>
      `
    )
    .join("");

  section.hidden = items.length === 0;
}

export function clearForecast(...pairs) {
  for (
    let index = 0;
    index < pairs.length;
    index += 2
  ) {
    const section = pairs[index];
    const container = pairs[index + 1];

    if (section && container) {
      container.innerHTML = "";
      section.hidden = true;
    }
  }
}

/* ================= SAVED CITIES ================= */

function renderRecentCityPills(
  listElement,
  cities,
  emptyElement
) {
  listElement.innerHTML = "";
  emptyElement.hidden = cities.length > 0;

  cities.forEach((city) => {
    const item =
      document.createElement("li");

    item.className = "recent-item";

    item.innerHTML = `
      <button
        type="button"
        class="recent-city-button"
        data-action="search"
        data-city="${escapeHtml(city)}"
      >
        ${escapeHtml(city)}
      </button>

      <button
        type="button"
        class="remove-city-button"
        data-action="remove"
        data-city="${escapeHtml(city)}"
        aria-label="Remove ${escapeHtml(city)}"
      >
        ×
      </button>
    `;

    listElement.appendChild(item);
  });
}

function renderFavoriteWeatherCards(
  listElement,
  cities,
  emptyElement
) {
  listElement.innerHTML = "";
  emptyElement.hidden = cities.length > 0;

  cities.forEach((city) => {
    const item =
      document.createElement("li");

    item.className =
      "favorite-weather-card";

    item.innerHTML = `
      <button
        type="button"
        class="favorite-card-button"
        data-action="search"
        data-city="${escapeHtml(city)}"
      >
        <div
          class="favorite-card-icon"
          aria-hidden="true"
        >
          🌤️
        </div>

        <div class="favorite-card-info">
          <strong>
            ${escapeHtml(city)}
          </strong>

          <span>
            Loading...
          </span>
        </div>
      </button>
    `;

    listElement.appendChild(item);
  });
}

export function renderRecentCities({
  listElement,
  emptyElement,
  clearButton,
  cities,
}) {
  if (
    !listElement ||
    !emptyElement ||
    !clearButton
  ) {
    return;
  }

  renderRecentCityPills(
    listElement,
    cities,
    emptyElement
  );

  clearButton.hidden =
    cities.length === 0;
}

export function renderFavoriteCities({
  listElement,
  emptyElement,
  cities,
}) {
  if (
    !listElement ||
    !emptyElement
  ) {
    return;
  }

  renderFavoriteWeatherCards(
    listElement,
    cities,
    emptyElement
  );
}

/* ================= UNIT BUTTONS ================= */

export function updateUnitButtons(
  metricButton,
  imperialButton,
  unit
) {
  metricButton.classList.toggle(
    "active",
    unit === "metric"
  );

  imperialButton.classList.toggle(
    "active",
    unit === "imperial"
  );

  metricButton.setAttribute(
    "aria-pressed",
    String(unit === "metric")
  );

  imperialButton.setAttribute(
    "aria-pressed",
    String(unit === "imperial")
  );
}

/* ================= APP THEME ================= */

export function applyTheme(theme) {
  document.documentElement.dataset.theme =
    theme;

  const button =
    document.getElementById("themeBtn");

  if (button) {
    button.textContent =
      theme === "dark"
        ? "☀️ Light"
        : "🌙 Dark";

    button.setAttribute(
      "aria-label",
      `Switch to ${
        theme === "dark"
          ? "light"
          : "dark"
      } mode`
    );
  }
}

/* ================= WEATHER BACKGROUND ================= */

export function applyWeatherTheme(
  weather
) {
  if (!weather) {
    document.body.dataset.weather =
      "default";

    return;
  }

  const condition = String(
    weather.description ||
      weather.condition ||
      weather.mainCondition ||
      weather.main ||
      ""
  )
    .trim()
    .toLowerCase();

  const iconCode = String(
    weather.icon ||
      weather.iconCode ||
      ""
  )
    .trim()
    .toLowerCase();

  const isNight = weather.isNight;

  let weatherTheme = "clear";

  if (
    condition.includes("thunder") ||
    condition.includes("rain") ||
    condition.includes("drizzle")
  ) {
    weatherTheme = "rain";
  } else if (
    condition.includes("snow")
  ) {
    weatherTheme = "snow";
  } else if (
    condition.includes("cloud") ||
    condition.includes("mist") ||
    condition.includes("fog") ||
    condition.includes("haze") ||
    condition.includes("smoke") ||
    condition.includes("dust") ||
    condition.includes("sand") ||
    condition.includes("ash") ||
    condition.includes("squall") ||
    condition.includes("tornado")
  ) {
    weatherTheme = "clouds";
  } else if (isNight) {
    weatherTheme = "night";
  }

  document.body.dataset.weather =
    weatherTheme;

  console.log(
    "Applied weather background:",
    {
      condition,
      iconCode,
      isNight,
      weatherTheme,
    }
  );
}

/* ================= TODAY'S HIGHLIGHTS ================= */

export function renderHighlights({
  section,
  container,
  weather,
  unit,
}) {
  if (
    !section ||
    !container ||
    !weather
  ) {
    return;
  }

  container.innerHTML = `
    <article class="highlight-card">
      <span
        class="highlight-icon"
        aria-hidden="true"
      >
        🌡️
      </span>

      <p class="highlight-label">
        Feels Like
      </p>

      <strong class="highlight-value">
        ${formatTemperature(
          weather.feelsLike,
          unit
        )}
      </strong>
    </article>

    <article class="highlight-card">
      <span
        class="highlight-icon"
        aria-hidden="true"
      >
        💧
      </span>

      <p class="highlight-label">
        Humidity
      </p>

      <strong class="highlight-value">
        ${Math.round(weather.humidity)}%
      </strong>
    </article>

    <article class="highlight-card">
      <span
        class="highlight-icon"
        aria-hidden="true"
      >
        💨
      </span>

      <p class="highlight-label">
        Wind
      </p>

      <strong class="highlight-value">
        ${formatWind(
          weather.windSpeed,
          unit
        )}
      </strong>
    </article>

    <article class="highlight-card">
      <span
        class="highlight-icon"
        aria-hidden="true"
      >
        🧭
      </span>

      <p class="highlight-label">
        Pressure
      </p>

      <strong class="highlight-value">
        ${Math.round(
          weather.pressure
        )} hPa
      </strong>
    </article>

    <article
      class="highlight-card aqi-highlight aqi-${escapeHtml(
        weather.aqiClass
      )}"
    >
      <span
        class="highlight-icon"
        aria-hidden="true"
      >
        🌿
      </span>

      <p class="highlight-label">
        Air Quality
      </p>

      <strong class="highlight-value">
        ${
          weather.aqi !== null
            ? `${weather.aqi}/5 · ${escapeHtml(
                weather.aqiLabel
              )}`
            : "Unavailable"
        }
      </strong>

      <small class="highlight-meta">
        ${
          weather.pm25 !== null
            ? `PM2.5 ${escapeHtml(
                weather.formattedPm25
              )}`
            : "PM2.5 unavailable"
        }
      </small>
    </article>

    <article class="highlight-card">
      <span
        class="highlight-icon"
        aria-hidden="true"
      >
        ☀️
      </span>

      <p class="highlight-label">
        UV Index
      </p>

      <strong class="highlight-value">
        ${
          weather.uvIndex !== null
            ? `${weather.uvIndex.toFixed(
                1
              )} · ${escapeHtml(
                weather.uvLabel
              )}`
            : "Unavailable"
        }
      </strong>
    </article>

    <article class="highlight-card">
      <span
        class="highlight-icon"
        aria-hidden="true"
      >
        🌅
      </span>

      <p class="highlight-label">
        Sunrise
      </p>

      <strong class="highlight-value">
        ${escapeHtml(
          weather.sunriseTime
        )}
      </strong>
    </article>

    <article class="highlight-card">
      <span
        class="highlight-icon"
        aria-hidden="true"
      >
        🌇
      </span>

      <p class="highlight-label">
        Sunset
      </p>

      <strong class="highlight-value">
        ${escapeHtml(
          weather.sunsetTime
        )}
      </strong>
    </article>
  `;

  section.hidden = false;
}

export function clearHighlights(
  section,
  container
) {
  if (!section || !container) {
    return;
  }

  container.replaceChildren();
  section.hidden = true;
}

function getRecommendationPreferenceKey(item) {
  const title = String(item.title || "")
    .trim()
    .toLowerCase();

  if (title.includes("clothing")) {
    return "clothing";
  }

  if (
    title.includes("umbrella") ||
    title.includes("rain safety") ||
    title.includes("snow")
  ) {
    return "umbrella";
  }

  if (title.includes("uv protection")) {
    return "uv";
  }

  if (title.includes("hydration")) {
    return "hydration";
  }

  if (title.includes("wind")) {
    return "wind";
  }

  if (
    title.includes("outdoor activity") ||
    title.includes("outdoor score")
  ) {
    return "outdoor";
  }

  if (title.includes("air quality")) {
    return "airQuality";
  }

  if (title.includes("pet walk")) {
    return "petWalk";
  }

  return null;
}

export function renderRecommendations(
  section,
  container,
  recommendations,
  preferences = {}
) {
  if (!section || !container) {
    return;
  }

  const visibleRecommendations =
    recommendations.filter((item) => {
      const preferenceKey =
        getRecommendationPreferenceKey(item);

      if (!preferenceKey) {
        return true;
      }

      return preferences[preferenceKey] !== false;
    });

  if (visibleRecommendations.length === 0) {
    container.replaceChildren();
    section.hidden = true;
    return;
  }

  container.innerHTML = visibleRecommendations
    .map(
      (item) => `
        <article class="recommendation-card">
          <div
            class="recommendation-icon"
            aria-hidden="true"
          >
            ${escapeHtml(item.icon)}
          </div>

          <div class="recommendation-content">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.text)}</p>
          </div>
        </article>
      `
    )
    .join("");

  section.hidden = false;
}
export function clearRecommendations(
  section,
  container
) {
  if (!section || !container) return;

  container.innerHTML = "";
  section.hidden = true;
}