import {
  formatTemperature,
  formatWind,
} from "./models.js";

/* ================= HELPERS ================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function capitalizeWords(value) {
  return String(value ?? "")
    .split(" ")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

function getAqiWidth(aqi) {
  if (!Number.isFinite(aqi)) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, (aqi / 5) * 100)
  );
}

function getAqiColorClass(aqi) {
  switch (aqi) {
    case 1:
      return "bg-emerald-600";

    case 2:
      return "bg-lime-600";

    case 3:
      return "bg-amber-500";

    case 4:
      return "bg-orange-600";

    case 5:
      return "bg-red-600";

    default:
      return "bg-outline";
  }
}

function getAqiTextClass(aqi) {
  switch (aqi) {
    case 1:
      return "text-emerald-700";

    case 2:
      return "text-lime-700";

    case 3:
      return "text-amber-700";

    case 4:
      return "text-orange-700";

    case 5:
      return "text-red-700";

    default:
      return "text-outline";
  }
}

function getUvTextClass(uvIndex) {
  if (!Number.isFinite(uvIndex)) {
    return "text-outline";
  }

  if (uvIndex < 3) {
    return "text-emerald-700";
  }

  if (uvIndex < 6) {
    return "text-amber-700";
  }

  if (uvIndex < 8) {
    return "text-orange-700";
  }

  return "text-red-700";
}

function getUvAdvice(uvIndex) {
  if (!Number.isFinite(uvIndex)) {
    return "UV information unavailable";
  }

  if (uvIndex < 3) {
    return "Minimal sun protection needed";
  }

  if (uvIndex < 6) {
    return "Sun protection recommended";
  }

  if (uvIndex < 8) {
    return "Use sunscreen and seek shade";
  }

  if (uvIndex < 11) {
    return "Extra sun protection required";
  }

  return "Avoid prolonged sun exposure";
}

function getRecommendationPreferenceKey(
  item
) {
  const title = String(
    item.title || ""
  )
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

/* ================= LOADING ================= */

export function setLoading(
  button,
  isLoading
) {
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
  if (!weatherContainer) {
    return;
  }

  weatherContainer.innerHTML = `
    <div
      class="grid animate-pulse grid-cols-1 gap-6 md:grid-cols-12"
      aria-hidden="true"
    >
      <article
        class="min-h-[380px] rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-8 shadow-card md:col-span-8"
      >
        <div class="flex justify-between gap-6">
          <div class="space-y-3">
            <div
              class="h-3 w-24 rounded bg-surface-container-high"
            ></div>

            <div
              class="h-7 w-44 rounded bg-surface-container-high"
            ></div>

            <div
              class="h-3 w-32 rounded bg-surface-container-high"
            ></div>
          </div>

          <div
            class="h-16 w-16 rounded-full bg-surface-container-high"
          ></div>
        </div>

        <div class="mt-12 space-y-4">
          <div
            class="h-20 w-44 rounded bg-surface-container-high"
          ></div>

          <div
            class="h-5 w-32 rounded bg-surface-container-high"
          ></div>
        </div>

        <div
          class="mt-12 grid grid-cols-2 gap-4 border-t border-outline-variant/20 pt-8 sm:grid-cols-4"
        >
          ${Array.from(
            { length: 4 },
            () => `
              <div class="space-y-2">
                <div
                  class="h-3 w-16 rounded bg-surface-container-high"
                ></div>

                <div
                  class="h-5 w-20 rounded bg-surface-container-high"
                ></div>
              </div>
            `
          ).join("")}
        </div>
      </article>

      <div class="space-y-6 md:col-span-4">
        ${Array.from(
          { length: 2 },
          () => `
            <article
              class="h-[178px] rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-card"
            >
              <div
                class="h-3 w-24 rounded bg-surface-container-high"
              ></div>

              <div
                class="mt-6 h-7 w-28 rounded bg-surface-container-high"
              ></div>

              <div
                class="mt-5 h-2 w-full rounded-full bg-surface-container-high"
              ></div>

              <div
                class="mt-4 h-3 w-24 rounded bg-surface-container-high"
              ></div>
            </article>
          `
        ).join("")}
      </div>
    </div>
  `;

  if (
    hourlySection &&
    hourlyContainer
  ) {
    hourlySection.hidden = false;

    hourlyContainer.innerHTML =
      Array.from(
        { length: 7 },
        () => `
          <article
            class="min-w-[94px] animate-pulse rounded-xl border border-outline-variant/20 bg-surface-container-low p-4"
            aria-hidden="true"
          >
            <div
              class="mx-auto h-3 w-10 rounded bg-surface-container-high"
            ></div>

            <div
              class="mx-auto my-4 h-10 w-10 rounded-full bg-surface-container-high"
            ></div>

            <div
              class="mx-auto h-5 w-12 rounded bg-surface-container-high"
            ></div>
          </article>
        `
      ).join("");
  }

  if (
    forecastSection &&
    forecastContainer
  ) {
    forecastSection.hidden = false;

    forecastContainer.innerHTML =
      Array.from(
        { length: 5 },
        () => `
          <article
            class="animate-pulse rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-card"
            aria-hidden="true"
          >
            <div
              class="h-4 w-20 rounded bg-surface-container-high"
            ></div>

            <div
              class="mx-auto my-5 h-14 w-14 rounded-full bg-surface-container-high"
            ></div>

            <div
              class="mx-auto h-3 w-24 rounded bg-surface-container-high"
            ></div>

            <div
              class="mx-auto mt-5 h-5 w-20 rounded bg-surface-container-high"
            ></div>
          </article>
        `
      ).join("");
  }

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
  weatherContainer?.removeAttribute(
    "aria-busy"
  );
}

