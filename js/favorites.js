import {
  fetchWeatherDashboardByCity,
} from "./api.js";

import {
  formatTemperature,
} from "./models.js";

import {
  loadFavoriteCities,
  loadUnit,
} from "./storage.js";

const favoriteList =
  document.querySelector(
    "#favoriteList"
  );

const favoriteEmpty =
  document.querySelector(
    "#favoriteEmpty"
  );

const favorites =
  loadFavoriteCities();

const unit =
  loadUnit();

/* =========================
   Basic formatting
========================= */

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

function formatCityTime(
  timestamp,
  timezoneOffset = 0
) {
  if (!timestamp) {
    return "--";
  }

  const utcMilliseconds =
    timestamp * 1000;

  const localMilliseconds =
    utcMilliseconds +
    timezoneOffset * 1000;

  return new Intl.DateTimeFormat(
    "en-US",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    }
  ).format(
    new Date(localMilliseconds)
  );
}

function formatVisibility(
  visibility
) {
  if (
    !Number.isFinite(
      visibility
    )
  ) {
    return "--";
  }

  const kilometers =
    visibility / 1000;

  return `${Number(
    kilometers.toFixed(1)
  )} km`;
}

function formatPercentage(
  value
) {
  if (
    !Number.isFinite(value)
  ) {
    return "--";
  }

  return `${Math.round(
    value
  )}%`;
}

/* =========================
   Trend helpers
========================= */

function getTrendLabel(
  forecastItems
) {
  const temperatures =
    forecastItems
      .slice(0, 8)
      .map((item) =>
        Number(
          item?.main?.temp
        )
      )
      .filter(
        Number.isFinite
      );

  if (
    temperatures.length <
    2
  ) {
    return "Steady";
  }

  const first =
    temperatures[0];

  const last =
    temperatures[
      temperatures.length - 1
    ];

  const difference =
    last - first;

  if (difference >= 2) {
    return "Rising";
  }

  if (difference <= -2) {
    return "Dropping";
  }

  return "Steady";
}

function getTrendColorClass(
  trendLabel
) {
  if (
    trendLabel ===
    "Rising"
  ) {
    return "text-secondary";
  }

  if (
    trendLabel ===
    "Dropping"
  ) {
    return "text-primary-container";
  }

  return "text-primary";
}

function createCompactTrendSvg(
  forecastItems
) {
  const items =
    forecastItems.slice(0, 8);

  const temperatures =
    items.map((item) =>
      Number(
        item?.main?.temp
      )
    );

  const validTemperatures =
    temperatures.filter(
      Number.isFinite
    );

  if (
    validTemperatures.length <
    2
  ) {
    return `
      <div
        class="flex h-12 items-center justify-center text-xs text-outline"
      >
        Trend unavailable
      </div>
    `;
  }

  const minimum =
    Math.min(
      ...validTemperatures
    );

  const maximum =
    Math.max(
      ...validTemperatures
    );

  const range =
    maximum - minimum || 1;

  const width = 400;
  const height = 48;
  const padding = 4;

  const points =
    temperatures.map(
      (
        temperature,
        index
      ) => {
        const safeTemperature =
          Number.isFinite(
            temperature
          )
            ? temperature
            : minimum;

        const x =
          padding +
          (index /
            Math.max(
              temperatures.length -
                1,
              1
            )) *
            (width -
              padding * 2);

        const y =
          padding +
          ((maximum -
            safeTemperature) /
            range) *
            (height -
              padding * 2);

        return `${x},${y}`;
      }
    );

  return `
    <svg
      viewBox="0 0 ${width} ${height}"
      class="h-12 w-full overflow-visible"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points="${points.join(
          " "
        )}"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  `;
}

/* =========================
   Loading and error cards
========================= */

