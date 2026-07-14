export const celsiusToFahrenheit = (value) =>
  (value * 9) / 5 + 32;

export const metersPerSecondToMph = (value) =>
  value * 2.23694;

export function formatTemperature(value, unit) {
  const converted =
    unit === "imperial"
      ? celsiusToFahrenheit(value)
      : value;

  return `${Math.round(converted)}°${
    unit === "imperial" ? "F" : "C"
  }`;
}

export function formatWind(value, unit) {
  return unit === "imperial"
    ? `${metersPerSecondToMph(value).toFixed(1)} mph`
    : `${value.toFixed(1)} m/s`;
}

export class WeatherData {
  constructor(apiData, airQuality, uvIndex) {
    if (!apiData?.main || !apiData?.weather?.[0]) {
      throw new Error(
        "The weather service returned incomplete data."
      );
    }

    this.city = apiData.name || "Unknown city";
    this.country = apiData.sys?.country || "";

    this.latitude = apiData.coord?.lat ?? null;
    this.longitude = apiData.coord?.lon ?? null;

    this.temperature = apiData.main.temp;
    this.feelsLike = apiData.main.feels_like;
    this.minimumTemperature = apiData.main.temp_min;
    this.maximumTemperature = apiData.main.temp_max;

    this.humidity = apiData.main.humidity;
    this.pressure = apiData.main.pressure;

    this.windSpeed = apiData.wind?.speed ?? 0;

    this.description =
      apiData.weather[0].description ||
      "Not available";

    this.iconCode =
      apiData.weather[0].icon || "";

    this.timezoneOffsetSeconds =
      apiData.timezone ?? 0;

    this.sunriseTimestamp =
      apiData.sys?.sunrise ?? null;

    this.sunsetTimestamp =
      apiData.sys?.sunset ?? null;

    this.aqi =
      airQuality?.main?.aqi ?? null;

    this.pm25 =
      airQuality?.components?.pm2_5 ?? null;

    this.uvIndex =
      Number.isFinite(uvIndex)
        ? uvIndex
        : null;
  }

  get locationName() {
    return this.country
      ? `${this.city}, ${this.country}`
      : this.city;
  }

  get iconUrl() {
    return this.iconCode
      ? `https://openweathermap.org/img/wn/${this.iconCode}@2x.png`
      : "";
  }

  get aqiLabel() {
    const labels = [
      "Unknown",
      "Good",
      "Fair",
      "Moderate",
      "Poor",
      "Very poor",
    ];

    return labels[this.aqi || 0] || "Unknown";
  }

  get uvLabel() {
    if (this.uvIndex === null) {
      return "Unavailable";
    }

    if (this.uvIndex < 3) {
      return "Low";
    }

    if (this.uvIndex < 6) {
      return "Moderate";
    }

    if (this.uvIndex < 8) {
      return "High";
    }

    if (this.uvIndex < 11) {
      return "Very high";
    }

    return "Extreme";
  }

  get sunriseTime() {
    return this.formatCityTime(
      this.sunriseTimestamp
    );
  }

  get sunsetTime() {
    return this.formatCityTime(
      this.sunsetTimestamp
    );
  }

  get isNight() {
    if (
      !Number.isFinite(this.sunriseTimestamp) ||
      !Number.isFinite(this.sunsetTimestamp)
    ) {
      return this.iconCode.endsWith("n");
    }

    const currentUtcSeconds =
      Math.floor(Date.now() / 1000);

    return (
      currentUtcSeconds < this.sunriseTimestamp ||
      currentUtcSeconds > this.sunsetTimestamp
    );
  }

  formatLocalDateTime() {
    const utcNow =
      Date.now() +
      new Date().getTimezoneOffset() * 60_000;

    const cityDate = new Date(
      utcNow +
        this.timezoneOffsetSeconds * 1000
    );

    return new Intl.DateTimeFormat("en-CA", {
      weekday: "long",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    }).format(cityDate);
  }

  formatCityTime(timestamp) {
    if (!Number.isFinite(timestamp)) {
      return "Unavailable";
    }

    const cityDate = new Date(
      (timestamp +
        this.timezoneOffsetSeconds) *
        1000
    );

    return new Intl.DateTimeFormat("en-CA", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    }).format(cityDate);
  }
}

export function createHourlyForecast(apiData) {
  const offset =
    apiData.city?.timezone ?? 0;

  return (apiData.list || [])
    .slice(0, 8)
    .map((entry) => ({
      timestamp: entry.dt,

      temperature:
        entry.main.temp,

      description:
        entry.weather?.[0]?.description ||
        "Not available",

      iconUrl:
        entry.weather?.[0]?.icon
          ? `https://openweathermap.org/img/wn/${entry.weather[0].icon}@2x.png`
          : "",

      time: new Intl.DateTimeFormat(
        "en-CA",
        {
          hour: "numeric",
          hour12: true,
          timeZone: "UTC",
        }
      ).format(
        new Date(
          (entry.dt + offset) * 1000
        )
      ),
    }));
}

export function createFiveDayForecast(apiData) {
  const offset =
    apiData.city?.timezone ?? 0;

  const today = new Date(
    (Date.now() / 1000 + offset) * 1000
  )
    .toISOString()
    .slice(0, 10);

  const groups = new Map();

  for (const entry of apiData.list || []) {
    const key = new Date(
      (entry.dt + offset) * 1000
    )
      .toISOString()
      .slice(0, 10);

    if (key === today) {
      continue;
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(entry);
  }

  return [...groups.entries()]
    .slice(0, 5)
    .map(([dateKey, entries]) => {
      const representative =
        entries.reduce(
          (best, entry) => {
            const hour = new Date(
              (entry.dt + offset) * 1000
            ).getUTCHours();

            const bestHour = new Date(
              (best.dt + offset) * 1000
            ).getUTCHours();

            return Math.abs(hour - 12) <
              Math.abs(bestHour - 12)
              ? entry
              : best;
          }
        );

      return {
        dateKey,

        minimumTemperature:
          Math.min(
            ...entries.map(
              (entry) =>
                entry.main.temp_min
            )
          ),

        maximumTemperature:
          Math.max(
            ...entries.map(
              (entry) =>
                entry.main.temp_max
            )
          ),

        description:
          representative.weather?.[0]
            ?.description ||
          "Not available",

        iconUrl:
          representative.weather?.[0]
            ?.icon
            ? `https://openweathermap.org/img/wn/${representative.weather[0].icon}@2x.png`
            : "",

        day: new Intl.DateTimeFormat(
          "en-CA",
          {
            weekday: "short",
            timeZone: "UTC",
          }
        ).format(
          new Date(
            `${dateKey}T12:00:00Z`
          )
        ),

        date: new Intl.DateTimeFormat(
          "en-CA",
          {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          }
        ).format(
          new Date(
            `${dateKey}T12:00:00Z`
          )
        ),
      };
    });
}