/* ================= STATUS ================= */

export function clearStatus(element) {
  if (!element) {
    return;
  }

  element.textContent = "";

  element.className =
    "status text-sm font-medium text-on-surface-variant";
}

export function showError(
  element,
  message
) {
  if (!element) {
    return;
  }

  element.textContent = message;

  element.className =
    "status rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700";
}

export function showSuccess(element) {
  if (!element) {
    return;
  }

  element.textContent = "";
  element.className =
    "status text-sm font-medium text-on-surface-variant";
}

/* ================= CURRENT WEATHER ================= */

export function renderWeather(
  container,
  weather,
  unit,
  isFavorite
) {
  if (!container || !weather) {
    return;
  }

  const aqiWidth =
    getAqiWidth(weather.aqi);

  const aqiColorClass =
    getAqiColorClass(weather.aqi);

  const aqiTextClass =
    getAqiTextClass(weather.aqi);

  const uvTextClass =
    getUvTextClass(weather.uvIndex);

  const condition =
    capitalizeWords(
      weather.description
    );

  const visibilityText =
    Number.isFinite(
      weather.visibility
    )
      ? `${(
          weather.visibility /
          1000
        ).toFixed(1)} km`
      : "Unavailable";

  container.innerHTML = `
    <div
      class="grid grid-cols-1 gap-5 md:grid-cols-12"
    >
      <!-- MAIN CURRENT WEATHER CARD -->
      <article
        class="relative min-h-[320px] overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-card sm:p-7 md:col-span-8"
      >
        <!-- TOP ROW -->
        <div
          class="relative z-10 flex items-start justify-between gap-4"
        >
          <div class="min-w-0">
            <h2
              class="truncate text-base font-extrabold tracking-[-0.02em] text-on-surface"
            >
              ${escapeHtml(
                weather.locationName
              )}
            </h2>

            <p
              class="mt-1 text-xs font-medium text-on-surface-variant"
            >
              ${escapeHtml(
                weather.formatLocalDateTime()
              )}
            </p>
          </div>

          <div
            class="flex items-center gap-3"
          >
            <!-- UNIT DISPLAY -->
            <div
           class="flex overflow-hidden rounded-lg bg-surface-container p-1"
  role="group"
  aria-label="Temperature unit"
>
  <button
    id="weatherMetricBtn"
    type="button"
    class="${
      unit === "metric"
        ? "bg-primary text-white shadow-sm"
        : "text-outline hover:text-on-surface"
    } rounded-md px-3 py-1.5 text-[10px] font-extrabold transition"
    aria-pressed="${
      unit === "metric"
    }"
  >
    °C
  </button>

  <button
    id="weatherImperialBtn"
    type="button"
    class="${
      unit === "imperial"
        ? "bg-primary text-white shadow-sm"
        : "text-outline hover:text-on-surface"
    } rounded-md px-3 py-1.5 text-[10px] font-extrabold transition"
    aria-pressed="${
      unit === "imperial"
    }"
  >
    °F
  </button>
</div>

            <!-- FAVORITE BUTTON -->
           <button
  id="favoriteCurrentBtn"
  class="flex h-7 w-7 items-center justify-center text-on-surface transition-all duration-200 hover:scale-110"
              aria-label="${
                isFavorite
                  ? "Remove from favourites"
                  : "Add to favourites"
              }"
              title="${
                isFavorite
                  ? "Remove from favourites"
                  : "Add to favourites"
              }"
            >
              <span
                class="material-symbols-outlined text-[18px] leading-none"
                style="
                  font-variation-settings:
                    'FILL' ${
                      isFavorite
                        ? 1
                        : 0
                    },
                    'wght' 300,
                    'GRAD' 0,
                    'opsz' 24;
                "
              >
                star
              </span>
            </button>
          </div>
        </div>

        <!-- LARGE WEATHER ICON -->
        <div
          class="pointer-events-none absolute right-5 top-20 flex h-28 w-28 items-center justify-center text-primary/10 sm:right-8"
          role="img"
          aria-label="${escapeHtml(
            weather.description
          )}"
        >
          <span
            class="material-symbols-outlined text-[104px]"
            aria-hidden="true"
            style="
              font-variation-settings:
                'FILL' 0,
                'wght' 300,
                'GRAD' 0,
                'opsz' 48;
            "
          >
            ${escapeHtml(
              weather.iconName
            )}
          </span>
        </div>

        <!-- TEMPERATURE -->
        <div
          class="relative z-10 mt-8"
        >
          <p
            class="text-[72px] font-extrabold leading-none tracking-[-0.07em] text-primary sm:text-[82px]"
          >
            ${formatTemperature(
              weather.temperature,
              unit
            )}
          </p>

          <div
            class="mt-1 flex items-center gap-2"
          >
            <p
              class="text-lg font-extrabold text-on-surface"
            >
              ${escapeHtml(
                condition
              )}
            </p>

            <span
              class="material-symbols-outlined text-[23px] text-yellow-500"
              aria-hidden="true"
              style="
                font-variation-settings:
                  'FILL' 0,
                  'wght' 300,
                  'GRAD' 0,
                  'opsz' 24;
              "
            >
              ${escapeHtml(
                weather.iconName
              )}
            </span>
          </div>
        </div>

        <!-- DETAILS -->
        <dl
          class="relative z-10 mt-10 grid grid-cols-3 gap-4 border-t border-outline-variant/20 pt-6"
        >
          <div>
            <dt
              class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-outline"
            >
              Humidity
            </dt>

            <dd
              class="mt-1 text-sm font-semibold text-on-surface"
            >
              ${Math.round(
                weather.humidity
              )}%
            </dd>
          </div>

          <div>
            <dt
              class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-outline"
            >
              Wind
            </dt>

            <dd
              class="mt-1 text-sm font-semibold text-on-surface"
            >
              ${formatWind(
                weather.windSpeed,
                unit
              )}
            </dd>
          </div>

          <div>
            <dt
              class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-outline"
            >
              Visibility
            </dt>

            <dd
              class="mt-1 text-sm font-semibold text-on-surface"
            >
              ${escapeHtml(
                visibilityText
              )}
            </dd>
          </div>
        </dl>
      </article>

      <!-- RIGHT SIDE CARDS -->
      <div
        class="grid gap-5 sm:grid-cols-2 md:col-span-4 md:grid-cols-1"
      >
        <!-- AIR QUALITY -->
        <article
          class="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-card"
        >
          <div
            class="flex items-center justify-between"
          >
            <p
              class="text-[9px] font-extrabold uppercase tracking-[0.18em] text-outline"
            >
              Air quality
            </p>

            <span
              class="material-symbols-outlined text-[21px] text-emerald-600"
              aria-hidden="true"
            >
              air
            </span>
          </div>

          <h3
            class="mt-4 text-base font-extrabold ${aqiTextClass}"
          >
            ${escapeHtml(
              weather.aqiLabel
            )}
          </h3>

          <div
            class="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-container"
          >
            <div
              class="h-full rounded-full ${aqiColorClass}"
              style="width: ${aqiWidth}%"
            ></div>
          </div>

          <p
            class="mt-3 text-[10px] text-on-surface-variant"
          >
            ${
              weather.aqi !== null
                ? `AQI Index: ${escapeHtml(
                    weather.aqi
                  )} of 5`
                : "AQI unavailable"
            }
          </p>
        </article>

        <!-- UV INDEX -->
        <article
          class="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-card"
        >
          <div
            class="flex items-center justify-between"
          >
            <p
              class="text-[9px] font-extrabold uppercase tracking-[0.18em] text-outline"
            >
              UV index
            </p>

            <span
              class="material-symbols-outlined text-[21px] text-amber-500"
              aria-hidden="true"
            >
              wb_sunny
            </span>
          </div>

          <h3
            class="mt-4 text-base font-extrabold ${uvTextClass}"
          >
            ${escapeHtml(
              weather.uvLabel
            )}
          </h3>

          <p
            class="mt-2 text-sm font-bold text-on-surface"
          >
            ${
              weather.uvIndex !== null
                ? `${weather.uvIndex.toFixed(
                    1
                  )} of 11`
                : "Unavailable"
            }
          </p>

          <p
            class="mt-2 text-[10px] leading-4 text-on-surface-variant"
          >
            ${escapeHtml(
              getUvAdvice(
                weather.uvIndex
              )
            )}
          </p>
        </article>
      </div>
    </div>
  `;
}
/* ================= HOURLY FORECAST ================= */