function createLoadingCard() {
  const card =
    document.createElement(
      "article"
    );

  card.className =
    "crystalline-card rounded-[32px] p-6 md:p-8";

  card.innerHTML = `
    <div
      class="min-h-[290px] animate-pulse"
    >
      <div
        class="flex items-start justify-between"
      >
        <div>
          <div
            class="h-6 w-32 rounded-full bg-surface-container-high"
          ></div>

          <div
            class="mt-3 h-3 w-44 rounded-full bg-surface-container-high"
          ></div>
        </div>

        <div
          class="h-14 w-14 rounded-full bg-surface-container-high"
        ></div>
      </div>

      <div
        class="mt-10 flex items-end justify-between"
      >
        <div
          class="h-16 w-36 rounded-2xl bg-surface-container-high"
        ></div>

        <div
          class="h-12 w-16 rounded-xl bg-surface-container-high"
        ></div>
      </div>

      <div
        class="mt-10 border-t border-outline-variant/10 pt-6"
      >
        <div
          class="h-3 w-20 rounded-full bg-surface-container-high"
        ></div>

        <div
          class="mt-4 h-12 rounded-xl bg-surface-container-high"
        ></div>
      </div>
    </div>
  `;

  favoriteList.appendChild(
    card
  );

  return card;
}

function renderErrorCard(
  card,
  city
) {
  card.className =
    "crystalline-card rounded-[32px] border border-error/20 p-6 md:p-8";

  card.innerHTML = `
    <div
      class="flex min-h-[290px] items-center justify-center text-center"
    >
      <div>
        <span
          class="material-symbols-outlined text-4xl text-error"
        >
          cloud_off
        </span>

        <p
          class="mt-4 text-xs font-extrabold uppercase tracking-[0.18em] text-error"
        >
          Weather Unavailable
        </p>

        <h2
          class="mt-2 text-2xl font-extrabold"
        >
          ${city}
        </h2>

        <p
          class="mt-2 text-sm text-on-surface-variant"
        >
          Weather data for this city could not be loaded.
        </p>
      </div>
    </div>
  `;
}

/* =========================
   Favorite city card
========================= */

function renderFavoriteCard(
  card,
  city,
  data
) {
  const current =
    data.currentWeather;

  const forecastItems =
    data.forecast?.list ?? [];

  const weather =
    current?.weather?.[0] ??
    {};

  const iconCode =
    weather.icon ?? "";

  const description =
    weather.description ??
    "Weather unavailable";

  const temperature =
    current?.main?.temp;

  const high =
    current?.main?.temp_max;

  const low =
    current?.main?.temp_min;

  const countryCode =
    current?.sys?.country ??
    "";

  const timezoneOffset =
    current?.timezone ?? 0;

  const cityTimestamp =
    current?.dt;

  const hourlyItems =
    forecastItems.slice(0, 8);

  const trendLabel =
    getTrendLabel(
      hourlyItems
    );

  const trendColorClass =
    getTrendColorClass(
      trendLabel
    );

  card.className =
    "crystalline-card card-hover group cursor-pointer rounded-[32px] p-6 md:p-8";

  card.addEventListener(
    "click",
    () => {
      window.location.href =
        `/?city=${encodeURIComponent(
          city
        )}`;
    }
  );

  card.innerHTML = `
    <div
      class="flex min-h-[290px] flex-col"
    >
      <div
        class="flex items-start justify-between gap-4"
      >
        <div
          class="min-w-0"
        >
          <h2
            class="truncate text-2xl font-extrabold tracking-[-0.035em] text-on-surface"
          >
            ${
              current?.name ??
              city
            }
          </h2>

          <p
            class="mt-1 truncate text-xs text-outline-variant"
          >
            ${
              countryCode ||
              "Saved City"
            }

            <span
              class="mx-1 text-outline-variant/50"
            >
              •
            </span>

            ${formatCityTime(
              cityTimestamp,
              timezoneOffset
            )}
          </p>
        </div>

        ${
          iconCode
            ? `
              <img
                src="https://openweathermap.org/img/wn/${iconCode}@2x.png"
                alt="${description}"
                class="h-14 w-14 flex-none object-contain"
              />
            `
            : `
              <span
                class="material-symbols-outlined flex-none text-4xl text-primary"
              >
                partly_cloudy_day
              </span>
            `
        }
      </div>

      <div
        class="mt-8 flex items-center justify-between gap-5"
      >
        <div
          class="flex min-w-0 items-end gap-3"
        >
          <strong
            class="flex-none text-[58px] font-extrabold leading-none tracking-[-0.075em] text-on-surface"
          >
            ${
              Number.isFinite(
                temperature
              )
                ? formatTemperature(
                    temperature,
                    unit
                  )
                : "--"
            }
          </strong>

          <p
            class="mb-1 truncate text-sm font-medium text-outline-variant"
          >
            ${capitalizeWords(
              description
            )}
          </p>
        </div>

        <div
          class="flex-none text-right text-sm font-bold"
        >
          <p
            class="text-primary"
          >
            H:
            ${
              Number.isFinite(
                high
              )
                ? formatTemperature(
                    high,
                    unit
                  )
                : "--"
            }
          </p>

          <p
            class="mt-1 text-outline"
          >
            L:
            ${
              Number.isFinite(
                low
              )
                ? formatTemperature(
                    low,
                    unit
                  )
                : "--"
            }
          </p>
        </div>
      </div>

      <div
        class="mt-auto border-t border-outline-variant/10 pt-6"
      >
        <div
          class="mb-3 flex items-center justify-between gap-4"
        >
          <p
            class="text-[9px] font-extrabold uppercase tracking-[0.16em] text-outline"
          >
            24H Trend
          </p>

          <p
            class="text-[10px] font-bold ${trendColorClass}"
          >
            ${trendLabel}
          </p>
        </div>

        <div
          class="${trendColorClass} opacity-75"
        >
          ${createCompactTrendSvg(
            hourlyItems
          )}
        </div>
      </div>
    </div>
  `;
}