export function renderHourly(
  section,
  container,
  items,
  unit
) {
  if (!section || !container) {
    return;
  }

  container.innerHTML = items
    .map(
      (item, index) => `
        <article
          class="${
            index === 0
              ? "border-primary bg-primary text-white shadow-lg shadow-primary/20"
              : "border-outline-variant/20 bg-surface-container-lowest text-on-surface shadow-sm"
          } flex min-w-[92px] flex-none flex-col items-center rounded-xl border px-4 py-4 text-center transition duration-200 hover:-translate-y-1 hover:shadow-md"
        >
          <p
            class="${
              index === 0
                ? "text-white/80"
                : "text-outline"
            } text-[9px] font-extrabold uppercase tracking-[0.08em]"
          >
            ${escapeHtml(item.time)}
          </p>

          <div
            class="${
              index === 0
                ? "text-white"
                : "text-on-surface"
            } my-3 flex h-12 w-12 items-center justify-center"
            role="img"
            aria-label="${escapeHtml(
              item.description
            )}"
          >
            <span
              class="material-symbols-outlined text-[34px]"
              aria-hidden="true"
              style="
                font-variation-settings:
                  'FILL' 0,
                  'wght' 300,
                  'GRAD' 0,
                  'opsz' 40;
              "
            >
              ${escapeHtml(
                item.iconName
              )}
            </span>
          </div>

          <strong
            class="block text-base font-extrabold tracking-[-0.02em]"
          >
            ${formatTemperature(
              item.temperature,
              unit
            )}
          </strong>

          <span
            class="${
              index === 0
                ? "text-white/70"
                : "text-on-surface-variant"
            } mt-1 block max-w-[72px] truncate text-[9px] font-medium"
            title="${escapeHtml(
              item.description
            )}"
          >
            ${escapeHtml(
              capitalizeWords(
                item.description
              )
            )}
          </span>
        </article>
      `
    )
    .join("");

  section.hidden =
    items.length === 0;
}