/* =========================
   Weekly Overview helpers
========================= */

function getAirQualityInfo(
  data
) {
  const aqi =
    data?.airQuality
      ?.list?.[0]
      ?.main?.aqi;

  const levels = {
    1: {
      label: "Good",
      className:
        "bg-tertiary-fixed text-on-tertiary-fixed",
    },

    2: {
      label: "Fair",
      className:
        "bg-lime-200 text-lime-900",
    },

    3: {
      label: "Moderate",
      className:
        "bg-amber-200 text-amber-900",
    },

    4: {
      label: "Poor",
      className:
        "bg-orange-200 text-orange-900",
    },

    5: {
      label: "Very Poor",
      className:
        "bg-red-200 text-red-900",
    },
  };

  return (
    levels[aqi] ?? {
      label: "Unknown",
      className:
        "bg-surface-container-high text-on-surface-variant",
    }
  );
}

function getHighestRainChance(
  forecastItems
) {
  const rainChances =
    forecastItems
      .slice(0, 16)
      .map((item) => {
        const probability =
          Number(item?.pop);

        if (
          !Number.isFinite(
            probability
          )
        ) {
          return 0;
        }

        return probability *
          100;
      });

  return rainChances.length
    ? Math.max(
        ...rainChances
      )
    : 0;
}

function createOverviewMetric({
  label,
  city,
  value,
  valueClassName =
    "text-primary",
}) {
  return `
    <div
      class="rounded-2xl border border-white/50 bg-white/80 p-5 shadow-sm"
    >
      <p
        class="text-[9px] font-extrabold uppercase tracking-[0.16em] text-outline"
      >
        ${label}
      </p>

      <p
        class="mt-3 truncate text-sm font-semibold text-on-surface"
      >
        ${city}
      </p>

      <p
        class="mt-1 text-lg font-extrabold ${valueClassName}"
      >
        ${value}
      </p>
    </div>
  `;
}

/* =========================
   Weekly Overview
========================= */

function renderWeeklyOverview(
  weatherResults
) {
  const successfulResults =
    weatherResults.filter(
      (result) =>
        result.status ===
        "fulfilled"
    );

  if (
    successfulResults.length ===
    0
  ) {
    return;
  }

  const cityData =
    successfulResults.map(
      (result) =>
        result.value
    );

  const warmest =
    cityData.reduce(
      (best, item) => {
        const temperature =
          item.data
            ?.currentWeather
            ?.main?.temp;

        const bestTemperature =
          best?.data
            ?.currentWeather
            ?.main?.temp;

        if (
          !Number.isFinite(
            temperature
          )
        ) {
          return best;
        }

        if (
          !best ||
          !Number.isFinite(
            bestTemperature
          ) ||
          temperature >
            bestTemperature
        ) {
          return item;
        }

        return best;
      },
      null
    );

  const rainiest =
    cityData.reduce(
      (best, item) => {
        const chance =
          getHighestRainChance(
            item.data
              ?.forecast?.list ??
              []
          );

        if (
          !best ||
          chance > best.chance
        ) {
          return {
            ...item,
            chance,
          };
        }

        return best;
      },
      null
    );

  const bestVisibility =
    cityData.reduce(
      (best, item) => {
        const visibility =
          item.data
            ?.currentWeather
            ?.visibility;

        if (
          !Number.isFinite(
            visibility
          )
        ) {
          return best;
        }

        if (
          !best ||
          visibility >
            best.visibility
        ) {
          return {
            ...item,
            visibility,
          };
        }

        return best;
      },
      null
    );

  const bestAirQuality =
    cityData.reduce(
      (best, item) => {
        const aqi =
          item.data
            ?.airQuality
            ?.list?.[0]
            ?.main?.aqi;

        if (
          !Number.isFinite(aqi)
        ) {
          return best;
        }

        if (
          !best ||
          aqi < best.aqi
        ) {
          return {
            ...item,
            aqi,
          };
        }

        return best;
      },
      null
    );

  const airQuality =
    bestAirQuality
      ? getAirQualityInfo(
          bestAirQuality.data
        )
      : {
          label: "Unknown",
          className:
            "bg-surface-container-high text-on-surface-variant",
        };

  const overview =
    document.createElement(
      "section"
    );

  overview.className =
    "crystalline-card mt-12 rounded-[40px] p-6 md:p-10";

  overview.innerHTML = `
    <div
      class="flex items-center gap-4"
    >
      <div
        class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10"
      >
        <span
          class="material-symbols-outlined text-primary"
        >
          insights
        </span>
      </div>

      <h2
        class="text-xl font-extrabold tracking-[-0.025em] text-on-surface md:text-2xl"
      >
        Weekly Overview
      </h2>
    </div>

    <div
      class="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4"
    >
      ${createOverviewMetric({
        label:
          "Warmest City",

        city:
          warmest?.city ??
          "--",

        value:
          Number.isFinite(
            warmest?.data
              ?.currentWeather
              ?.main?.temp
          )
            ? formatTemperature(
                warmest.data
                  .currentWeather
                  .main.temp,
                unit
              )
            : "--",
      })}

      ${createOverviewMetric({
        label:
          "Upcoming Rain",

        city:
          rainiest?.city ??
          "--",

        value:
          rainiest
            ? formatPercentage(
                rainiest.chance
              )
            : "--",

        valueClassName:
          "text-primary-container",
      })}

      ${createOverviewMetric({
        label:
          "Best Visibility",

        city:
          bestVisibility
            ?.city ??
          "--",

        value:
          bestVisibility
            ? formatVisibility(
                bestVisibility.visibility
              )
            : "--",

        valueClassName:
          "text-secondary",
      })}

      <div
        class="rounded-2xl border border-white/50 bg-white/80 p-5 shadow-sm"
      >
        <p
          class="text-[9px] font-extrabold uppercase tracking-[0.16em] text-outline"
        >
          Air Quality
        </p>

        <p
          class="mt-3 truncate text-sm font-semibold text-on-surface"
        >
          ${
            bestAirQuality
              ?.city ??
            "--"
          }
        </p>

        <div
          class="mt-3"
        >
          <span
            class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[9px] font-extrabold uppercase tracking-wide ${airQuality.className}"
          >
            <span
              class="h-1.5 w-1.5 rounded-full bg-current"
            ></span>

            ${airQuality.label}
          </span>
        </div>
      </div>
    </div>
  `;

  favoriteList.insertAdjacentElement(
    "afterend",
    overview
  );
}

/* =========================
   Initialization
========================= */

async function initializeFavorites() {
  if (
    favorites.length === 0
  ) {
    favoriteEmpty.hidden =
      false;

    favoriteList.hidden =
      true;

    return;
  }

  favoriteEmpty.hidden =
    true;

  favoriteList.hidden =
    false;

  const cardEntries =
    favorites.map(
      (city) => ({
        city,
        card:
          createLoadingCard(),
      })
    );

  const requests =
    cardEntries.map(
      async ({
        city,
        card,
      }) => {
        try {
          const data =
            await fetchWeatherDashboardByCity(
              city
            );

          renderFavoriteCard(
            card,
            city,
            data
          );

          return {
            city,
            data,
          };
        } catch (error) {
          console.error(
            `Unable to load weather for ${city}:`,
            error
          );

          renderErrorCard(
            card,
            city
          );

          throw error;
        }
      }
    );

  const weatherResults =
    await Promise.allSettled(
      requests
    );

  renderWeeklyOverview(
    weatherResults
  );
}

initializeFavorites();