/* ================= FIVE-DAY FORECAST ================= */

export function renderForecast(
  section,
  container,
  items,
  unit
) {
  if (!section || !container) {
    return;
  }

  container.innerHTML = items
    .map(
      (item) => `
        <article
          class="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5 text-center shadow-card transition duration-200 hover:-translate-y-1 hover:border-primary/30"
        >
          <div class="text-left">
            <p
              class="text-sm font-bold text-on-surface"
            >
              ${escapeHtml(item.day)}
            </p>

            <p
              class="mt-1 text-[11px] text-outline"
            >
              ${escapeHtml(item.date)}
            </p>
          </div>

                    <span
            class="material-symbols-outlined mx-auto my-3 block text-[54px] text-primary"
            role="img"
            aria-label="${escapeHtml(
              item.description
            )}"
          >
            ${escapeHtml(
              item.iconName
            )}
          </span>
          <p
            class="truncate text-xs text-on-surface-variant"
            title="${escapeHtml(
              item.description
            )}"
          >
            ${escapeHtml(
              capitalizeWords(
                item.description
              )
            )}
          </p>

          <p
            class="mt-4 flex items-center justify-center gap-2"
          >
            <strong
              class="text-base font-bold text-on-surface"
            >
              ${formatTemperature(
                item.maximumTemperature,
                unit
              )}
            </strong>

            <span
              class="text-sm font-semibold text-outline"
            >
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

  section.hidden =
    items.length === 0;
}

export function clearForecast(...pairs) {
  for (
    let index = 0;
    index < pairs.length;
    index += 2
  ) {
    const section =
      pairs[index];

    const container =
      pairs[index + 1];

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

  emptyElement.hidden =
    cities.length > 0;

  cities.forEach((city) => {
    const item =
      document.createElement("li");

   item.className =
  "recent-item overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md";

   item.innerHTML = `
  <div
    class="flex w-full items-center gap-3 px-4 py-3"
  >
    <!-- WEATHER ICON -->
    <div
      class="recent-card-icon flex h-11 w-11 flex-none items-center justify-center rounded-full bg-primary/5 text-primary"
      aria-hidden="true"
    >
      <span
        class="material-symbols-outlined text-[26px]"
        style="
          font-variation-settings:
            'FILL' 0,
            'wght' 300,
            'GRAD' 0,
            'opsz' 32;
        "
      >
        partly_cloudy_day
      </span>
    </div>

    <!-- CITY INFORMATION -->
    <button
      type="button"
      class="recent-city-button min-w-0 flex-1 text-left"
      data-action="search"
      data-city="${escapeHtml(city)}"
    >
      <strong
        class="block truncate text-sm font-extrabold text-on-surface"
      >
        ${escapeHtml(city)}
      </strong>

      <span
        class="recent-card-info mt-0.5 block truncate text-[11px] font-medium text-on-surface-variant"
      >
        Loading...
      </span>
    </button>

    <!-- FAVORITE STAR -->
    <button
      type="button"
      class="recent-favorite-button flex h-8 w-8 flex-none items-center justify-center rounded-lg text-outline transition hover:scale-110 hover:bg-amber-50 hover:text-amber-500"
      data-action="favorite"
      data-city="${escapeHtml(city)}"
      aria-label="Add ${escapeHtml(city)} to favourites"
      title="Add to favourites"
    >
      <span
        class="material-symbols-outlined text-[18px] leading-none"
        style="
          font-variation-settings:
            'FILL' 0,
            'wght' 300,
            'GRAD' 0,
            'opsz' 20;
        "
      >
        star
      </span>
    </button>

    <!-- REMOVE BUTTON -->
    <button
      type="button"
      class="remove-city-button flex h-8 w-8 flex-none items-center justify-center rounded-lg text-outline transition hover:bg-red-50 hover:text-error"
      data-action="remove"
      data-city="${escapeHtml(city)}"
      aria-label="Remove ${escapeHtml(city)}"
      title="Remove"
    >
      <span
        class="material-symbols-outlined text-[17px]"
      >
        close
      </span>
    </button>
  </div>
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

  emptyElement.hidden =
    cities.length > 0;

  cities.forEach((city) => {
    const item =
      document.createElement("li");

    item.className =
      "favorite-weather-card overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm transition hover:border-primary/30";

    item.innerHTML = `
      <button
        type="button"
        class="favorite-card-button flex w-full items-center gap-4 p-4 text-left transition hover:bg-surface-container-low"
        data-action="search"
        data-city="${escapeHtml(city)}"
      >
        <div
          class="favorite-card-icon flex h-12 w-12 flex-none items-center justify-center rounded-full bg-primary/5 text-2xl"
          aria-hidden="true"
        >
          🌤️
        </div>

        <div
          class="favorite-card-info min-w-0 flex-1"
        >
          <strong
            class="block truncate text-sm font-bold text-on-surface"
          >
            ${escapeHtml(city)}
          </strong>

          <span
            class="mt-1 block truncate text-xs text-on-surface-variant"
          >
            Loading...
          </span>
        </div>

        <span
          class="material-symbols-outlined flex-none text-[19px] text-outline"
        >
          chevron_right
        </span>
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
  if (
    !metricButton ||
    !imperialButton
  ) {
    return;
  }

  const isMetric =
    unit === "metric";

  metricButton.classList.toggle(
    "active",
    isMetric
  );

  imperialButton.classList.toggle(
    "active",
    !isMetric
  );

  metricButton.classList.toggle(
    "bg-primary",
    isMetric
  );

  metricButton.classList.toggle(
    "text-white",
    isMetric
  );

  metricButton.classList.toggle(
    "text-on-surface-variant",
    !isMetric
  );

  imperialButton.classList.toggle(
    "bg-primary",
    !isMetric
  );

  imperialButton.classList.toggle(
    "text-white",
    !isMetric
  );

  imperialButton.classList.toggle(
    "text-on-surface-variant",
    isMetric
  );

  metricButton.setAttribute(
    "aria-pressed",
    String(isMetric)
  );

  imperialButton.setAttribute(
    "aria-pressed",
    String(!isMetric)
  );
}

/* ================= OPTIONAL APP THEME ================= */

export function applyTheme(theme) {
  const isDark =
    theme === "dark";

  document.documentElement.classList.toggle(
    "dark",
    isDark
  );

  document.documentElement.dataset.theme =
    theme;

  const button =
    document.getElementById("themeBtn");

  if (!button) {
    return;
  }

  const icon =
    button.querySelector(
      ".material-symbols-outlined"
    );

  const label =
    button.querySelector(
      "span:last-child"
    );

  if (icon) {
    icon.textContent =
      isDark
        ? "light_mode"
        : "dark_mode";
  }

  if (label) {
    label.textContent =
      isDark
        ? "Light mode"
        : "Dark mode";
  }

  button.setAttribute(
    "aria-label",
    `Switch to ${
      isDark
        ? "light"
        : "dark"
    } mode`
  );
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

  const isNight =
    weather.isNight;

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
}

/* ================= RECOMMENDATIONS ================= */

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
    recommendations.filter(
      (item) => {
        const preferenceKey =
          getRecommendationPreferenceKey(
            item
          );

        if (!preferenceKey) {
          return true;
        }

        return (
          preferences[
            preferenceKey
          ] !== false
        );
      }
    );

  if (
    visibleRecommendations.length ===
    0
  ) {
    container.innerHTML = `
      <div
        class="col-span-full rounded-xl border border-dashed border-outline-variant/50 bg-surface-container-low px-5 py-8 text-center"
      >
        <span
          class="material-symbols-outlined text-3xl text-outline"
        >
          tune
        </span>

        <p
          class="mt-3 text-sm font-bold text-on-surface"
        >
          No categories selected
        </p>

        <p
          class="mt-1 text-xs leading-5 text-on-surface-variant"
        >
          Use Customize to turn recommendation categories back on.
        </p>
      </div>
    `;

    section.hidden = false;

    return;
  }

  container.innerHTML =
    visibleRecommendations
      .map(
        (item) => `
          <article
            class="flex min-h-[92px] items-center gap-3 rounded-xl border border-outline-variant/10 bg-surface-container-low p-4 transition hover:-translate-y-0.5 hover:border-primary/20"
          >
            <div
  class="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary/10 text-primary"
  aria-hidden="true"
>
  <i
    class="${escapeHtml(item.icon)} text-[20px]"
  ></i>
</div>

            <div class="min-w-0">
              <h3
                class="text-[9px] font-extrabold uppercase tracking-[0.14em] text-outline"
              >
                ${escapeHtml(item.title)}
              </h3>

              <p
                class="mt-1 text-xs font-bold leading-5 text-on-surface"
              >
                ${escapeHtml(item.text)}
              </p>
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
  if (!section || !container) {
    return;
  }

  container.innerHTML = "";
  section.hidden = true;
}